import { StorageParamItemType } from '../../../../type/controller/storage/info'
import { MountOptions, VfsOptions } from '../../../../type/rclone/storage/mount/parameters'

const vfsCacheModeParam: StorageParamItemType = {
  label: 'CacheMode',
  name: 'CacheMode',
  description: 'CacheMode',
  type: 'string',
  default: 'writes',
  required: false,
  advanced: false,
  isPassword: false,
  select: [
    { label: 'Full', value: 'full', help: '' },
    { label: 'Writes', value: 'writes', help: '' },
    { label: 'Minimal', value: 'minimal', help: '' },
    { label: 'Off', value: 'off', help: '' },
  ],
}

// 示例：初始化VfsOptions和MountOptions的默认值
const defaultVfsConfig: VfsOptions = {
  ReadOnly: false,
  CacheMaxAge: 3600000000000,
  CacheMaxSize: 10737418240, //10GB
  CacheMode: 'writes',
  CachePollInterval: 60000000000,
  CaseInsensitive: false,
  ChunkSize: 67108864,
  ChunkSizeLimit: -1,
  DirCacheTime: 120000000000, // 2分钟（优化：更长的目录缓存提高浏览速度）
  DirPerms: 511,
  FilePerms: 511,
  NoChecksum: false,
  NoModTime: false,
  NoSeek: false,
  PollInterval: 60000000000, // 60秒轮询间隔（优化：减少不必要的轮询）
  ReadAhead: 33554432, // 32MB（优化：增加预读提高顺序读取性能）
  ReadWait: 20000000,
  WriteBack: 5000000000,
  WriteWait: 1000000000,
  Refresh: false,
  BlockNormDupes: false,
  UsedIsSize: false,
  FastFingerprint: false,
  DiskSpaceTotalSize: -1,
  UID: 4294967295,
  GID: 4294967295,
  Umask: 0,
}

const defaultMountConfig: MountOptions = {
  VolumeName: '',
  AllowNonEmpty: false,
  AllowOther: false,
  AllowRoot: false,
  AsyncRead: true,
  AttrTimeout: 1000000000,
  Daemon: false,
  DaemonTimeout: 0,
  DebugFUSE: false,
  DefaultPermissions: true,
  ExtraFlags: [],
  ExtraOptions: [],
  MaxReadAhead: 1048576,
  NoAppleDouble: true,
  NoAppleXattr: false,
  WritebackCache: false,
  DaemonWait: 0,
  DeviceName: '',
  MountType: '',
  NetworkMode: false, //挂载为网络驱动器
  //CaseInsensitive: null,
}

export { defaultVfsConfig, defaultMountConfig, vfsCacheModeParam }
