import { invoke } from "@tauri-apps/api"
import { nmConfig } from "../../../services/config"
import { hooks } from "../../../services/hook"
import { rcloneInfo } from "../../../services/rclone"
import { MountListItem } from "../../../type/config"
import { ParametersType } from "../../../type/rclone/storage/defaults"
import { rclone_api_post } from "../../../utils/rclone/request"


//列举存储
async function reupMount(noRefreshUI?: boolean) {

    const mountPoints = (await rclone_api_post(
        '/mount/listmounts',
    )).mountPoints
    rcloneInfo.mountList = []

    if (mountPoints) {
        mountPoints.forEach((tiem: any) => {
            const name = tiem.Fs
            rcloneInfo.mountList.push({
                storageName: name.substring(0, name.length - 1),
                mountPath: tiem.MountPoint,
                mountedTime: new Date(tiem.MountedOn),
            })
        });
    }
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

    await reupMount()
}

async function editMountStorage(mountInfo: MountListItem) {

    await reupMount()
    rcloneInfo.mountList.forEach((item) => {
        if (item.mountPath === mountInfo.mountPath) {
            return false
        }
    })

    const index = nmConfig.mount.lists.findIndex((item) => item.mountPath === mountInfo.mountPath)

    if (index !== -1) {
        nmConfig.mount.lists[index] = mountInfo
    }
}

async function mountStorage(mountInfo: MountListItem) {

    const back = await rclone_api_post('/mount/mount', {
        fs: mountInfo.storageName + ":",
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


export { reupMount, mountStorage, unmountStorage, addMountStorage, delMountStorage, editMountStorage, getMountStorage, isMounted,getAvailableDriveLetter }