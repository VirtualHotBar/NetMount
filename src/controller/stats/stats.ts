import { hooks } from "../../services/hook";
import { rcloneInfo, rcloneStatsHistory } from "../../services/rclone";
import { RcloneStats } from "../../type/rclone/stats";
import { rclone_api_post } from "../../utils/rclone/request";

async function reupStats() {
    const stats:RcloneStats = await rclone_api_post(
        '/core/stats',
    )
    rcloneInfo.stats = stats

    rcloneStatsHistory.push(stats)
    
    if (rcloneStatsHistory.length > 32) {
        rcloneStatsHistory.splice(0, rcloneStatsHistory.length - 32);
    }

    hooks.upStats()
}

export { reupStats }