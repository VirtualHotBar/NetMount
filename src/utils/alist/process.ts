import { invoke } from "@tauri-apps/api/core";
import { Command } from "@tauri-apps/plugin-shell";
import { rcloneInfo } from "../../services/rclone";
import { formatPath, getAvailablePorts, randomString, sleep } from "../utils";
import { openlistInfo } from "../../services/openlist";
import { homeDir } from "@tauri-apps/api/path";
import { nmConfig, osInfo, roConfig } from "../../services/config";
import { getOpenlistToken, modifyOpenlistConfig, setOpenlistPass } from "./openlist";
import { openlist_api_ping } from "./request";

const openlistDataDir = () => {
    return formatPath(roConfig.env.path.homeDir + '/.netmount/openlist/', osInfo.osType === "windows")
}

const addParams = (): string[] => {
    let params: string[] = []
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
    let args: string[] = [
        'server',
        ...addParams()
    ];

    openlistInfo.process.command = Command.create('openlist', args)

    openlistInfo.process.log = ''
    const addLog = (data: string) => {
        openlistInfo.process.log += data;
        console.log(data);
    }

    openlistInfo.process.command.stdout.on('data', (data: string) => addLog(data))
    openlistInfo.process.command.stderr.on('data', (data: string) => addLog(data))

    openlistInfo.process.child = await openlistInfo.process.command.spawn()

    while (true) {
        await sleep(500)
        if (await openlist_api_ping() && openlistInfo.process.log.includes('start HTTP server')) {
            break;
        }
    }
}

async function stopOpenlist() {
    openlistInfo.process.child && await openlistInfo.process.child.kill()
}

async function restartOpenlist() {
    await stopOpenlist()
    await startOpenlist()
}

export { addParams, startOpenlist, stopOpenlist, openlistDataDir, restartOpenlist }
