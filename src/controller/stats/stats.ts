import { hooks } from "../../services/hook";
import { rcloneInfo, rcloneStatsHistory } from "../../services/rclone";
import { RcloneStats, RcloneTransferItem } from "../../type/rclone/stats";
import { rclone_api_post } from "../../utils/rclone/request";

async function reupStats() {
    const stats = await rclone_api_post('/core/stats') as RcloneStats | undefined;

    if (!stats) {
        return;
    }

    let realSpeed: number = 0

    if (stats.transferring && stats.transferring.length > 0) {
        stats.transferring.forEach((item: RcloneTransferItem) => {
            realSpeed += item.speed
        })
    }

    rcloneInfo.stats = {
        ...stats,
        realSpeed: realSpeed||0/* stats.speed */
    }

    //历史状态
    rcloneStatsHistory.push(stats)

    if (rcloneStatsHistory.length > 32) {
        rcloneStatsHistory.splice(0, rcloneStatsHistory.length - 32);
    }

    hooks.upStats()
}

export { reupStats }