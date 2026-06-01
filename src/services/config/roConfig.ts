import { NMConfig, OSInfo } from '../../type/config'
import { randomString } from '../../utils'
import { THEME_MODES, LANGUAGE_OPTIONS } from '../../constants'

// ============================================
// 配置变更监听器类型
// ============================================
export type ConfigChangeListener = (config: NMConfig, prevConfig: NMConfig) => void
export type OsInfoChangeListener = (osInfo: OSInfo) => void

// ============================================
// 只读配置（运行时不变）
// ============================================
export const roConfig = {
  url: {
    website: 'https://www.netmount.cn',
    docs: 'https://api.hotpe.top/API/NetMount/GoLink?id=docs&path=',
    rclone: 'https://github.com/rclone/rclone',
    openlist: 'https://github.com/OpenListTeam/OpenList',
    to: (id: string, path: string = '') => {
      return `https://api.hotpe.top/API/NetMount/GoLink?id=${id}&path=${path}`
    },
    vhbBlog: 'https://blog.hotpe.top',
  },
  env: {
    path: {
      homeDir: '~' as string,
    },
  },
  options: {
    task: {
      runMode: {
        defIndex: 0,
        select: ['start', 'time', 'interval', 'disposable'] as const,
      },
      taskType: {
        defIndex: 3,
        select: ['copy', 'move', 'delete', 'sync', 'bisync'] as const,
      },
      dateMultiplier: {
        defIndex: 0,
        select: [
          { name: 'day', value: 1 },
          { name: 'week', value: 7 },
          { name: 'month', value: 30 },
        ],
      },
      intervalMultiplier: {
        defIndex: 0,
        select: [
          { name: 'hour', value: 60 * 60 },
          { name: 'minute', value: 60 },
          { name: 'second', value: 1 },
        ],
      },
    },
    setting: {
      themeMode: {
        defIndex: 0,
        select: [...THEME_MODES],
      },
      language: {
        defIndex: 0,
        select: [...LANGUAGE_OPTIONS],
      },
    },
  },
} as const

// Runtime-mutable environment data (separated from roConfig to avoid as const)
export const runtimeEnv = {
  path: {
    homeDir: '~' as string,
  },
}

// Keep env accessible on roConfig for backward compatibility (proxied getter)
export const getRuntimeEnv = () => runtimeEnv

// ============================================
// 默认配置
// ============================================
export const createDefaultConfig = (): NMConfig => ({
  mount: {
    lists: [],
  },
  task: [],
  api: {
    url: 'https://api.hotpe.top/API/NetMount',
  },
  settings: {
    themeMode: roConfig.options.setting.themeMode.select[0]!,
    startHide: false,
    autoRecoverComponents: true,
    language: undefined,
    path: {
      cacheDir: undefined,
      logDir: undefined,
      transferDir: undefined,
    },
  },
  framework: {
    rclone: {
      user: randomString(32),
      password: randomString(128),
      extraArgs: '',
    },
    openlist: {
      user: 'admin',
      password: randomString(16),
      extraArgs: '',
    },
  },
})

export const createDefaultOsInfo = (): OSInfo => ({
  arch: 'unknown',
  osType: 'unknown',
  platform: 'unknown',
  tempDir: '',
  osVersion: '',
})
