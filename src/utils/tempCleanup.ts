/**
 * TempFileCleanup - 临时文件清理服务
 * 
 * 在启动时清理过期的缓存文件和日志文件
 * 运行期间定期清理过期的 VFS 缓存文件
 * 在卸载和退出时清理临时文件和缓存文件
 */

import { invoke } from '@tauri-apps/api/core'
import { nmConfig, osInfo } from '../services/ConfigService'
import { logger } from '../services/LoggerService'
import { netmountLogDir } from './netmountPaths'
import { formatPath } from './format'

/** 定期清理定时器 ID */
let periodicCleanupTimer: ReturnType<typeof setInterval> | undefined

/** 定期清理间隔（4小时） */
const PERIODIC_CLEANUP_INTERVAL_MS = 4 * 60 * 60 * 1000

/** 获取 rclone 缓存目录路径 */
function getRcloneCacheDir(): string | undefined {
  const cacheDir = nmConfig.settings.path.cacheDir
  if (!cacheDir) return undefined
  return formatPath(cacheDir + '/rclone/', osInfo.platform === 'windows')
}

/** 获取 rclone 临时文件目录路径 */
function getRcloneTempDir(): string | undefined {
  const cacheDir = nmConfig.settings.path.cacheDir
  if (!cacheDir) return undefined
  return formatPath(cacheDir + '/rclone-temp/', osInfo.platform === 'windows')
}

/**
 * 清理过期的临时文件
 * - 清理超过1小时的rclone缓存文件
 * - 清理超过1小时的rclone临时文件
 * - 清理超过7天的日志文件
 */
export async function cleanupTempFiles(): Promise<void> {
  try {
    const rcloneCacheDir = getRcloneCacheDir()
    const rcloneTempDir = getRcloneTempDir()
    const logDir = netmountLogDir()

    // 清理rclone缓存（1小时过期）
    if (rcloneCacheDir) {
      await cleanupDirectory(rcloneCacheDir, '1h')
    }

    // 清理rclone临时文件（1小时过期）
    if (rcloneTempDir) {
      await cleanupDirectory(rcloneTempDir, '1h')
    }

    // 清理旧日志文件（7天过期）
    await cleanupOldLogs(logDir, '168h')

    logger.info('Temp file cleanup completed', 'TempCleanup')
  } catch (error) {
    logger.warn('Temp file cleanup failed (non-critical)', 'TempCleanup', { error: String(error) })
  }
}

/**
 * 启动定期清理任务
 * 每隔 4 小时清理一次过期的缓存和临时文件，防止长期运行时缓存无限增长
 */
export function startPeriodicCleanup(): void {
  stopPeriodicCleanup()
  periodicCleanupTimer = setInterval(() => {
    cleanupTempFiles().catch(() => {
      // 定期清理失败不影响主流程
    })
  }, PERIODIC_CLEANUP_INTERVAL_MS)
  logger.info('Periodic temp cleanup started (interval: 4h)', 'TempCleanup')
}

/** 停止定期清理任务 */
export function stopPeriodicCleanup(): void {
  if (periodicCleanupTimer !== undefined) {
    clearInterval(periodicCleanupTimer)
    periodicCleanupTimer = undefined
  }
}

/**
 * 清理目录中的过期文件
 * @param dirPath 要清理的目录路径
 * @param minAge 最小文件年龄（rclone格式，如 '1h', '24h'）
 */
async function cleanupDirectory(dirPath: string, minAge: string): Promise<void> {
  try {
    const exists = await invoke<boolean>('fs_exist_dir', { path: dirPath })
    if (!exists) {
      return
    }

    await invoke('run_sidecar_once', {
      name: 'binaries/rclone',
      args: ['delete', dirPath, '--min-age', minAge],
      timeout_ms: 30000,
    }).catch(() => {
      // 忽略错误，清理失败不影响主流程
    })
  } catch {
    // 忽略清理错误
  }
}

/**
 * 强制清除整个目录（包括所有文件和子目录）
 * 使用 rclone purge 递归删除目录内容
 */
async function purgeDirectory(dirPath: string, timeoutMs: number = 30000): Promise<void> {
  try {
    const exists = await invoke<boolean>('fs_exist_dir', { path: dirPath })
    if (!exists) {
      return
    }

    await invoke('run_sidecar_once', {
      name: 'binaries/rclone',
      args: ['purge', dirPath],
      timeout_ms: timeoutMs,
    }).catch(() => {
      // 忽略错误
    })
  } catch {
    // 忽略清理错误
  }
}

/**
 * 清理旧日志文件，保留最近的日志
 */
async function cleanupOldLogs(logDir: string, minAge: string): Promise<void> {
  try {
    const exists = await invoke<boolean>('fs_exist_dir', { path: logDir })
    if (!exists) {
      return
    }

    // 只清理 .log.1, .log.2 等轮转日志，保留当前日志
    await invoke('run_sidecar_once', {
      name: 'binaries/rclone',
      args: ['delete', logDir, '--include', '*.log.*', '--min-age', minAge],
      timeout_ms: 30000,
    }).catch(() => {
      // 忽略错误
    })
  } catch {
    // 忽略清理错误
  }
}

/**
 * 卸载时清理指定存储的 VFS 缓存
 * 在卸载挂载点后调用，清除该存储的残留缓存文件
 */
export async function cleanupVfsCacheOnUnmount(storageName: string): Promise<void> {
  try {
    const rcloneCacheDir = getRcloneCacheDir()
    if (!rcloneCacheDir) return

    // 1. 通知 rclone VFS 忘记目录缓存
    const { rclone_api_post } = await import('./rclone/request')
    await rclone_api_post('/vfs/forget', {
      fs: storageName + ':',
    }, true)

    // 2. 尝试清理该存储在 VFS 缓存中的残留文件
    // rclone VFS 缓存路径格式: <cache-dir>/vfs/<remote>/<path>
    // 使用 rclone cleanup 命令清理缓存中的残留文件
    await invoke('run_sidecar_once', {
      name: 'binaries/rclone',
      args: ['cleanup', storageName + ':'],
      timeout_ms: 15000,
    }).catch(() => {
      // cleanup 可能因远程不可用而失败，忽略
    })

    logger.info('VFS cache cleaned on unmount', 'TempCleanup', { storageName })
  } catch (error) {
    logger.debug('VFS cache cleanup on unmount failed (non-critical)', 'TempCleanup', { error: String(error) })
  }
}

/**
 * 退出时清理临时文件和缓存文件
 * rclone 已停止后调用，使用 purge 彻底清除目录内容
 */
export async function cleanupTempOnExit(): Promise<void> {
  try {
    stopPeriodicCleanup()

    const rcloneCacheDir = getRcloneCacheDir()
    const rcloneTempDir = getRcloneTempDir()

    // 清理临时目录（使用 purge 彻底删除所有文件和子目录）
    if (rcloneTempDir) {
      await purgeDirectory(rcloneTempDir, 5000)
    }

    // 清理缓存目录中的 VFS 缓存文件（rclone 已停止，可安全清理）
    if (rcloneCacheDir) {
      await purgeDirectory(rcloneCacheDir, 5000)
    }
  } catch {
    // 忽略清理错误
  }
}

/**
 * 删除存储时的缓存清理
 * 在删除存储配置前调用，清理 VFS 缓存和本地临时文件
 * 
 * 与 cleanupVfsCacheOnUnmount 不同，此函数额外清理本地 VFS 缓存目录，
 * 确保删除存储策略后磁盘空间被正确释放
 */
export async function cleanupStorageOnDelete(storageName: string): Promise<void> {
  try {
    // 1. 清理 rclone VFS 缓存（需要远程还存在）
    await cleanupVfsCacheOnUnmount(storageName)
    
    // 2. 清理本地 VFS 缓存目录（兜底措施，确保本地文件被清除）
    const rcloneCacheDir = getRcloneCacheDir()
    if (rcloneCacheDir) {
      const vfsCacheDir = formatPath(rcloneCacheDir + 'vfs/' + storageName + '/', osInfo.platform === 'windows')
      await purgeDirectory(vfsCacheDir, 15000)
    }
    
    logger.info('Storage cache cleaned on delete', 'TempCleanup', { storageName })
  } catch (error) {
    logger.debug('Storage cache cleanup on delete failed (non-critical)', 'TempCleanup', { error: String(error) })
  }
}

/**
 * 手动清理所有缓存
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    const rcloneCacheDir = getRcloneCacheDir()
    const rcloneTempDir = getRcloneTempDir()
    
    // 清理缓存目录
    if (rcloneCacheDir) {
      await purgeDirectory(rcloneCacheDir, 30000)
    }

    // 清理临时目录
    if (rcloneTempDir) {
      await purgeDirectory(rcloneTempDir, 30000)
    }

    logger.info('All cache cleared', 'TempCleanup')
    return true
  } catch (error) {
    logger.error('Failed to clear cache', error as Error, 'TempCleanup')
    return false
  }
}
