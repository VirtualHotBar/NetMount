import { invoke, process } from "@tauri-apps/api"
import { nmConfig, setNmConfig } from "../services/config"
import { rcloneInfo } from "../services/rclone"
import { rclone_api_post } from "../utils/rclone/request"
import { startUpdateCont } from "./stats/continue"
import { reupMount } from "./storage/mount/mount"
import { reupStorage } from "./storage/storage"
import { listenWindow } from "./window"
import { NMConfig } from "../type/config"
import { randomString } from "../utils/rclone/utils"

async function init(setStartStr: Function) {
    setStartStr('ddd')

    await invoke('read_config_file').then(configData => {
        setNmConfig(configData as NMConfig)
    }).catch(err => {
        console.log(err);
    })

    rcloneInfo.auth.user = randomString(32)
    rcloneInfo.auth.pass = randomString(128)

    await invoke('start_rclone', {
        parameter: ' rcd --rc-addr=:' + rcloneInfo.auth.port.toString() + ' --rc-user=' + rcloneInfo.auth.user + ' --rc-pass=' + rcloneInfo.auth.pass + ' --rc-allow-origin=*'
    })


    startUpdateCont()
    await reupRcloneVersion()
    await reupStorage()
    await reupMount()
    listenWindow()
}

async function reupRcloneVersion() {
    const ver = await rclone_api_post(
        '/core/version',
    )
    rcloneInfo.version = ver
    console.log(rcloneInfo.version);
}

function main() {

}

async function exit() {
    await invoke('write_config_file', {
        configData: nmConfig
    });
    await process.exit();
}

export { init, main, exit }