/**
 * TempFileCleanup - 临时文件清理服务
 * 
 * 在启动时清理过期的缓存文件和日志文件
 */

import { invoke } from '@tauri-apps/api/core'
import { nmConfig, osInfo } from '../services/ConfigService'
import { logger } from '../services/LoggerService'
import { netmountLogDir } from './netmountPaths'
import { formatPath } from './format'

/**
 * 清理过期的临时文件
 * - 清理超过24小时的rclone缓存文件
 * - 清理超过7天的日志文件
 */
export async function cleanupTempFiles(): Promise<void> {
  try {
    const cacheDir = nmConfig.settings.path.cacheDir
    if (!cacheDir) {
      logger.info('No cache directory configured, skipping cleanup', 'TempCleanup')
      return
    }

    const rcloneCacheDir = formatPath(cacheDir + '/rclone/', osInfo.platform === 'windows')
    const logDir = netmountLogDir()

    // 清理rclone缓存（24小时过期）
    await cleanupDirectory(rcloneCacheDir, 24 * 60 * 60 * 1000)

    // 清理旧日志文件（7天过期）
    await cleanupOldLogs(logDir, 7 * 24 * 60 * 60 * 1000)

    logger.info('Temp file cleanup completed', 'TempCleanup')
  } catch (error) {
    logger.warn('Temp file cleanup failed (non-critical)', 'TempCleanup', { error: String(error) })
  }
}

/**
 * 清理目录中的过期文件
 */
async function cleanupDirectory(dirPath: string, maxAgeMs: number): Promise<void> {
  try {
    // 使用Tauri的fs API来清理
    const exists = await invoke<boolean>('fs_exist_dir', { path: dirPath })
    if (!exists) {
      return
    }

    // 通过sidecar执行清理命令
    const platform = osInfo.platform === 'windows' ? 'windows' : 'unix'
    
    if (platform === 'windows') {
      // Windows: 删除超过指定时间的文件
      await invoke('run_sidecar_once', {
        name: 'binaries/rclone',
        args: ['delete', dirPath, '--min-age', '24h'],
        timeoutMs: 30000,
      }).catch(() => {
        // 忽略错误，清理失败不影响主流程
      })
    } else {
      // Unix: 使用find命令清理
      await invoke('run_sidecar_once', {
        name: 'binaries/rclone',
        args: ['delete', dirPath, '--min-age', '24h'],
        timeoutMs: 30000,
      }).catch(() => {
        // 忽略错误
      })
    }
  } catch {
    // 忽略清理错误
  }
}

/**
 * 清理旧日志文件，保留最近的日志
 */
async function cleanupOldLogs(logDir: string, maxAgeMs: number): Promise<void> {
  try {
    const exists = await invoke<boolean>('fs_exist_dir', { path: logDir })
    if (!exists) {
      return
    }

    // 只清理 .log.1, .log.2 等轮转日志，保留当前日志
    await invoke('run_sidecar_once', {
      name: 'binaries/rclone',
      args: ['delete', logDir, '--include', '*.log.*', '--min-age', '168h'],
      timeoutMs: 30000,
    }).catch(() => {
      // 忽略错误
    })
  } catch {
    // 忽略清理错误
  }
}

/**
 * 手动清理所有缓存
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    const cacheDir = nmConfig.settings.path.cacheDir
    if (!cacheDir) {
      return false
    }

    const rcloneCacheDir = formatPath(cacheDir + '/rclone/', osInfo.platform === 'windows')
    
    // 停止rclone后清理缓存
    const exists = await invoke<boolean>('fs_exist_dir', { path: rcloneCacheDir })
    if (exists) {
      await invoke('run_sidecar_once', {
        name: 'binaries/rclone',
        args: ['delete', rcloneCacheDir],
        timeoutMs: 30000,
      })
    }

    logger.info('All cache cleared', 'TempCleanup')
    return true
  } catch (error) {
    logger.error('Failed to clear cache', error as Error, 'TempCleanup')
    return false
  }
}
