import { getRuntime } from '../../runtime/port'

async function runCmd(cmd: string, args: string[]): Promise<string> {
  try {
    return await getRuntime().spawn.runCmd(cmd, args)
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to execute command: ${cmd} ${args.join(' ')}\n${error.message}`)
    } else {
      throw new Error(`Unknown error occurred while executing command: ${cmd} ${args.join(' ')}`)
    }
  }
}

export { runCmd }
