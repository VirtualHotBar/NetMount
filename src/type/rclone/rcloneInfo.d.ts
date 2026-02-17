import { Child, Command } from "@tauri-apps/plugin-shell";
import { RcloneStats } from "./stats";

interface RcloneInfo {
    process: {
        command?: Command,
        child?: Child,
        log?: string,
        logFile?: string
    },
    endpoint: {
        url: string,
        isLocal: boolean,// 是否为本地地址
        auth: {
            //user: string,
            //pass: string,
        },
        localhost: {
            port: number,
        }
    },
    localArgs:{
        path:{
            tempDir?:string
        }
    }
    version: RcloneVersion,
    stats: RcloneStats,
    storageList: Array<StorageList>,
    mountList: Array<MountList>
}



// 定义 RcloneVersion 接口
interface RcloneVersion {
    arch: string; // CPU 架构，例如："386"
    decomposed: number[]; // 版本号数组，例如：[1, 66, 0]
    goTags: string; // Go 语言标签，例如："cmount"
    goVersion: string; // Go 语言版本，例如："go1.22.1"
    isBeta: boolean; // 是否为 Beta 版本，例如：false
    isGit: boolean; // 是否为 Git 构建版本，例如：false
    linking: string; // 链接类型，例如："static"
    os: string; // 目标操作系统，例如："windows"
    version: string; // Rclone 版本字符串，例如："v1.66.0"
}

interface StorageList {
    framework: 'rclone' | 'openlist';//框架
    name: string,
    type: 'webdav' | string,
    space?: StorageSpace,
    other?: {
        openlist?: { 
            id?: number ,
            driverPath?:string//openlist存储的挂载路径
            status?:'work'|string
        }
    },
    hide?: boolean,//是否隐藏
}

interface StorageSpace {
    used: number,
    total: number,
    free: number,
    trashed?: number
}

interface MountList {
    storageName: string,
    mountPath: string,
    mountedTime: Date,
}

interface FileInfo {
    path: string;
    name: string;
    size: number;
    mimeType?: string;
    modTime: Date;
    isDir: boolean;
}

export { RcloneInfo, FileInfo, StorageSpace,StorageList,RcloneVersion,MountList }
