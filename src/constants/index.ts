/**
 * 全局常量定义
 * 集中管理所有魔术数字和字符串，增强可维护性
 */

// ============================================
// HTTP 状态码
// ============================================
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

// ============================================
// 时间常量（毫秒）
// ============================================
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

// ============================================
// 文件大小常量
// ============================================
export const FILE_SIZE = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024,
} as const;

// ============================================
// Rclone 相关常量
// ============================================
export const RCLONE = {
  DEFAULT_PORT: 6434,
  API_BASE: '/rc',
  ENDPOINTS: {
    NOOP: '/rc/noop',
    VERSION: '/core/version',
    CONFIG_DUMP: '/config/dump',
    CONFIG_GET: '/config/get',
    CONFIG_CREATE: '/config/create',
    CONFIG_DELETE: '/config/delete',
    CONFIG_PROVIDERS: '/config/providers',
    OPERATIONS_LIST: '/operations/list',
    OPERATIONS_DELETE: '/operations/deletefile',
    OPERATIONS_PURGE: '/operations/purge',
    OPERATIONS_MKDIR: '/operations/mkdir',
    OPERATIONS_COPY: '/operations/copyfile',
    OPERATIONS_MOVE: '/operations/movefile',
    SYNC_COPY: '/sync/copy',
    SYNC_MOVE: '/sync/move',
    SYNC_SYNC: '/sync/sync',
    SYNC_BISYNC: '/sync/bisync',
    MOUNT_LIST: '/mount/listmounts',
    MOUNT_MOUNT: '/mount/mount',
    MOUNT_UNMOUNT: '/mount/unmount',
  },
} as const;

// ============================================
// OpenList 相关常量
// ============================================
export const OPENLIST = {
  DEFAULT_PORT: 5244,
  API_BASE: '/api/admin',
  ENDPOINTS: {
    PING: '/ping',
    STORAGE_LIST: '/api/admin/storage/list',
    STORAGE_GET: '/api/admin/storage/get',
    STORAGE_CREATE: '/api/admin/storage/create',
    STORAGE_UPDATE: '/api/admin/storage/update',
    STORAGE_DELETE: '/api/admin/storage/delete',
    DRIVER_LIST: '/api/admin/driver/list',
    DRIVER_NAMES: '/api/admin/driver/names',
    DRIVER_INFO: '/api/admin/driver/info',
    SETTING_GET: '/api/admin/setting/get',
  },
  MARK_IN_RCLONE: 'openlist',
} as const;

// ============================================
// 存储相关常量
// ============================================
export const STORAGE = {
  MAX_NAME_LENGTH: 128,
  FORBIDDEN_CHARS: /[<>:"|?*/\\]/,
  DEFAULT_MOUNT_PATH: '/',
} as const;

// ============================================
// 任务相关常量
// ============================================
export const TASK = {
  MAX_RETRY_COUNT: 3,
  DEFAULT_TIMEOUT: 30000, // 30秒
} as const;

// ============================================
// UI 相关常量
// ============================================
export const UI = {
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
  MODAL_ANIMATION_DURATION: 200,
} as const;
