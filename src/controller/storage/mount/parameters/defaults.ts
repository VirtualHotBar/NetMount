import { MountOptions, VfsOptions } from "../../../../type/rclone/storage/mount/parameters";


// 示例：初始化VfsOptions和MountOptions的默认值
const defaultVfsConfig: VfsOptions = {
    ReadOnly: false,
    CacheMaxAge: 3600000000000,
    CacheMaxSize: -1,
    CacheMode: {
        select: 'minimal',
        values: [
            'off',
            'minimal',
            'writes',
            'full',
        ]
    },
    CachePollInterval: 60000000000,
    CaseInsensitive: false,
    ChunkSize: 134217728,
    ChunkSizeLimit: -1,
    DirCacheTime: 300000000000,
    DirPerms: 511,
    FilePerms: 438,
    GID: 1000,
    NoChecksum: false,
    NoModTime: false,
    NoSeek: false,
    PollInterval: 60000000000,
    ReadAhead: 0,
    ReadWait: 20000000,
    UID: 1000,
    Umask: 2,
    WriteBack: 5000000000,
    WriteWait: 1000000000,
};

const defaultMountConfig: MountOptions = {
    AllowNonEmpty: false,
    AllowOther: false,
    AllowRoot: false,
    AsyncRead: true,
    AttrTimeout: 1000000000,
    Daemon: false,
    DaemonTimeout: 0,
    DebugFUSE: false,
    DefaultPermissions: false,
    ExtraFlags: [],
    ExtraOptions: [],
    MaxReadAhead: 131072,
    NoAppleDouble: true,
    NoAppleXattr: false,
    VolumeName: '',
    WritebackCache: false,
};

export { defaultVfsConfig, defaultMountConfig }