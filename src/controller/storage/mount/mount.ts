import { invoke } from "@tauri-apps/api"
import { nmConfig, saveNmConfig } from "../../../services/config"
import { hooks } from "../../../services/hook"
import { rcloneInfo } from "../../../services/rclone"
import { MountListItem } from "../../../type/config"
import { ParametersType } from "../../../type/defaults"
import { rclone_api_post } from "../../../utils/rclone/request"
import { fs_exist_dir, fs_make_dir } from "../../../utils/utils"
import { convertStoragePath, formatPathRclone } from "../storage"


//列举存储
async function reupMount(noRefreshUI?: boolean) {

    const mountPoints: any[] = (await rclone_api_post(
        '/mount/listmounts',
    )).mountPoints || []

    rcloneInfo.mountList = [];
    
    mountPoints.forEach((tiem: any) => {
        const name = tiem.Fs
        rcloneInfo.mountList.push({
            storageName:name, //name.substring(0, name.length - 1)
            mountPath: tiem.MountPoint,
            mountedTime: new Date(tiem.MountedOn),
        })
    });
    !noRefreshUI && hooks.upMount()
}

function getMountStorage(mountPath: string): MountListItem | undefined {
    return nmConfig.mount.lists.find((item) => item.mountPath === mountPath)
}

function isMounted(mountPath: string): boolean {
    return rcloneInfo.mountList.findIndex((item) => item.mountPath === mountPath) !== -1
}

async function addMountStorage(storageName: string, mountPath: string, parameters: ParametersType, autoMount?: boolean) {
    if (getMountStorage(mountPath)) {
        return false
    }

    const mountInfo: MountListItem = {
        storageName: storageName,
        mountPath: mountPath,
        parameters: parameters,
        autoMount: (autoMount || false),
    }
    nmConfig.mount.lists.push(mountInfo)

    await saveNmConfig()
    await reupMount()
}

async function delMountStorage(mountPath: string) {
    if (isMounted(mountPath)) {
        await unmountStorage(mountPath)
    }

    nmConfig.mount.lists.forEach((item, index) => {
        if (item.mountPath === mountPath) {
            nmConfig.mount.lists.splice(index, 1)
        }
    })

    await saveNmConfig()
    await reupMount()
}

async function editMountStorage(mountInfo: MountListItem) {

    await reupMount()
    //觉得这里是不必要的，就注释了
    /*rcloneInfo.mountList.forEach((item) => {
            if (item.mountPath === mountInfo.mountPath) {
                return false
            }
        }) */

    const index = nmConfig.mount.lists.findIndex((item) => item.mountPath === mountInfo.mountPath)

    if (index !== -1) {
        nmConfig.mount.lists[index] = mountInfo
    }

    await saveNmConfig()
}

async function mountStorage(mountInfo: MountListItem) {
    if (!rcloneInfo.version.os.toLowerCase().includes('windows') && !await fs_exist_dir(mountInfo.mountPath)) {
        await fs_make_dir(mountInfo.mountPath)
    }

    const back = await rclone_api_post('/mount/mount', {
        fs:convertStoragePath( mountInfo.storageName )|| mountInfo.storageName,
        mountPoint: mountInfo.mountPath,
        ...(mountInfo.parameters)
    })

    await reupMount()
    return back
}

async function unmountStorage(mountPath: string) {
    await rclone_api_post('/mount/unmount', {
        mountPoint: mountPath,
    })

    await reupMount()
}

async function getAvailableDriveLetter(): Promise<string> {
    return await invoke('get_available_drive_letter')//Z:
}


export { reupMount, mountStorage, unmountStorage, addMountStorage, delMountStorage, editMountStorage, getMountStorage, isMounted, getAvailableDriveLetter }