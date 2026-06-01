/**
 * TempFileCleanup - 临时文件清理服务
 * 
 * 在启动时清理过期的缓存文件和日志文件
 * 在卸载和退出时清理临时文件
 */

import { invoke } from '@tauri-apps/api/core'
import { nmConfig, osInfo } from '../services/ConfigService'
import { logger } from '../services/LoggerService'
import { netmountLogDir } from './netmountPaths'
import { formatPath } from './format'

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
      timeoutMs: 30000,
    }).catch(() => {
      // 忽略错误，清理失败不影响主流程
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
      timeoutMs: 30000,
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

    // 清理该存储的 VFS 缓存目录
    // rclone VFS 缓存路径格式: <cache-dir>/<fs-hash>/
    // 使用 rclone cleanup 命令清理残留文件
    const { rclone_api_post } = await import('./rclone/request')
    await rclone_api_post('/vfs/forget', {
      fs: storageName + ':',
    }, true)

    logger.info('VFS cache forgotten for storage', 'TempCleanup', { storageName })
  } catch (error) {
    logger.debug('VFS cache cleanup on unmount failed (non-critical)', 'TempCleanup', { error: String(error) })
  }
}

/**
 * 退出时清理临时文件（同步，快速执行）
 * 仅清理临时目录，不影响正在使用的缓存
 */
export async function cleanupTempOnExit(): Promise<void> {
  try {
    const rcloneTempDir = getRcloneTempDir()
    if (!rcloneTempDir) return

    const exists = await invoke<boolean>('fs_exist_dir', { path: rcloneTempDir })
    if (exists) {
      // 使用短超时，退出时不应阻塞太久
      await invoke('run_sidecar_once', {
        name: 'binaries/rclone',
        args: ['delete', rcloneTempDir],
        timeoutMs: 5000,
      }).catch(() => {
        // 忽略错误
      })
    }
  } catch {
    // 忽略清理错误
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
      const exists = await invoke<boolean>('fs_exist_dir', { path: rcloneCacheDir })
      if (exists) {
        await invoke('run_sidecar_once', {
          name: 'binaries/rclone',
          args: ['delete', rcloneCacheDir],
          timeoutMs: 30000,
        })
      }
    }

    // 清理临时目录
    if (rcloneTempDir) {
      const exists = await invoke<boolean>('fs_exist_dir', { path: rcloneTempDir })
      if (exists) {
        await invoke('run_sidecar_once', {
          name: 'binaries/rclone',
          args: ['delete', rcloneTempDir],
          timeoutMs: 30000,
        })
      }
    }

    logger.info('All cache cleared', 'TempCleanup')
    return true
  } catch (error) {
    logger.error('Failed to clear cache', error as Error, 'TempCleanup')
    return false
  }
}
