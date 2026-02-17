import { openlist_api_ping } from './openlist/request'
import { rclone_api_noop } from './rclone/request'
import { openlistLogFile, rcloneLogFile } from './netmountPaths'
import { readTextFileTail } from './logs'

type SidecarDiagnostics = {
  ready: {
    rclone: boolean
    openlist: boolean
  }
  logTail: {
    rclone: string
    openlist: string
  }
}

async function safeBool(p: Promise<boolean>): Promise<boolean> {
  try {
    return await p
  } catch {
    return false
  }
}

async function safeReadTail(path: string, maxBytes: number = 64 * 1024): Promise<string> {
  try {
    return await readTextFileTail(path, { maxBytes, allowMissing: true })
  } catch {
    return ''
  }
}

async function getSidecarDiagnostics(): Promise<SidecarDiagnostics> {
  const [rcloneReady, openlistReady] = await Promise.all([
    safeBool(rclone_api_noop()),
    safeBool(openlist_api_ping()),
  ])

  const [rcloneTail, openlistTail] = await Promise.all([
    safeReadTail(rcloneLogFile()),
    safeReadTail(openlistLogFile()),
  ])

  return {
    ready: { rclone: rcloneReady, openlist: openlistReady },
    logTail: { rclone: rcloneTail, openlist: openlistTail },
  }
}

export { getSidecarDiagnostics }
