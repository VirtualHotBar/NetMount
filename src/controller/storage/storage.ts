import { invoke } from "@tauri-apps/api"
import { hooks } from "../../services/hook"
import { rcloneInfo } from "../../services/rclone"
import { FileInfo, StorageList, StorageSpace } from "../../type/rclone/rcloneInfo"
import { ParametersType } from "../../type/defaults"
import { rclone_api_post, rcloneApiHeaders } from "../../utils/rclone/request"
import { alist_api_get, alist_api_post } from "../../utils/alist/request"
import { formatPath } from "../../utils/utils"
import { alistInfo } from "../../services/alist"
import { RequestOptions } from "@arco-design/web-react/es/Upload"

//列举存储信息
async function reupStorage() {
    //rclone
    const dump = await rclone_api_post(
        '/config/dump',
    )
    rcloneInfo.storageList = []
    for (const storageName in dump) {
        rcloneInfo.storageList.push({
            framework: 'rclone',
            name: storageName,
            type: dump[storageName].type,
            space: await getStorageSpace(storageName),
            hide: storageName.includes(alistInfo.markInRclone)
        })
    }

    //alist
    const list = (await alist_api_get('/api/admin/storage/list')).data.content as any[]
    for (const storage of list) {
        rcloneInfo.storageList.push({
            framework: 'alist',
            name: storage.mount_path.substring(1),
            type: storage.driver,
            other: {
                alist: {
                    id: storage.id,
                    driverPath: storage.mount_path
                }
            }
        })
    }
    hooks.upStorage()
}

function filterHideStorage(storageList: StorageList[]) {//过滤隐藏的存储
    let data: any[] = []
    for (let item of storageList) {
        if (!item.hide)
            data.push(item)
    }
    return data
}

//仅rclone
async function getStorageSpace(name: string): Promise<StorageSpace> {

    const back = await rclone_api_post(
        '/operations/about', {
        fs: name + ':'
    }, true)
    if (back && back.total > 0) {
        return { total: Number(back.total), free: Number(back.free), used: Number(back.used) }
    } else {
        return { total: -1, free: -1, used: -1 }
    }
}

//删除存储
async function delStorage(name: string) {
    const storage = searchStorage(name)

    switch (storage?.framework) {
        case 'rclone':
            await rclone_api_post(
                '/config/delete', {
                name: storage.name
            })
            reupStorage()
            break;
        case 'alist':
            await alist_api_post('/api/admin/storage/delete', { id: storage.other?.alist?.id })
            break;
    }
}

//获取存储
async function getStorageParams(name: string): Promise<ParametersType> {
    const storage = searchStorage(name)
    switch (storage?.framework) {
        case 'rclone':
            return await rclone_api_post(
                '/config/get', {
                name: storage?.name
            })
        case 'alist':
            let params = (await alist_api_get(
                '/api/admin/storage/get', {
                id: storage?.other?.alist?.id
            })).data;
            params.addition = JSON.parse(params.addition);
            return params
    }
    return {}
}

//转换存储路径
const convertStoragePath = (storageName: string, path?: string, isDir?: boolean, noStorageName: boolean = false, onlyStorageName: boolean = false) => {
    if (path === '/') { path = '' }
    const storage = searchStorage(storageName)
    console.log(storage);

    switch (storage?.framework) {
        case 'rclone':
            return (noStorageName ? '' : storageName + ':') + (onlyStorageName ? '' : (path ? formatPathRclone(path, isDir) : ''))
        case 'alist':
            return (noStorageName ? '' : alistInfo.markInRclone + ':') + (onlyStorageName ? '' : (path ? formatPathRclone(storageName + '/' + path, isDir) : storageName))
    }
}


function searchStorage(keyword: string) {
    for (const storage of rcloneInfo.storageList) {
        if (storage.name === keyword || (storage.framework === 'alist' && storage.other?.alist?.driverPath === keyword)) {
            return storage;
        }
    }
}

function getFileName(path: string): string {
    const pathArr = path.split('/')
    return pathArr[pathArr.length - 1]
}

function formatPathRclone(path: string, isDir?: boolean): string {
    path = formatPath(path);
    if (path.startsWith('/')) {
        path = path.substring(1)
    }
    if (isDir) {
        if (!path.endsWith('/')) {
            path = path + '/'
        }
    } else {
        if (path.endsWith('/')) {
            path = path.substring(0, path.length - 1)
        }
    }
    return path;
}

//获取文件列表
async function getFileList(storageName: string, path: string): Promise<FileInfo[] | undefined> {
    const storage = searchStorage(storageName)
    let backData
    let fileList: FileInfo[] | undefined = undefined;

    backData = await rclone_api_post(
        '/operations/list', {
        fs: convertStoragePath(storageName, undefined, undefined, undefined, true),
        remote: convertStoragePath(storageName, path, false, true)
    })
    if (backData && backData.list) {
        fileList = []
        for (const file of backData.list) {
            let filePath = storage?.framework === 'rclone' ? formatPathRclone(file.Path, false) : convertStoragePath(alistInfo.markInRclone, file.Path, undefined, true)?.substring(storageName.length + 1)!

            fileList.push({
                path: filePath,
                name: file.Name,
                size: file.Size,
                mimeType: file.MimeType,
                modTime: new Date(file.ModTime),
                isDir: file.IsDir,
            })
        }
    }

    return fileList
}

//删除文件
async function delFile(storageName: string, path: string, refreshCallback?: Function) {
    let backData

    if (path.substring(0, 1) == '/') {
        path = path.substring(1, path.length)
    }
    backData = await rclone_api_post(
        '/operations/deletefile', {
        fs: convertStoragePath(storageName, undefined, undefined, undefined, true),
        remote: convertStoragePath(storageName, path, false, true)
    })

    if (refreshCallback) {
        refreshCallback()
    }
}

async function delDir(storageName: string, path: string, refreshCallback?: Function) {

    const backData = await rclone_api_post(
        '/operations/purge', {
        fs: convertStoragePath(storageName, undefined, undefined, undefined, true),
        remote: convertStoragePath(storageName, path, true, true)
    })

    if (refreshCallback) {
        refreshCallback()
    }
}

//创建目录
async function mkDir(storageName: string, path: string, refreshCallback?: Function) {
    const backData = await rclone_api_post(
        '/operations/mkdir', {
        fs: convertStoragePath(storageName, undefined, undefined, undefined, true),
        remote: convertStoragePath(storageName, path, true, true)
    })

    if (refreshCallback) {
        refreshCallback()
    }
}

//copyFile
async function copyFile(storageName: string, path: string, destStoragename: string, destPath: string, pathF2f: boolean = false) {//pathF2f:destPath为文件时需要设置为true。(默认false时为文件夹，文件名来自srcPath)
    const backData = await rclone_api_post(
        '/operations/copyfile', {
        srcFs: convertStoragePath(storageName, undefined, undefined, undefined, true),
        srcRemote: convertStoragePath(storageName, path, undefined, true),
        dstFs: convertStoragePath(destStoragename, undefined, undefined, undefined, true),
        dstRemote: convertStoragePath(destStoragename, destPath, !pathF2f, true)! + (!pathF2f && getFileName(path))
    }, true)
}

async function moveFile(storageName: string, path: string, destStoragename: string, destPath: string, newNmae?: string, pathF2f: boolean = false) {

    const backData = await rclone_api_post(
        '/operations/movefile', {
        srcFs: convertStoragePath(storageName, undefined, undefined, undefined, true),
        srcRemote: convertStoragePath(storageName, formatPathRclone(path), undefined, true),
        dstFs: convertStoragePath(destStoragename, undefined, undefined, undefined, true),
        dstRemote: convertStoragePath(destStoragename, destPath, !pathF2f, true) + (!pathF2f && newNmae ? newNmae : getFileName(path))
    }, true)
}



//copyDir
async function copyDir(storageName: string, path: string, destStoragename: string, destPath: string) {
    const backData = await rclone_api_post(
        '/sync/copy', {
        srcFs: convertStoragePath(storageName, path, true),
        dstFs: convertStoragePath(destStoragename, destPath, true) + getFileName(path)
    }, true)
}

async function moveDir(storageName: string, path: string, destStoragename: string, destPath: string, newNmae?: string) {
    const backData = await rclone_api_post(
        '/sync/move', {
        srcFs: convertStoragePath(storageName, path, true),
        dstFs: convertStoragePath(destStoragename, destPath, true) + (newNmae ? newNmae : getFileName(path))
    }, true)
}

//sync,需完整path(pathF2f)
async function sync(storageName: string, path: string, destStoragename: string, destPath: string, bisync?: boolean) {//bisync:双向同步
    const backData = await rclone_api_post(
        !bisync ? '/sync/sync' : '/sync/bisync', {
        srcFs: convertStoragePath(storageName, path, true),
        dstFs: convertStoragePath(destStoragename, destPath, true)
    }, true)
}

const uploadFileRequest = (option: RequestOptions, storageName: string, path: string) => {
    const { onProgress, onError, onSuccess, file } = option;

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = ({ lengthComputable, loaded, total }) => {
        if (lengthComputable) {
            console.log(Math.round(loaded / total * 100));
            onProgress(Math.round(loaded / total * 100));
        }
    };

    xhr.onload = () => {
        xhr.status === 200 ? onSuccess() : onError(xhr);
    };

    xhr.onerror = () => onError(xhr);

    xhr.open('POST', `${rcloneInfo.endpoint.url}/operations/uploadfile?fs=${convertStoragePath(storageName,undefined,undefined,undefined,true)}&remote=${convertStoragePath(storageName,path,true,true,undefined)}`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${rcloneApiHeaders.Authorization}`);
    xhr.send(formData);
};


export { reupStorage, delStorage, getStorageParams, getFileList, delFile, delDir, mkDir, formatPathRclone, copyFile, copyDir, moveFile, moveDir, sync, searchStorage, filterHideStorage, convertStoragePath, uploadFileRequest }