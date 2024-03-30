import { hooks } from "../../../services/hook"
import { rcloneInfo } from "../../../services/rclone"
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
                drive: tiem.MountPoint,
                mountedTime: new Date(tiem.MountedOn),
            })
        });
    }
    hooks.upMount()
}

export { reupMount }