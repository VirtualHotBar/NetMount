import { invoke } from '@tauri-apps/api/core'
import { sleep } from './utils'

type WaitReadyOptions = {
  name: string
  timeoutMs?: number
  intervalMs?: number
  logEveryMs?: number
}

type RunSidecarOnceResult = {
  code: number
  stdout: string
  stderr: string
}

function shortSidecarName(nameOrBinary: string): string {
  return nameOrBinary.includes('/') ? (nameOrBinary.split('/').pop() || nameOrBinary) : nameOrBinary
}

async function spawnSidecar(binary: string, args: string[]): Promise<number> {
  return await invoke<number>('spawn_sidecar', { name: binary, args })
}

async function runSidecarOnce(
  binary: string,
  args: string[],
  opts?: { timeoutMs?: number }
): Promise<RunSidecarOnceResult> {
  return await invoke<RunSidecarOnceResult>('run_sidecar_once', {
    name: binary,
    args,
    timeout_ms: opts?.timeoutMs,
  })
}

async function killSidecar(nameOrBinary: string): Promise<boolean> {
  const name = shortSidecarName(nameOrBinary)
  return (await invoke('kill_sidecar', { name })) as boolean
}

async function waitForReady(check: () => Promise<boolean>, opts: WaitReadyOptions): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 30_000
  const intervalMs = opts.intervalMs ?? 500
  const logEveryMs = opts.logEveryMs ?? 2_500

  const start = Date.now()
  let lastLogAt = 0

  for (;;) {
    if (await check()) return

    const elapsed = Date.now() - start
    if (elapsed >= timeoutMs) {
      throw new Error(`${opts.name} failed to start within ${Math.ceil(timeoutMs / 1000)}s`)
    }

    if (elapsed - lastLogAt >= logEveryMs) {
      lastLogAt = elapsed
      console.log(`Waiting for ${opts.name} to start... (${Math.ceil(elapsed / 100) / 10}s)`)
    }

    await sleep(intervalMs)
  }
}

export { spawnSidecar, runSidecarOnce, killSidecar, waitForReady, shortSidecarName }
