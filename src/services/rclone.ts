
import { t } from "i18next"
import { RcloneInfo } from "../type/rclone/rcloneInfo"
import { RcloneStats } from "../type/rclone/stats"
import { nmConfig, osInfo } from "./config"
import { formatPath } from "../utils/utils"

let rcloneInfo: RcloneInfo = {
    process:{
        
    },
    endpoint: {
        url: '',
        isLocal: true,
        auth: {
            user: '',
            pass: '',
        },
        localhost: {
            port: 6434,//随机
        }
    },
    storageList: [],
    mountList: [],
    localArgs:{
        path:{
            tempDir:'rclone-temp'
        }
    },
    version: {
        arch: "",
        decomposed: [],
        goTags: "",
        goVersion: "",
        isBeta: false,
        isGit: false,
        linking: "",
        os: "",
        version: ""
    },
    stats: {
        bytes: 0,
        checks: 0,
        deletedDirs: 0,
        deletes: 0,
        elapsedTime: 0,
        errors: 0,
        eta: null,
        fatalError: false,
        renames: 0,
        retryError: false,
        serverSideCopies: 0,
        serverSideCopyBytes: 0,
        serverSideMoveBytes: 0,
        serverSideMoves: 0,
        speed: 0,
        totalBytes: 0,
        totalChecks: 0,
        totalTransfers: 0,
        transferTime: 0,
        lastError: '',
        transferring: []
    }
}

let rcloneStatsHistory: RcloneStats[] = []

export { rcloneInfo, rcloneStatsHistory }