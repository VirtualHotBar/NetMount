import { invoke } from "@tauri-apps/api";
import { Command } from "@tauri-apps/api/shell";
import { rcloneInfo } from "../../services/rclone";
import { formatPath, randomString } from "../utils";
import { alistInfo } from "../../services/alist";
import { homeDir } from "@tauri-apps/api/path";
import { osInfo, roConfig } from "../../services/config";
import { getAlistToken, modifyAlistConfig, setAlistPass } from "./alist";

const alistDataDir = () => {
    return formatPath(roConfig.env.path.homeDir + '/.netmount/alist/',osInfo.osType==='Windows_NT')
}

const addParams = (): string[] => {
    let params: string[] = []
    params.push('--data', alistDataDir())
    return params
}

async function startAlist() {
    alistInfo.endpoint.url='http://localhost:'+(alistInfo.alistConfig.scheme?.http_port||5573)
    await setAlistPass(alistInfo.endpoint.auth.password)

    alistInfo.endpoint.auth.token = await getAlistToken()
    await modifyAlistConfig()
    let args: string[] = [
        'server',
        ...addParams()
    ];

    alistInfo.process.command = new Command('alist', args)

    alistInfo.process.log = ''
    const addLog = (data: string) => {
        alistInfo.process.log += data;
        console.log(data);
    }

    alistInfo.process.command.stdout.on('data', (data) => addLog(data))
    alistInfo.process.command.stderr.on('data', (data) => addLog(data))

    alistInfo.process.child = await alistInfo.process.command.spawn()
}

async function stopAlist() {
    alistInfo.process.child && await alistInfo.process.child.kill()
}

export { addParams, startAlist, stopAlist, alistDataDir }
