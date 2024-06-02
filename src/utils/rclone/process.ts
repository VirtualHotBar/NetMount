import { invoke } from "@tauri-apps/api/core";
import { Command } from "@tauri-apps/plugin-shell";
import { rcloneInfo } from "../../services/rclone";
import { rclone_api_noop, rclone_api_post } from "./request";
import { formatPath, getAvailablePorts, randomString, sleep } from "../utils";
import { alistInfo } from "../../services/alist";
import { delStorage } from "../../controller/storage/storage";
import { nmConfig, osInfo, roConfig } from "../../services/config";

const rcloneDataDir = () => {
    return formatPath(roConfig.env.path.homeDir + '/.netmount/', osInfo.osType === "windows")
}

async function startRclone() {
    if (rcloneInfo.process.child) {
        await stopRclone()
    }

    /*if (process.env.NODE_ENV != 'development') {
            rcloneInfo.endpoint.auth.user = randomString(32)
            rcloneInfo.endpoint.auth.pass = randomString(128)
        } */

    //自动分配端口
    rcloneInfo.endpoint.localhost.port = (await getAvailablePorts(2))[1]

    rcloneInfo.endpoint.url = 'http://localhost:' + rcloneInfo.endpoint.localhost.port.toString()

    let args: string[] = [
        'rcd',
        `--rc-addr=:${rcloneInfo.endpoint.localhost.port.toString()}`,
        /*`--rc-user=${rcloneInfo.endpoint.auth.user}`,
                `--rc-pass=${rcloneInfo.endpoint.auth.pass}`, */
        `--rc-user=${nmConfig.framework.rclone.user}`,
        `--rc-pass=${nmConfig.framework.rclone.password}`,
        '--rc-allow-origin=' + window.location.origin || '*',
<<<<<<< HEAD
        '--config=' +formatPath( rcloneDataDir() + '/rclone.conf', osInfo.osType === "windows"),
=======
        '--config=' + formatPath(rcloneDataDir() + '/rclone.conf', osInfo.osType === 'Windows_NT'),
>>>>>>> upstream/main
    ];

    if (nmConfig.framework.rclone.user === '') {
        args.push('--rc-no-auth')
    }

    rcloneInfo.process.command =  Command.create('rclone', args)

    rcloneInfo.process.log = ''
    const addLog = (data: string) => {
        console.log(data);
        rcloneInfo.process.log += data;
    }

    rcloneInfo.process.command.stdout.on('data', (data:string) => addLog(data))
    rcloneInfo.process.command.stderr.on('data', (data:string) => addLog(data))

    rcloneInfo.process.child = await rcloneInfo.process.command.spawn()

    while (true) {
        await sleep(500)
        if (await rclone_api_noop()/* &&rcloneInfo.process.log.includes('Serving remote control on') */) {
            break;
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

export { startRclone, stopRclone, restartRclone }