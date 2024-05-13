import { invoke } from "@tauri-apps/api";
import { Command } from "@tauri-apps/api/shell";
import { rcloneInfo } from "../../services/rclone";
import { rclone_api_noop, rclone_api_post } from "./request";
import { formatPath, randomString } from "../utils";
import { alistInfo } from "../../services/alist";
import { delStorage } from "../../controller/storage/storage";
import { osInfo, roConfig } from "../../services/config";

const rcloneDataDir = () => {
    return formatPath(roConfig.env.path.homeDir + '/.netmount/',osInfo.osType==='Windows_NT')
}

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
        '--rc-allow-origin='+window.location.origin||'*',
        '--config='+rcloneDataDir()+'/rclone.conf',
    ];

    if (rcloneInfo.endpoint.auth.user === '') {
        args.push('--rc-no-auth')
    }

    rcloneInfo.process.command = new Command('rclone', args)

    rcloneInfo.process.log = ''
    const addLog = (data: string) => {
        rcloneInfo.process.log += data;
    }

    rcloneInfo.process.command.stdout.on('data', (data) => addLog(data))
    rcloneInfo.process.command.stderr.on('data', (data) => addLog(data))

    rcloneInfo.process.child = await rcloneInfo.process.command.spawn()

    while (true) {
        await setTimeout(() => { }, 1000);
        if (await rclone_api_noop().catch(() => { })) {
            return;
        }
    }

}

async function stopRclone() {
    await delStorage(alistInfo.markInRclone)
    await rclone_api_post('/core/quit')
    if (rcloneInfo.process.child) {
        await rcloneInfo.process.child.kill()
    }
}

async function restartRclone() {
    await stopRclone();
    await startRclone();
}

export { startRclone, stopRclone,restartRclone }