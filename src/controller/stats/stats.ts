import { hooks } from "../../services/hook";
import { rcloneInfo } from "../../services/rclone";
import { rclone_api_post } from "../../utils/rclone/request";

async function reupStats() {
    const stats = await rclone_api_post(
        '/core/stats',
    )
    rcloneInfo.stats = stats
    hooks.upStats()
}

export { reupStats }