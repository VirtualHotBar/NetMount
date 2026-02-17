import { invoke } from "@tauri-apps/api/core";
import { Child } from "@tauri-apps/plugin-shell";
import { rcloneInfo } from "../../services/rclone";
import { rclone_api_noop, rclone_api_post } from "./request";
import { formatPath, getAvailablePorts, sleep } from "../utils";
import { openlistInfo } from "../../services/openlist";
import { delStorage } from "../../controller/storage/storage";
import { nmConfig, osInfo, roConfig } from "../../services/config";

const rcloneDataDir = () => {
    return formatPath(roConfig.env.path.homeDir + '/.netmount/', osInfo.osType === "windows")
}

async function startRclone() {
    if (rcloneInfo.process.child) {
        await stopRclone()
    }

    //设置缓存目录
    rcloneInfo.localArgs.path.tempDir = formatPath(nmConfig.settings.path.cacheDir + '/rclone/', osInfo.osType === "windows")

    //自动分配端口
    rcloneInfo.endpoint.localhost.port = (await getAvailablePorts(2))[1]

    rcloneInfo.endpoint.url = 'http://127.0.0.1:' + rcloneInfo.endpoint.localhost.port.toString()

    const args: string[] = [
        'rcd',
        `--rc-addr=:${rcloneInfo.endpoint.localhost.port.toString()}`,
        `--rc-user=${nmConfig.framework.rclone.user}`,
        `--rc-pass=${nmConfig.framework.rclone.password}`,
        '--rc-allow-origin=' + window.location.origin || '*',
        '--config=' + formatPath(rcloneDataDir() + '/rclone.conf', osInfo.osType === "windows"),
        '--cache-dir=' + rcloneInfo.localArgs.path.tempDir
    ];

    if (nmConfig.framework.rclone.user === '') {
        args.push('--rc-no-auth')
    }

    // 使用 Rust 端启动 sidecar，确保由主进程创建
    const pid = await invoke<number>('spawn_sidecar', { name: 'binaries/rclone', args })
    rcloneInfo.process.child = { pid } as Child
    console.log('rclone spawned from Rust, PID:', pid)

    await sleep(1000) // 等待rclone服务完全启动

for (;;) {
    await sleep(500)
    if (await rclone_api_noop()) {
        break;
    }
}
}

async function stopRclone() {
    await delStorage(openlistInfo.markInRclone)
    await rclone_api_post('/core/quit')
    await invoke('kill_sidecar', { name: 'rclone' })
    rcloneInfo.process.child = undefined
}

async function restartRclone() {
    await stopRclone();
    await startRclone();
}

export { startRclone, stopRclone, restartRclone }
