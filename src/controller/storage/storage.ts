import { hooks } from "../../services/hook"
import { rcloneInfo } from "../../services/rclone"
import { FileInfo } from "../../type/rclone/rcloneInfo"
import { ParametersType } from "../../type/rclone/storage/defaults"
import { rclone_api_post } from "../../utils/rclone/request"

//列举存储
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


//删除存储
async function delStorage(name: string) {
    const del = await rclone_api_post(
        '/config/delete', {
        name: name
    })
    console.log(del);
    reupStorage()
}

//获取存储
async function getStorageParams(name: string): Promise<ParametersType> {
    const get = await rclone_api_post(
        '/config/get', {
        name: name
    })
    return get
}

//挂载存储<dev>
async function mountStorage(name: string) {
    const get = await rclone_api_post(
        '/mount/mount', {
        remotePath: name,
    })
    console.log(get);
}

async function getFileList(storageName: string, path: string): Promise<FileInfo[]> {
    if (path.substring(0, 1) == '/') {
        path = path.substring(1, path.length)
    }

    if (path.substring(path.length - 1, path.length) == '/') {
        path = path.substring(0, path.length - 1)
    }

    const fileList = await rclone_api_post(
        '/operations/list', {
        fs: storageName + ':',
        remote: path
    })
    return fileList.list
}

export { reupStorage, delStorage, getStorageParams, getFileList }