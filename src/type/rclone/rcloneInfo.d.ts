import { RcloneStats } from "./stats";

interface RcloneInfo {
    stats: RcloneStats,
    storageList: Array<StorageList>
}

interface StorageList {
    name: string,
    type: 'webdav' | string
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