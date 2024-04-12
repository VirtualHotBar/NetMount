import { Command } from "@tauri-apps/api/shell"

function runCmd(cmd: string, args: string[]): Promise<string> {
    return new Promise( (resolve, reject) => {
        const command = new Command(cmd, args)

        let output = ""

        command.stdout.on('data', (data: string) => {
            output += data.toString()

        })

        command.on("error", (err: Error) => {
            reject(err)
        })

        command.on('close', () => {

            resolve(output)
        })

        command.spawn()
    })
}

export { runCmd }