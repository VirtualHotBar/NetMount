import { listenWindow, window as appWindow } from './window'
import { nmConfig, readNmConfig, roConfig, runtimeEnv } from '../services/ConfigService'
import { setThemeMode } from './setting/setting'
import { setLocalized } from './language/localized'
import { startRclone } from '../utils/rclone/process'
import { startOpenlist } from '../utils/openlist/process'
import { startUpdateCont } from './stats/continue'
import { startComponentWatchdog } from './componentWatchdog'
import { runStartupTasksInBackground } from './startupTasks'
import { getOsInfo } from '../utils/tauri/osInfo'
import { defaultCacheDir } from '../utils/netmountPaths'
import { homeDir } from '@tauri-apps/api/path'
import { t } from 'i18next'
import { logger } from '../services/LoggerService'
import { cleanupTempFiles } from '../utils/tempCleanup'
import { invoke } from '@tauri-apps/api/core'

type SetStartStrFn = (str: string) => void

/**
 * 验证并修复配置中的路径
 * 当 Windows 用户名变更时，旧路径可能失效
 */
async function validateAndFixPaths(): Promise<void> {
  const currentHome = runtimeEnv.path.homeDir
  
  // 检查缓存目录是否有效
  if (nmConfig.settings.path.cacheDir) {
    const cacheDir = nmConfig.settings.path.cacheDir
    // 如果缓存目录包含旧的用户名路径，重置为默认值
    // 简单检查：如果目录不存在且包含 homeDir 的父路径
    try {
      const exists = await invoke<boolean>('fs_exist_dir', { path: cacheDir })
      if (!exists) {
        logger.warn(`Cache directory does not exist: ${cacheDir}, resetting to default`, 'MainInit')
        nmConfig.settings.path.cacheDir = undefined
      }
    } catch {
      logger.warn(`Failed to check cache directory: ${cacheDir}, resetting to default`, 'MainInit')
      nmConfig.settings.path.cacheDir = undefined
    }
  }
  
  // 确保 homeDir 是有效的
  if (!currentHome || currentHome === '~') {
    logger.warn('Home directory not resolved, using fallback', 'MainInit')
    runtimeEnv.path.homeDir = await homeDir()
  }
  
  // 检查挂载路径是否包含旧的用户名路径
  // 当 Windows 用户名变更时，挂载路径可能失效
  if (nmConfig.mount && nmConfig.mount.lists) {
    for (const mount of nmConfig.mount.lists) {
      if (mount.mountPath && mount.mountPath.includes('/Users/') || mount.mountPath.includes('\\Users\\')) {
        // 检查挂载路径是否包含当前用户的 home 目录
        const normalizedHome = currentHome.replace(/\\/g, '/').toLowerCase()
        const normalizedMount = mount.mountPath.replace(/\\/g, '/').toLowerCase()
        if (!normalizedMount.startsWith(normalizedHome)) {
          logger.warn(`Mount path may contain old username: ${mount.mountPath}`, 'MainInit')
        }
      }
    }
  }
}

export async function init(setStartStr: SetStartStrFn) {
  setStartStr(t('init'))
  runtimeEnv.path.homeDir = await homeDir()
  listenWindow()

  await getOsInfo()

  setStartStr(t('read_config'))
  await readNmConfig()

  // 验证并修复可能失效的路径（如 Windows 用户名变更后）
  await validateAndFixPaths()

  if (nmConfig.settings.language) {
    await setLocalized(nmConfig.settings.language)
  } else {
    const matchingLang = roConfig.options.setting.language.select.find(
      lang => lang.langCode === navigator.language.toLowerCase()
    )
    const defaultLang =
      roConfig.options.setting.language.select[roConfig.options.setting.language.defIndex]
    nmConfig.settings.language = matchingLang?.value || defaultLang?.value || 'en'
    await setLocalized(nmConfig.settings.language)
  }

  if (!nmConfig.settings.path.cacheDir) {
    nmConfig.settings.path.cacheDir = defaultCacheDir()
  }

  // 确保缓存目录存在
  try {
    await invoke('fs_make_dir', { path: nmConfig.settings.path.cacheDir })
  } catch (e) {
    logger.warn(`Failed to create cache directory: ${nmConfig.settings.path.cacheDir}`, 'MainInit', { error: e })
  }

  setThemeMode(nmConfig.settings.themeMode)

  setStartStr(t('start_framework'))

  // 启动组件时使用独立的 try-catch，避免单个组件失败导致整个初始化失败
  const rcloneError = await startRclone().catch(e => {
    logger.error('Failed to start rclone', e instanceof Error ? e : new Error(String(e)))
    return e as Error
  })

  await startOpenlist().catch(e => {
    logger.error('Failed to start openlist', e instanceof Error ? e : new Error(String(e)))
  })

  startUpdateCont()

  startComponentWatchdog()
  runStartupTasksInBackground()

  // 启动后清理过期临时文件（非阻塞）
  cleanupTempFiles().catch(() => {
    // 清理失败不影响主流程
  })

  if (!nmConfig.settings.startHide) {
    await appWindow.show()
    await appWindow.setFocus()
  }

  // 如果核心组件启动失败，抛出让上层显示错误
  if (rcloneError instanceof Error) {
    throw new Error(`Rclone startup failed: ${rcloneError.message}`)
  }

  logger.info('Application initialization complete', 'MainInit')
}
