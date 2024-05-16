//https://rclone.org/rc/#data-types
//https://rclone.org/rc/#mount-mount
//https://p0.hotpe.top/i/p/1/66080cb6e9a4c.png

//https://github.com/rclone/rclone-webui-react/blob/master/src/utils/MountOptions.js
//http://localhost:5572/options/get
//https://rclone.org/commands/rclone_mount/#options-opt

interface VfsOptions {
    CacheMaxAge: number;
    CacheMaxSize: number;
    CacheMode: string;
    CachePollInterval: number;
    CaseInsensitive: boolean;
    ChunkSize: number;
    ChunkSizeLimit: number;
    DirCacheTime: number;
    DirPerms: number;
    FilePerms: number;
    GID: number;
    NoChecksum: boolean;
    NoModTime: boolean;
    NoSeek: boolean;
    PollInterval: number;
    ReadAhead: number;
    ReadOnly: boolean;
    ReadWait: number;
    UID: number;
    Umask: number;
    WriteBack: number;
    WriteWait: number;
    Refresh?: boolean;
    BlockNormDupes?: boolean;
    UsedIsSize?: boolean;
    FastFingerprint?: boolean;
    DiskSpaceTotalSize?: number;
    UID?: number;
    GID?: number;
    Umask?: number;
}

interface MountOptions {
    AllowNonEmpty: boolean;
    AllowOther: boolean;
    AllowRoot: boolean;
    AsyncRead: boolean;
    AttrTimeout: number;
    Daemon: boolean;
    DaemonTimeout: number;
    DebugFUSE: boolean;
    DefaultPermissions: boolean;
    ExtraFlags: string[]; 
    ExtraOptions: string[]; 
    MaxReadAhead: number;
    NoAppleDouble: boolean;
    NoAppleXattr: boolean;
    VolumeName: string;
    WritebackCache: boolean;
    DaemonWait?: number; 
    DeviceName?: string; 
    NetworkMode?: boolean;
    CaseInsensitive?: boolean | null; 
}



export { VfsOptions, MountOptions }



