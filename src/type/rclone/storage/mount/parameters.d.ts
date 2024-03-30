//https://github.com/rclone/rclone-webui-react/blob/master/src/utils/MountOptions.js

import { ParametersType, ParamsSelectType } from "../defaults";

interface VfsOptions {
    CacheMaxAge: number;
    CacheMaxSize: number;
    CacheMode: ParamsSelectType;
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
    ExtraFlags: string[]; // 假设数组元素为字符串类型
    ExtraOptions: string[]; // 假设数组元素为字符串类型
    MaxReadAhead: number;
    NoAppleDouble: boolean;
    NoAppleXattr: boolean;
    VolumeName: string;
    WritebackCache: boolean;
}






export { VfsOptions, MountOptions }



