import { invoke } from "@tauri-apps/api/core";
import { Child } from "@tauri-apps/plugin-shell";
import { formatPath, getAvailablePorts, sleep } from "../utils";
import { openlistInfo } from "../../services/openlist";
import { nmConfig, osInfo, roConfig } from "../../services/config";
import { getOpenlistToken, modifyOpenlistConfig, setOpenlistPass } from "./openlist";
import { openlist_api_ping } from "./request";

const openlistDataDir = () => {
    return formatPath(roConfig.env.path.homeDir + '/.netmount/openlist/', osInfo.osType === "windows")
}

const addParams = (): string[] => {
const params: string[] = []
    params.push('--data', openlistDataDir())
    return params
}



async function startOpenlist() {
    //设置默认临时(缓存)目录
    openlistInfo.openlistConfig.temp_dir = formatPath(nmConfig.settings.path.cacheDir + '/openlist/', osInfo.osType === "windows")
    
    //自动分配端口
    openlistInfo.openlistConfig.scheme!.http_port != (await getAvailablePorts(2))[1]

    openlistInfo.endpoint.url = 'http://localhost:' + (openlistInfo.openlistConfig.scheme?.http_port || 5573)
    await setOpenlistPass(nmConfig.framework.openlist.password)

    openlistInfo.endpoint.auth.token = await getOpenlistToken()
    await modifyOpenlistConfig()
const args: string[] = [
        'server',
        ...addParams()
    ];

    // 使用 Rust 端启动 sidecar，确保由主进程创建
    const pid = await invoke<number>('spawn_sidecar', { name: 'binaries/openlist', args })
openlistInfo.process.child = { pid } as Child
    openlistInfo.process.log = '' // 初始化日志
    console.log('openlist spawned from Rust, PID:', pid)

for (;;) {
    await sleep(500)
    if (await openlist_api_ping()) {
        break;
    }
}
}

async function stopOpenlist() {
    await invoke('kill_sidecar', { name: 'openlist' })
    openlistInfo.process.child = undefined
}

async function restartOpenlist() {
    await stopOpenlist()
    await startOpenlist()
}

export { addParams, startOpenlist, stopOpenlist, openlistDataDir, restartOpenlist }
