import { hooks } from "../../services/hook"
import { rcloneInfo } from "../../services/rclone"
import { rclone_api_post } from "../../utils/rclone/request"


async function reupStorage() {
    const dump = await rclone_api_post(
        '/config/dump',
    )
    rcloneInfo.storageList = []
    for (const storageName in dump) {
        rcloneInfo.storageList.push({
            name: storageName,
            type: dump[storageName].type,
        })
    }
    hooks.upStorage()
}



async function delStorage(name: string) {
    const del = await rclone_api_post(
        '/config/delete', {
        name: name
    } )
    console.log(del);
    reupStorage()
}

export { reupStorage,delStorage }