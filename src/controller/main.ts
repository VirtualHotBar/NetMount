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
import { t } from "i18next"

async function init(setStartStr: Function) {
    setStartStr(t('init'))

    listenWindow()

    setStartStr(t('read_config'))

    await invoke('read_config_file').then(configData => {
        setNmConfig(configData as NMConfig)
    }).catch(err => {
        console.log(err);
    })

/*     const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");

    darkThemeMq.addListener(e => {
        if (e.matches) {
            document.body.setAttribute('arco-theme', 'dark');
        } else {
            document.body.removeAttribute('arco-theme');
        }
    }); */
    document.body.removeAttribute('arco-theme');
    //rcloneInfo.endpoint.auth.user = randomString(32)
    //rcloneInfo.endpoint.auth.pass = randomString(128)

    await invoke('start_rclone', {
        parameter: ' rcd --rc-addr=:' + rcloneInfo.endpoint.localhost.port.toString()
            + ' --rc-user=' + rcloneInfo.endpoint.auth.user
            + ' --rc-pass=' + rcloneInfo.endpoint.auth.pass
            + ' --rc-allow-origin=* --rc-no-auth'//--rc-no-auth
    })
    rcloneInfo.endpoint.url = 'http://localhost:' + rcloneInfo.endpoint.localhost.port.toString()

    startUpdateCont()
    await reupRcloneVersion()
    await reupStorage()
    await reupMount()

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
    await rclone_api_post(
        '/core/quit',
    )

    await invoke('write_config_file', {
        configData: nmConfig
    });
    await process.exit();
}

export { init, main, exit }