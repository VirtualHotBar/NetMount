import { getRuntime } from '../runtime/port'

type ReadTailOptions = {
  maxBytes?: number
  allowMissing?: boolean
}

async function readTextFileTail(path: string, opts: ReadTailOptions = {}): Promise<string> {
  return await getRuntime().fs.readTextFileTail(path, opts)
}

export { readTextFileTail }
