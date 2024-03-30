import { RcloneStats } from "./stats";

interface RcloneInfo {
    stats: RcloneStats,
    storageList: Array<StorageList>,
    mountList: Array<MountList>
}

interface StorageList {
    name: string,
    type: 'webdav' | string
}

interface MountList {
    storageName: string,
    drive: string,
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