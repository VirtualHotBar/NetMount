import { invoke } from "@tauri-apps/api";
import { Command } from "@tauri-apps/api/shell";
import { rcloneInfo } from "../../services/rclone";
import { rclone_api_post } from "./request";


async function startRclone() {
    if (rcloneInfo.process.child) {
        await stopRclone()
    }

    //rcloneInfo.endpoint.auth.user = randomString(32)
    //rcloneInfo.endpoint.auth.pass = randomString(128)

    rcloneInfo.endpoint.url = 'http://localhost:' + rcloneInfo.endpoint.localhost.port.toString()

    const args = [
        'rcd',
        `--rc-addr=:${rcloneInfo.endpoint.localhost.port.toString()}`,
        `--rc-user=${rcloneInfo.endpoint.auth.user}`,
        `--rc-pass=${rcloneInfo.endpoint.auth.pass}`,
        '--rc-allow-origin=*',
        '--rc-no-auth'
    ];

    rcloneInfo.process.command = new Command('rclone', args)
    
    rcloneInfo.process.log=''
    rcloneInfo.process.command.stdout.on('data', (data) => { rcloneInfo.process.log += data })
    rcloneInfo.process.command.stderr.on('data', (data) => { rcloneInfo.process.log += data })

    rcloneInfo.process.child = await rcloneInfo.process.command.spawn()

}

async function stopRclone() {
    await rclone_api_post('/core/quit')
    if (rcloneInfo.process.child) {
        await rcloneInfo.process.child.kill()
    }
}

export { startRclone, stopRclone }