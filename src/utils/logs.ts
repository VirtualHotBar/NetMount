import { invoke } from '@tauri-apps/api/core'

type ReadTailOptions = {
  maxBytes?: number
  allowMissing?: boolean
}

function looksLikeMissingFileError(e: unknown): boolean {
  const msg = typeof e === 'string' ? e : (e && typeof e === 'object' && 'message' in e ? String((e as any).message) : '')
  if (!msg) return false
  const m = msg.toLowerCase()
  return (
    m.includes('os error 2') ||
    m.includes('no such file') ||
    m.includes('cannot find') ||
    msg.includes('系统找不到指定的文件')
  )
}

async function readTextFileTail(path: string, opts: ReadTailOptions = {}): Promise<string> {
  const maxBytes = opts.maxBytes ?? 256 * 1024
  try {
    return await invoke<string>('read_text_file_tail', { path, max_bytes: maxBytes })
  } catch (e) {
    if (opts.allowMissing ?? true) {
      if (looksLikeMissingFileError(e)) return ''
    }
    throw e
  }
}

export { readTextFileTail }

