import { Child, Command } from "@tauri-apps/api/shell";
import { RcloneStats } from "./stats";

interface RcloneInfo {
    process:{
        command?:Command,
        child?:Child,
        log?:string
    },
    endpoint: {
        url: string,
        isLocal: boolean,// 是否为本地地址
        auth: {
            user: string,
            pass: string,
        },
        localhost: {
            port: number,
        }
    },
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
    name: string,
    type: 'webdav' | string
}

interface MountList {
    storageName: string,
    mountPath: string,
    mountedTime: Date,
}

interface FileInfo {
    Path: string;
    Name: string;
    Size: number;
    MimeType: string;
    ModTime: Date;
    IsDir: boolean;
}

export { RcloneInfo, FileInfo }