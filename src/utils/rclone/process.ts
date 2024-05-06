import { invoke } from "@tauri-apps/api";
import { Command } from "@tauri-apps/api/shell";
import { rcloneInfo } from "../../services/rclone";
import { rclone_api_post } from "./request";
import { randomString } from "../utils";


async function startRclone() {
    if (rcloneInfo.process.child) {
        await stopRclone()
    }

    if (process.env.NODE_ENV != 'development') {
        rcloneInfo.endpoint.auth.user = randomString(32)
        rcloneInfo.endpoint.auth.pass = randomString(128)
    }


    rcloneInfo.endpoint.url = 'http://localhost:' + rcloneInfo.endpoint.localhost.port.toString()

    let args: string[] = [
        'rcd',
        `--rc-addr=:${rcloneInfo.endpoint.localhost.port.toString()}`,
        `--rc-user=${rcloneInfo.endpoint.auth.user}`,
        `--rc-pass=${rcloneInfo.endpoint.auth.pass}`,
        '--rc-allow-origin=*',
    ];

    if (rcloneInfo.endpoint.auth.user==='') {
        args.push('--rc-no-auth')
    }

    console.log(args);
    rcloneInfo.process.command = new Command('rclone', args)

    rcloneInfo.process.log = ''
    const addLog = (data: string) => {
        rcloneInfo.process.log += data;
        console.log(data);
    }

    rcloneInfo.process.command.stdout.on('data', (data) => addLog(data))
    rcloneInfo.process.command.stderr.on('data', (data) => addLog(data))

    rcloneInfo.process.child = await rcloneInfo.process.command.spawn()
}

async function stopRclone() {
    await rclone_api_post('/core/quit')
    if (rcloneInfo.process.child) {
        await rcloneInfo.process.child.kill()
    }
}

export { startRclone, stopRclone }