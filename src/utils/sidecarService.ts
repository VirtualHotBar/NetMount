import { sleep } from './utils'
import { killSidecar, spawnSidecar, waitForReady } from './sidecar'
import { readTextFileTail } from './logs'
import { sidecarLogFile } from './netmountPaths'

type StartAndWaitOptions = {
  binary: string
  name: string
  args: string[]
  readyCheck: () => Promise<boolean>
  timeoutMs?: number
  initialDelayMs?: number
  includeLogTailOnError?: boolean
}

async function startSidecarAndWait(opts: StartAndWaitOptions): Promise<number> {
  const includeLogTailOnError = opts.includeLogTailOnError ?? true
  const logPath = sidecarLogFile(opts.name)
  let pid = 0

  try {
    pid = await spawnSidecar(opts.binary, opts.args)
    if (opts.initialDelayMs && opts.initialDelayMs > 0) {
      await sleep(opts.initialDelayMs)
    }
    await waitForReady(opts.readyCheck, { name: opts.name, timeoutMs: opts.timeoutMs })
    return pid
  } catch (e) {
    // 尝试清理残留进程（可能启动了但未 ready）
    try {
      await killSidecar(opts.binary)
    } catch {
      // ignore
    }

    if (!includeLogTailOnError) throw e

    const tail = await readTextFileTail(logPath, { maxBytes: 64 * 1024, allowMissing: true })
    const baseMsg =
      typeof e === 'string'
        ? e
        : e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : (() => {
              try {
                return JSON.stringify(e)
              } catch {
                return String(e)
              }
            })()

    const suffix = (tail || '').trim()
      ? `\n\n${opts.name} sidecar log tail (${logPath}):\n${tail}`
      : ''
    throw new Error(`${baseMsg}${suffix}`)
  }
}

type StopOptions = {
  binary: string
  name: string
  graceful?: () => Promise<void>
  gracefulTimeoutMs?: number
  afterGraceMs?: number
}

async function stopSidecarGracefully(opts: StopOptions): Promise<void> {
  const gracefulTimeoutMs = opts.gracefulTimeoutMs ?? 1500
  const afterGraceMs = opts.afterGraceMs ?? 200

  if (opts.graceful) {
    try {
      await Promise.race([
        opts.graceful(),
        sleep(gracefulTimeoutMs).then(() => {
          throw new Error('graceful stop timeout')
        }),
      ])
    } catch {
      // ignore graceful errors; we'll hard-kill below
    }
  }

  if (afterGraceMs > 0) {
    await sleep(afterGraceMs)
  }

  try {
    await killSidecar(opts.binary)
  } catch {
    // ignore
  }
}

async function restartSidecar(
  stop: () => Promise<void>,
  start: () => Promise<void>
): Promise<void> {
  await stop()
  await start()
}

export { startSidecarAndWait, stopSidecarGracefully, restartSidecar }
