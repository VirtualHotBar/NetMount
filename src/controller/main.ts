import { rcloneInfo } from "../services/rclone"
import { rclone_api_post } from "../utils/rclone/request"
import { startUpdateCont } from "./stats/continue"
import { reupMount } from "./storage/mount/mount"
import { reupStorage } from "./storage/storage"
import { listenWindow } from "./window"

async function init(setStartStr: Function) {
    setStartStr('ddd')
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

export { init, main }