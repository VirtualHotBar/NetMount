
import { RcloneInfo } from "../type/rclone/rcloneInfo"

let rcloneInfo: RcloneInfo = {
    auth:{
        user: '',
        pass: '',
        port: 3998,
    },
    storageList: [],
    mountList: [],
    version:{   
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

export { rcloneInfo }