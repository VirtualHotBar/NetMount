import { RcloneStats } from "./stats";

interface RcloneInfo{
    stats:RcloneStats,
    storageList:Array<StorageList>
}

interface StorageList{
    name:string,
    type:'webdav'|string
}

export { RcloneInfo }