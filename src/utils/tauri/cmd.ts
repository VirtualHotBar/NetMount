import { Command } from '@tauri-apps/plugin-shell';

async function runCmd(cmd: string, args: string[], isSidecar: boolean = false): Promise<string> {
    // Create a new Command instance with the provided command and arguments.
    const commandInstance = isSidecar 
        ? Command.sidecar(cmd, args) 
        : Command.create(cmd, args);
    let resultStr = '';
    try {
        // Execute the command and wait for its completion.
        const result = await commandInstance.execute();
        if (result.stdout) {
            resultStr += result.stdout.toString();
        }
        if (result.stderr) {
            resultStr += result.stderr.toString();
        }

        //console.log(result);
        //console.log(resultStr);

        // Ensure the command execution was successful.
        /* if (result.code === 0) { */
        // Return the command's output as a string.
        return resultStr;
        /* } else {
            throw new Error(`Command failed with exit code ${result.code}: ${cmd} ${args.join(' ')}\nError: ${result.stderr}`);
        } */
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`Failed to execute command: ${cmd} ${args.join(' ')}\n${error.message}`);
        } else {
            throw new Error(`Unknown error occurred while executing command: ${cmd} ${args.join(' ')}`);
        }
    }

}

export default runCmd;

export { runCmd }