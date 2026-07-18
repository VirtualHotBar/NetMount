// Node (CLI) Runtime: headless impl using node:child_process / node:fs /
// node:os / node:net + native fetch. notify -> process.stderr.
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, access, stat, readFile, writeFile, open as openFile } from 'node:fs/promises'
import { existsSync, createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createServer } from 'node:net'
import * as nodeOs from 'node:os'
import { join } from 'node:path'
import type { Runtime, OsInfo } from './port'

const execFileAsync = promisify(execFile)

const exeSuffix = process.platform === 'win32' ? '.exe' : ''

// 'binaries/rclone' style names are Tauri resource-relative; resolve to a real
// path next to the running process plus the platform exe suffix. The CLI can
// override the openlist/rclone binary location via env so it can point at real
// downloaded binaries instead of the Tauri-bundled ones.
function resolveBinary(nameOrBinary: string): string {
  const short = nameOrBinary.includes('/') ? nameOrBinary.split('/').pop() : nameOrBinary
  if (short === 'openlist' && process.env.NETMOUNT_OPENLIST_BIN) {
    return process.env.NETMOUNT_OPENLIST_BIN
  }
  if (short === 'rclone' && process.env.NETMOUNT_RCLONE_BIN) {
    return process.env.NETMOUNT_RCLONE_BIN
  }
  const base = nameOrBinary.startsWith('binaries/')
    ? join(process.cwd(), nameOrBinary)
    : nameOrBinary
  return base.endsWith(exeSuffix) ? base : base + exeSuffix
}

function shortName(nameOrBinary: string): string {
  return nameOrBinary.includes('/') ? nameOrBinary.split('/').pop() || nameOrBinary : nameOrBinary
}

const children = new Map<string, { pid: number; kill(): boolean }>()

const ARCH_MAP: Record<string, string> = { x64: 'x86_64', arm64: 'aarch64' }
const PLATFORM_MAP: Record<string, string> = { win32: 'windows', darwin: 'macos', linux: 'linux' }

function isMissingFile(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { code?: string }).code === 'ENOENT'
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.on('error', reject)
    srv.listen(0, () => {
      const addr = srv.address()
      const port = addr && typeof addr === 'object' ? addr.port : 0
      srv.close(() => resolve(port))
    })
  })
}

const nodeRuntime: Runtime = {
  spawn: {
    spawnSidecar: async (binary, args, cwd) => {
      // Sidecars (rclone rcd / openlist) are long-lived servers the CLI reuses
      // across invocations. detached + stdio:'ignore' + unref() (same recipe as
      // the rcd spawn in cli/daemon.ts) so the sidecar outlives this short-lived
      // CLI process AND never keeps it alive: without this the child's inherited
      // stdio pipe pins the event loop and `bun cli/main.ts ...` hangs on exit
      // waiting for the never-exiting server (deadly under spawnSync), and a
      // non-detached child gets torn down on parent exit so the next invocation
      // can't reuse it via the recorded daemon state.
      const child = spawn(resolveBinary(binary), args, { cwd, detached: true, stdio: 'ignore' })
      children.set(shortName(binary), child as { pid: number; kill(): boolean })
      child.on('error', () => {}) // surfaced via the readyCheck timeout instead
      child.unref()
      return child.pid ?? 0
    },
    runSidecarOnce: (binary, args, opts) =>
      new Promise(resolve => {
        const child = spawn(resolveBinary(binary), args, { cwd: opts?.cwd })
        let stdout = ''
        let stderr = ''
        let timer: ReturnType<typeof setTimeout> | undefined
        if (opts?.timeoutMs) {
          timer = setTimeout(() => child.kill(), opts.timeoutMs)
        }
        child.stdout?.on('data', d => (stdout += d.toString()))
        child.stderr?.on('data', d => (stderr += d.toString()))
        child.on('close', code => {
          if (timer) clearTimeout(timer)
          resolve({ code: code ?? -1, stdout, stderr })
        })
      }),
    killSidecar: async nameOrBinary => {
      const name = shortName(nameOrBinary)
      const child = children.get(name)
      if (!child) return false
      const killed = child.kill()
      children.delete(name)
      return killed
    },
    runCmd: async (cmd, args) => {
      const { stdout } = await execFileAsync(cmd, args, { encoding: 'utf8' })
      return stdout
    },
    openExternal: async target => {
      const opener =
        process.platform === 'win32'
          ? { cmd: 'cmd', args: ['/c', 'start', '', target] }
          : process.platform === 'darwin'
            ? { cmd: 'open', args: [target] }
            : { cmd: 'xdg-open', args: [target] }
      await execFileAsync(opener.cmd, opener.args)
    },
    showPathInExplorer: async (path, isDir) => {
      try {
        if (process.platform === 'win32') {
          await execFileAsync('explorer', isDir ? [path] : ['/select,', path])
        } else {
          await execFileAsync(process.platform === 'darwin' ? 'open' : 'xdg-open', [path])
        }
        return true
      } catch {
        return false
      }
    },
  },
  fs: {
    makeDir: async path => {
      await mkdir(path, { recursive: true })
    },
    exists: path =>
      access(path)
        .then(() => true)
        .catch(() => false),
    existDir: path =>
      stat(path)
        .then(s => s.isDirectory())
        .catch(() => false),
    readTextFileTail: async (path, opts) => {
      const maxBytes = opts?.maxBytes ?? 256 * 1024
      try {
        const { size } = await stat(path)
        const start = Math.max(0, size - maxBytes)
        const len = Math.min(size, maxBytes)
        const fh = await openFile(path, 'r')
        try {
          const buf = Buffer.alloc(len)
          await fh.read(buf, 0, len, start)
          return buf.toString('utf8')
        } finally {
          await fh.close()
        }
      } catch (e) {
        if ((opts?.allowMissing ?? true) && isMissingFile(e)) return ''
        throw e
      }
    },
    readJsonFile: async <T = unknown>(path: string) =>
      JSON.parse(await readFile(path, 'utf8')) as T,
    writeJsonFile: async (path, configData) => {
      await writeFile(path, JSON.stringify(configData, null, 2))
    },
    downloadFile: async (url, outPath) => {
      const res = await fetch(url)
      if (!res.ok || !res.body) {
        throw new Error(`Download failed: HTTP ${res.status} ${url}`)
      }
      await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(outPath))
    },
  },
  osInfo: {
    info: async (): Promise<OsInfo> => ({
      arch: ARCH_MAP[nodeOs.arch()] ?? nodeOs.arch(),
      osType: nodeOs.type(),
      platform: PLATFORM_MAP[process.platform] ?? process.platform,
      tempDir: nodeOs.tmpdir(),
      osVersion: nodeOs.release(),
    }),
  },
  paths: {
    availablePorts: async count => {
      const ports: number[] = []
      const seen = new Set<number>()
      while (ports.length < count) {
        const p = await freePort()
        if (!seen.has(p)) {
          seen.add(p)
          ports.push(p)
        }
      }
      return ports
    },
    availableDriveLetter: async () => {
      if (process.platform !== 'win32') {
        throw new Error('availableDriveLetter is Windows-only')
      }
      const { stdout } = await execFileAsync('wmic', ['logicaldrive', 'get', 'name'])
      const used = new Set(stdout.match(/[A-Z]:/g) ?? [])
      for (let c = 'Z'.charCodeAt(0); c >= 'A'.charCodeAt(0); c--) {
        const letter = `${String.fromCharCode(c)}:`
        if (!used.has(letter)) return letter
      }
      throw new Error('No free drive letter available')
    },
  },
  configIO: {
    load: async <T = unknown>() => {
      const configPath = join(nodeOs.homedir(), '.netmount', 'config.json')
      try {
        return JSON.parse(await readFile(configPath, 'utf8')) as T
      } catch (e) {
        if (isMissingFile(e)) return {} as T
        throw e
      }
    },
    save: async data => {
      const dir = join(nodeOs.homedir(), '.netmount')
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'config.json'), JSON.stringify(data, null, 2))
    },
  },
  system: {
    setDevtoolsState: async () => {
      // no-op: devtools is a webview/GUI concept
    },
    restartSelf: async () => {
      spawn(process.argv[0]!, process.argv.slice(1), { detached: true, stdio: 'inherit' }).unref()
      process.exit(0)
    },
    getWinFspInstallState: async () => {
      if (process.platform !== 'win32') return false
      return existsSync('C:/Program Files (x86)/WinFsp')
    },
  },
  notify: (level, msg) => {
    process.stderr.write(`[${level}] ${msg}\n`)
  },
}

export { nodeRuntime }
