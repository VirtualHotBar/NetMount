/**
 * 应用常量集中化管理
 * 消除 Magic Strings 和 Magic Numbers
 */

// ============================================
// 时间常量 (毫秒)
// ============================================

export const TIME_MS = {
  SECOND: 1_000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
} as const;

export const TIME_S = {
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
} as const;

// ============================================
// API 超时配置
// ============================================

export const API_TIMEOUT = {
  DEFAULT: 10_000,           // 默认超时 10秒
  PING: 5_000,              // Ping 超时 5秒
  LONG: 30_000,             // 长请求超时 30秒
  VERSION_CHECK: 5_000,     // 版本检查超时 5秒
  OPENLIST_VERSION: 10_000, // OpenList 版本检查 10秒
} as const;

// ============================================
// 重试配置
// ============================================

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,              // 最大重试次数
  INITIAL_DELAY: 1_000,          // 初始延迟 1秒
  MAX_DELAY: 10_000,            // 最大延迟 10秒
  BACKOFF_MULTIPLIER: 2,       // 退避倍数
  JITTER_RANGE: 500,            // 抖动范围 (±ms)
} as const;

// ============================================
// 存储配置
// ============================================

export const STORAGE_CONFIG = {
  NAME_MAX_LENGTH: 128,
  INVALID_CHARS: ['<', '>', ':', '"', '|', '?', '*', '/', '\\'] as const,
  CACHE_DIR_SUFFIX: '.cache/netmount',
  DEFAULT_PAGE_SIZE: 50,
} as const;

// ============================================
// 任务配置
// ============================================

export const TASK_CONFIG = {
  RUN_MODES: ['start', 'time', 'interval', 'disposable'] as const,
  TASK_TYPES: ['copy', 'move', 'delete', 'sync', 'bisync'] as const,
  DATE_MULTIPLIERS: [
    { name: 'day', value: 1 },
    { name: 'week', value: 7 },
    { name: 'month', value: 30 },
  ] as const,
  INTERVAL_MULTIPLIERS: [
    { name: 'hour', value: 60 * 60 },
    { name: 'minute', value: 60 },
    { name: 'second', value: 1 },
  ] as const,
  DEFAULT_WORKERS: 5,
  DEFAULT_MAX_RETRY: 2,
} as const;

// ============================================
// OpenList 配置
// ============================================

export const OPENLIST_CONFIG = {
  DEFAULT_PORT: 9751,
  DEFAULT_TOKEN_EXPIRES_HOURS: 48,
  MARK_IN_RCLONE: '.netmount-openlist.',
  DEFAULT_TABLE_PREFIX: 'x_',
  LOG_MAX_SIZE: 50,
  LOG_MAX_BACKUPS: 30,
  LOG_MAX_AGE: 28,
  CORS_ALLOW_ALL: true,
  DOWNLOAD_WORKERS: 5,
  TRANSFER_WORKERS: 5,
  UPLOAD_WORKERS: 5,
  COPY_WORKERS: 5,
} as const;

// ============================================
// Rclone 配置
// ============================================

export const RCLONE_CONFIG = {
  DEFAULT_PORT: 6434,
  DEFAULT_TEMP_DIR: 'rclone-temp',
} as const;

// ============================================
// 主题和语言配置
// ============================================

export const THEME_MODES = ['auto', 'light', 'dark'] as const;

export const LANGUAGE_OPTIONS = [
  { name: '简体中文', value: 'cn', langCode: 'zh-cn' },
  { name: '繁體中文', value: 'ct', langCode: 'zh-tw' },
  { name: 'English', value: 'en', langCode: 'en-us' },
] as const;

// ============================================
// 错误码配置
// ============================================

export const ERROR_CODES = {
  // 通用错误
  UNKNOWN: 'UNKNOWN_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  API: 'API_ERROR',
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION: 'PERMISSION_DENIED',
  CONFIG: 'CONFIG_ERROR',

  // 存储相关
  STORAGE_NOT_FOUND: 'STORAGE_NOT_FOUND',
  STORAGE_EXISTS: 'STORAGE_EXISTS',
  STORAGE_CREATE_FAILED: 'STORAGE_CREATE_FAILED',
  STORAGE_DELETE_FAILED: 'STORAGE_DELETE_FAILED',

  // 挂载相关
  MOUNT_FAILED: 'MOUNT_FAILED',
  UNMOUNT_FAILED: 'UNMOUNT_FAILED',
  MOUNT_POINT_INVALID: 'MOUNT_POINT_INVALID',

  // 任务相关
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  TASK_CREATE_FAILED: 'TASK_CREATE_FAILED',
  TASK_EXECUTION_FAILED: 'TASK_EXECUTION_FAILED',

  // 框架相关
  RCLONE_START_FAILED: 'RCLONE_START_FAILED',
  OPENLIST_START_FAILED: 'OPENLIST_START_FAILED',
  FRAMEWORK_VERSION_FAILED: 'FRAMEWORK_VERSION_FAILED',
} as const;

// ============================================
// 消息配置
// ============================================

export const MESSAGES = {
  // 成功消息
  SUCCESS: 'success',
  INSTALL_SUCCESS: '安装成功',

  // 错误消息
  ERROR: 'error',
  ERROR_TIPS: '发生错误',
  NETWORK_DISCONNECTED: '网络连接已断开',
  OPERATION_TIMEOUT: '操作超时',

  // 存储消息
  STORAGE_CREATED: '存储创建成功',
  STORAGE_DELETED: '存储删除成功',
  STORAGE_UPDATED: '存储更新成功',

  // 挂载消息
  MOUNT_SUCCESS: '挂载成功',
  UNMOUNT_SUCCESS: '卸载成功',
} as const;

// ============================================
// 路径配置
// ============================================

export const PATHS = {
  HOME_DIR_PLACEHOLDER: '~',
  DATA_DIR: 'data',
  LOG_DIR: 'log',
  TEMP_DIR: 'temp',
  DB_FILE: 'data/data.db',
  LOG_FILE: 'log/log.log',
  BLEVE_DIR: 'bleve',
} as const;

// ============================================
// 日志配置
// ============================================

export const LOG_CONFIG = {
  LEVEL_DEBUG: 'debug',
  LEVEL_INFO: 'info',
  LEVEL_WARN: 'warn',
  LEVEL_ERROR: 'error',
  DEFAULT_LEVEL: 'info',
} as const;

// ============================================
// 窗口配置
// ============================================

export const WINDOW_CONFIG = {
  DEFAULT_WIDTH: 1200,
  DEFAULT_HEIGHT: 800,
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600,
} as const;

// ============================================
// 国际化键名
// ============================================

export const I18N_KEYS = {
  INIT: 'init',
  READ_CONFIG: 'read_config',
  START_FRAMEWORK: 'start_framework',
  GET_NOTICE: 'get_notice',
  ERROR: 'error',
  SUCCESS: 'success',
  ERROR_TIPS: 'error_tips',
} as const;
