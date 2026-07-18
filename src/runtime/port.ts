// Runtime port seam: lets NetMount's TS business logic run under both Tauri
// (GUI) and node (CLI). All Tauri/Arco couplings are funneled through this
// interface so call sites depend on getRuntime() instead of @tauri-apps/*.

type NotifyLevel = 'info' | 'warn' | 'error'

type RunCommandResult = {
  code: number
  stdout: string
  stderr: string
}

type OsInfo = {
  arch: string
  osType: string
  platform: string
  tempDir: string
  osVersion: string
}

interface SpawnPort {
  // sidecar.ts: spawn_sidecar -> OS pid
  spawnSidecar(binary: string, args: string[], cwd?: string): Promise<number>
  // sidecar.ts: run_sidecar_once -> { code, stdout, stderr }
  runSidecarOnce(
    binary: string,
    args: string[],
    opts?: { timeoutMs?: number; cwd?: string }
  ): Promise<RunCommandResult>
  // sidecar.ts: kill_sidecar -> whether a process was killed
  killSidecar(name: string): Promise<boolean>
  // tauri/cmd.ts: run an allowlisted external program, return stdout (throws on nonzero)
  runCmd(cmd: string, args: string[]): Promise<string>
  // file/index.ts: open a path/url with the OS default handler
  openExternal(target: string): Promise<void>
  // file/index.ts: reveal a path in the OS file manager (optionally select the file)
  showPathInExplorer(path: string, isDir: boolean): Promise<boolean>
}

interface FsPort {
  // file/index.ts / rclone+openlist process.ts: fs_make_dir (mkdir -p)
  makeDir(path: string): Promise<void>
  // file/index.ts: plugin-fs exists
  exists(path: string): Promise<boolean>
  // file/index.ts / tempCleanup.ts: fs_exist_dir
  existDir(path: string): Promise<boolean>
  // logs.ts: read_text_file_tail (last maxBytes; '' on missing when allowMissing)
  readTextFileTail(path: string, opts?: { maxBytes?: number; allowMissing?: boolean }): Promise<string>
  // openlist.ts: read_json_file
  readJsonFile<T = unknown>(path: string): Promise<T>
  // openlist.ts: write_json_file ({ configData, path } named params)
  writeJsonFile(path: string, configData: unknown): Promise<void>
  // file/index.ts: download_file (url -> outPath)
  downloadFile(url: string, outPath: string): Promise<void>
}

interface OsPort {
  // tauri/osInfo.ts: arch/type/platform/version + get_temp_dir
  info(): Promise<OsInfo>
}

interface PathsPort {
  // system/index.ts: get_available_ports
  availablePorts(count: number): Promise<number[]>
  // storage/mount/mount.ts: get_available_drive_letter (Windows)
  availableDriveLetter(): Promise<string>
}

interface ConfigIOPort {
  // ConfigService.ts: get_config
  load<T = unknown>(): Promise<T>
  // ConfigService.ts: update_config ({ data } named param)
  save(data: unknown): Promise<void>
}

interface SystemPort {
  // system/index.ts: toggle_devtools (no-op headless)
  setDevtoolsState(open: boolean): Promise<void>
  // system/index.ts: restart_self
  restartSelf(): Promise<void>
  // file/index.ts: get_winfsp_install_state (Windows)
  getWinFspInstallState(): Promise<boolean>
}

interface Runtime {
  spawn: SpawnPort
  fs: FsPort
  osInfo: OsPort
  paths: PathsPort
  configIO: ConfigIOPort
  system: SystemPort
  notify(level: NotifyLevel, msg: string): void
}

const notImplemented = (name: string): Promise<never> =>
  Promise.reject(new Error(`Runtime not installed: ${name}() called before setRuntime()`))

// Safe default: never throws on import, no-ops where a no-op is harmless,
// rejects where a missing capability must surface. notify writes to stderr.
const defaultRuntime: Runtime = {
  spawn: {
    spawnSidecar: () => notImplemented('spawn.spawnSidecar'),
    runSidecarOnce: () => notImplemented('spawn.runSidecarOnce'),
    killSidecar: () => Promise.resolve(false),
    runCmd: () => notImplemented('spawn.runCmd'),
    openExternal: () => Promise.resolve(),
    showPathInExplorer: () => Promise.resolve(false),
  },
  fs: {
    makeDir: () => Promise.resolve(),
    exists: () => Promise.resolve(false),
    existDir: () => Promise.resolve(false),
    readTextFileTail: () => Promise.resolve(''),
    readJsonFile: () => notImplemented('fs.readJsonFile'),
    writeJsonFile: () => notImplemented('fs.writeJsonFile'),
    downloadFile: () => notImplemented('fs.downloadFile'),
  },
  osInfo: {
    info: () => notImplemented('osInfo.info'),
  },
  paths: {
    availablePorts: () => Promise.resolve([]),
    availableDriveLetter: () => notImplemented('paths.availableDriveLetter'),
  },
  configIO: {
    load: () => Promise.resolve({} as never),
    save: () => Promise.resolve(),
  },
  system: {
    setDevtoolsState: () => Promise.resolve(),
    restartSelf: () => Promise.resolve(),
    getWinFspInstallState: () => Promise.resolve(false),
  },
  notify: (level, msg) => {
    process.stderr.write(`[${level}] ${msg}\n`)
  },
}

let current: Runtime = defaultRuntime

function setRuntime(r: Runtime): void {
  current = r
}

function getRuntime(): Runtime {
  return current
}

export { setRuntime, getRuntime, defaultRuntime }
export type {
  Runtime,
  SpawnPort,
  FsPort,
  OsPort,
  PathsPort,
  ConfigIOPort,
  SystemPort,
  NotifyLevel,
  RunCommandResult,
  OsInfo,
}
