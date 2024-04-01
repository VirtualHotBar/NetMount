import { hooks } from "../../../services/hook"
import { rcloneInfo } from "../../../services/rclone"
import { ParametersType } from "../../../type/rclone/storage/defaults"
import { rclone_api_post } from "../../../utils/rclone/request"

//列举存储
async function reupMount() {
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
    hooks.upMount()
}

async function mountStorage(storageName: string, mountPath: string, parameters: ParametersType) {

    const back = await rclone_api_post('/mount/mount', {
        fs: storageName + ":",
        mountPoint: mountPath,
        ...parameters
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

export { reupMount, mountStorage, unmountStorage }