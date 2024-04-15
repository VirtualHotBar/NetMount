import { invoke, process } from "@tauri-apps/api"
import { nmConfig, setNmConfig } from "../services/config"
import { rcloneInfo } from "../services/rclone"
import { rclone_api_post } from "../utils/rclone/request"
import { startUpdateCont } from "./stats/continue"
import { reupMount } from "./storage/mount/mount"
import { reupStorage } from "./storage/storage"
import { listenWindow } from "./window"
import { NMConfig } from "../type/config"
import { randomString } from "../utils/utils"
import { t } from "i18next"
import { startRclone, stopRclone } from "../utils/rclone/process"
import { getOsInfo } from "../utils/tauri/osInfo"
import { startTaskScheduler } from "./task/task"
import { autoMount } from "./task/autoMount"

async function init(setStartStr: Function) {
    setStartStr(t('init'))

    listenWindow()

    await getOsInfo()
    
    setStartStr(t('read_config'))

    await invoke('read_config_file').then(configData => {
        setNmConfig(configData as NMConfig)
    }).catch(err => {
        console.log(err);
    })

    await startRclone()
    /*     const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
    
        darkThemeMq.addListener(e => {
            if (e.matches) {
                document.body.setAttribute('arco-theme', 'dark');
            } else {
                document.body.removeAttribute('arco-theme');
            }
        }); */
    document.body.removeAttribute('arco-theme');


    startUpdateCont()
    await reupRcloneVersion()
    await reupStorage()
    await reupMount()

    //自动挂载
    await autoMount()

    //开始任务队列
    await startTaskScheduler()
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
    await stopRclone()
    await invoke('write_config_file', {
        configData: nmConfig
    });
    await process.exit();
}

export { init, main, exit }