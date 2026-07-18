// Tauri (GUI) Runtime: wraps the current @tauri-apps usage so it stays
// behaviorally identical to the pre-seam code.
import { invoke } from '@tauri-apps/api/core'
import * as fs from '@tauri-apps/plugin-fs'
import * as shell from '@tauri-apps/plugin-shell'
import * as os from '@tauri-apps/plugin-os'
import { Command } from '@tauri-apps/plugin-shell'
import { Message } from '@arco-design/web-react'
import type { Runtime } from './port'

function looksLikeMissingFileError(e: unknown): boolean {
  const msg =
    typeof e === 'string'
      ? e
      : e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: unknown }).message)
        : ''
  if (!msg) return false
  const m = msg.toLowerCase()
  return (
    m.includes('os error 2') ||
    m.includes('no such file') ||
    m.includes('cannot find') ||
    msg.includes('系统找不到指定的文件')
  )
}

const tauriRuntime: Runtime = {
  spawn: {
    spawnSidecar: (binary, args, cwd) =>
      invoke<number>('spawn_sidecar', { name: binary, args, cwd }),
    runSidecarOnce: (binary, args, opts) =>
      invoke<{ code: number; stdout: string; stderr: string }>('run_sidecar_once', {
        name: binary,
        args,
        timeout_ms: opts?.timeoutMs,
        cwd: opts?.cwd,
      }),
    killSidecar: async name => (await invoke('kill_sidecar', { name })) as boolean,
    runCmd: async (cmd, args) => {
      const result = await Command.create(cmd, args).execute()
      if (result.code === 0) {
        return result.stdout
      }
      throw new Error(
        `Command failed with exit code ${result.code}: ${cmd} ${args.join(' ')}\nError: ${result.stderr}`
      )
    },
    openExternal: target => shell.open(target),
    showPathInExplorer: async (path, isDir) => {
      try {
        if (isDir) {
          await Command.create('explorer', [path]).execute()
        } else {
          await Command.create('explorer', ['/select,', path]).execute()
        }
        return true
      } catch {
        return false
      }
    },
  },
  fs: {
    makeDir: async path => {
      await invoke('fs_make_dir', { path })
    },
    exists: path => fs.exists(path),
    existDir: async path => (await invoke<boolean>('fs_exist_dir', { path })) as boolean,
    readTextFileTail: async (path, opts) => {
      const maxBytes = opts?.maxBytes ?? 256 * 1024
      try {
        return await invoke<string>('read_text_file_tail', { path, max_bytes: maxBytes })
      } catch (e) {
        if ((opts?.allowMissing ?? true) && looksLikeMissingFileError(e)) return ''
        throw e
      }
    },
    readJsonFile: <T = unknown>(path: string) => invoke<T>('read_json_file', { path }),
    writeJsonFile: async (path, configData) => {
      await invoke('write_json_file', { configData, path })
    },
    downloadFile: async (url, outPath) => {
      await invoke('download_file', { url, outPath })
    },
  },
  osInfo: {
    info: async () => ({
      arch: await os.arch(),
      osType: await os.type(),
      platform: await os.platform(),
      tempDir: await invoke<string>('get_temp_dir'),
      osVersion: await os.version(),
    }),
  },
  paths: {
    availablePorts: async count => (await invoke('get_available_ports', { count })) as number[],
    availableDriveLetter: async () => (await invoke('get_available_drive_letter')) as string,
  },
  configIO: {
    load: <T = unknown>() => invoke<T>('get_config'),
    save: async data => {
      await invoke('update_config', { data })
    },
  },
  system: {
    setDevtoolsState: async open => {
      await invoke('toggle_devtools', { preferred_open: open })
    },
    restartSelf: async () => {
      await invoke('restart_self')
    },
    getWinFspInstallState: async () => (await invoke('get_winfsp_install_state')) as boolean,
  },
  notify: (level, msg) => {
    if (level === 'error') Message.error(msg)
    else if (level === 'warn') Message.warning(msg)
    else Message.info(msg)
  },
}

export { tauriRuntime }
