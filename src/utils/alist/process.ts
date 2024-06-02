import { invoke } from "@tauri-apps/api/core";
import { Command } from "@tauri-apps/plugin-shell";
import { rcloneInfo } from "../../services/rclone";
import { formatPath, randomString, sleep } from "../utils";
import { alistInfo } from "../../services/alist";
import { homeDir } from "@tauri-apps/api/path";
import { nmConfig, osInfo, roConfig } from "../../services/config";
import { getAlistToken, modifyAlistConfig, setAlistPass } from "./alist";
import { alist_api_ping } from "./request";

const alistDataDir = () => {
    return formatPath(roConfig.env.path.homeDir + '/.netmount/alist/',osInfo.osType==="windows")
}

const addParams = (): string[] => {
    let params: string[] = []
    params.push('--data', alistDataDir())
    return params
}



async function startAlist() {
    alistInfo.endpoint.url='http://localhost:'+(alistInfo.alistConfig.scheme?.http_port||5573)
    await setAlistPass(nmConfig.framework.alist.password)

    alistInfo.endpoint.auth.token = await getAlistToken()
    await modifyAlistConfig()
    let args: string[] = [
        'server',
        ...addParams()
    ];

    alistInfo.process.command =  Command.create('alist', args)

    alistInfo.process.log = ''
    const addLog = (data: string) => {
        alistInfo.process.log += data;
        console.log(data);
    }

    alistInfo.process.command.stdout.on('data', (data:string) => addLog(data))
    alistInfo.process.command.stderr.on('data', (data:string) => addLog(data))

    alistInfo.process.child = await alistInfo.process.command.spawn()

    while (true) {
        await sleep(500)
        if (await alist_api_ping()&&alistInfo.process.log.includes('start HTTP server')) {
            break;
        }
    }
}

async function stopAlist() {
    alistInfo.process.child && await alistInfo.process.child.kill()
}

 async function restartAlist() {
    await stopAlist()
    await startAlist()
}

export { addParams, startAlist, stopAlist, alistDataDir ,restartAlist}
