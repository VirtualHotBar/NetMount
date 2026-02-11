import { hooks } from "../../services/hook"
import { rcloneInfo } from "../../services/rclone"
import { FileInfo, StorageList, StorageSpace } from "../../type/rclone/rcloneInfo"
import { ParametersType } from "../../type/defaults"
import { getRcloneApiHeaders, rclone_api_post } from "../../utils/rclone/request"
import { openlist_api_get, openlist_api_post } from "../../utils/openlist/request"
import { formatPath } from "../../utils/utils"
import { openlistInfo } from "../../services/openlist"
import { RequestOptions } from "@arco-design/web-react/es/Upload"
import { delMountStorage } from "./mount/mount"
import { nmConfig } from "../../services/config"

//列举存储信息
async function reupStorage() {
    try {
        const storageListTemp: StorageList[] = []
        
        //rclone
        try {
            const dump = await rclone_api_post('/config/dump')
            for (const storageName in dump) {
                storageListTemp.push({
                    framework: 'rclone',
                    name: storageName,
                    type: dump[storageName].type,
                    space: await getStorageSpace(storageName),
                    hide: storageName.includes(openlistInfo.markInRclone)
                })
            }
        } catch (rcloneError) {
            console.error('Failed to fetch rclone storage list:', rcloneError)
            // rclone 失败不影响 openlist 的加载
        }

        //openlist
        try {
            const response = await openlist_api_get('/api/admin/storage/list')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const list = response?.data?.content as any[] || []
            for (const storage of list) {
                // 数据验证
                if (!storage || !storage.mount_path) {
                    console.warn('Invalid storage data from OpenList:', storage)
                    continue
                }
                storageListTemp.push({
                    framework: 'openlist',
                    name: storage.mount_path.substring(1),
                    type: storage.driver,
                    other: {
                        openlist: {
                            id: storage.id,
                            driverPath: storage.mount_path,
                            status: storage.status
                        }
                    }
                })
            }
        } catch (openlistError) {
            console.error('Failed to fetch OpenList storage list:', openlistError)
            // openlist 失败不影响已加载的 rclone 存储
        }

        rcloneInfo.storageList = storageListTemp
        hooks.upStorage()
    } catch (error) {
        console.error('Critical error in reupStorage:', error)
        // 即使出错也触发更新，避免 UI 卡住
        hooks.upStorage()
    }
}

function filterHideStorage(storageList: StorageList[]) {//过滤隐藏的存储
    const data: StorageList[] = []
    for (const item of storageList) {
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

    //删除挂载
    for (const mount of nmConfig.mount.lists) {
        if (mount.storageName === storage?.name) {
            await delMountStorage(mount.mountPath)
        }
    }

    switch (storage?.framework) {
        case 'rclone':
            await rclone_api_post(
                '/config/delete', {
                name: storage.name
            })
            break;
        case 'openlist':
            await openlist_api_post('/api/admin/storage/delete', undefined, { id: storage.other?.openlist?.id })
            break;
    }
    reupStorage()
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
        case 'openlist': {
            const params = (await openlist_api_get(
                '/api/admin/storage/get', {
                id: storage?.other?.openlist?.id
            })).data;
            // 安全解析 addition 字段
            if (params.addition && typeof params.addition === 'string') {
                try {
                    params.addition = JSON.parse(params.addition);
                } catch (parseError) {
                    console.warn(`Failed to parse addition field for storage ${storage?.name}:`, parseError);
                    console.warn('Raw addition value:', params.addition);
                    // 保留原值，避免崩溃
                    params.addition = {};
                }
            } else if (!params.addition) {
                params.addition = {};
            }
            return params
        }
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
        case 'openlist':
            return (noStorageName ? '' : openlistInfo.markInRclone + ':') + (onlyStorageName ? '' : (path ? formatPathRclone(storageName + '/' + path, isDir) : storageName))
    }
}


function searchStorage(keyword: string) {
    for (const storage of rcloneInfo.storageList) {
        if (storage.name === keyword || (storage.framework === 'openlist' && storage.other?.openlist?.driverPath === keyword)) {
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
    let fileList: FileInfo[] | undefined = undefined;

    const backData = await rclone_api_post(
        '/operations/list', {
        fs: convertStoragePath(storageName, undefined, undefined, undefined, true),
        remote: convertStoragePath(storageName, path, false, true)
    })
    if (backData && backData.list) {
        fileList = []
        for (const file of backData.list) {
            const filePath = storage?.framework === 'rclone' ? formatPathRclone(file.Path, false) : convertStoragePath(openlistInfo.markInRclone, file.Path, undefined, true)?.substring(storageName.length + 1) ?? ''

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
type RefreshCallback = () => void;

async function delFile(storageName: string, path: string, refreshCallback?: RefreshCallback) {
    if (path.substring(0, 1) == '/') {
        path = path.substring(1, path.length)
    }
    await rclone_api_post(
        '/operations/deletefile', {
        fs: convertStoragePath(storageName, undefined, undefined, undefined, true),
        remote: convertStoragePath(storageName, path, false, true)
    })

    if (refreshCallback) {
        refreshCallback()
    }
}

async function delDir(storageName: string, path: string, refreshCallback?: RefreshCallback) {
    await rclone_api_post(
        '/operations/purge', {
        fs: convertStoragePath(storageName, undefined, undefined, undefined, true),
        remote: convertStoragePath(storageName, path, true, true)
    })

    if (refreshCallback) {
        refreshCallback()
    }
}

//创建目录
async function mkDir(storageName: string, path: string, refreshCallback?: RefreshCallback) {
    await rclone_api_post(
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
    await rclone_api_post(
        '/operations/copyfile', {
        srcFs: convertStoragePath(storageName, undefined, undefined, undefined, true),
        srcRemote: convertStoragePath(storageName, path, undefined, true),
        dstFs: convertStoragePath(destStoragename, undefined, undefined, undefined, true),
        dstRemote: convertStoragePath(destStoragename, destPath, !pathF2f, true)! + (!pathF2f && getFileName(path))
    }, true)
}

async function moveFile(storageName: string, path: string, destStoragename: string, destPath: string, newNmae?: string, pathF2f: boolean = false) {
    await rclone_api_post(
        '/operations/movefile', {
        srcFs: convertStoragePath(storageName, undefined, undefined, undefined, true),
        srcRemote: convertStoragePath(storageName, formatPathRclone(path), undefined, true),
        dstFs: convertStoragePath(destStoragename, undefined, undefined, undefined, true),
        dstRemote: convertStoragePath(destStoragename, destPath, !pathF2f, true) + (!pathF2f && newNmae ? newNmae : getFileName(path))
    }, true)
}



//copyDir
async function copyDir(storageName: string, path: string, destStoragename: string, destPath: string) {
    await rclone_api_post(
        '/sync/copy', {
        srcFs: convertStoragePath(storageName, path, true),
        dstFs: convertStoragePath(destStoragename, destPath, true) + getFileName(path)
    }, true)
}

async function moveDir(storageName: string, path: string, destStoragename: string, destPath: string, newNmae?: string) {
    await rclone_api_post(
        '/sync/move', {
        srcFs: convertStoragePath(storageName, path, true),
        dstFs: convertStoragePath(destStoragename, destPath, true) + (newNmae ? newNmae : getFileName(path))
    }, true)
}

//sync,需完整path(pathF2f)
async function sync(storageName: string, path: string, destStoragename: string, destPath: string, bisync?: boolean) {//bisync:双向同步
    if (!bisync) {
        await rclone_api_post(
            '/sync/sync', {//同步
            srcFs: convertStoragePath(storageName, path, true),
            dstFs: convertStoragePath(destStoragename, destPath, true)
        }, true)
    } else {
        await rclone_api_post(
            '/sync/bisync', {//双向同步
            path1: convertStoragePath(storageName, path, true),
            path2: convertStoragePath(destStoragename, destPath, true)
        }, true)
    }

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

    xhr.open('POST', `${rcloneInfo.endpoint.url}/operations/uploadfile?fs=${convertStoragePath(storageName, undefined, undefined, undefined, true)}&remote=${convertStoragePath(storageName, path, true, true, undefined)}`, true);
    xhr.setRequestHeader('Authorization', getRcloneApiHeaders().Authorization);
    xhr.send(formData);
};


export { reupStorage, delStorage, getStorageParams, getFileList, delFile, delDir, mkDir, formatPathRclone, copyFile, copyDir, moveFile, moveDir, sync, searchStorage, filterHideStorage, convertStoragePath, uploadFileRequest }