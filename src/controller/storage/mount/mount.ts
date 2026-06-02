/**
 * Mount Controller - 挂载操作控制器
 * 
 * 重构：调用 mountRepository，而不是直接操作 nmConfig
 * 保持向后兼容的导出接口
 */

import { invoke } from '@tauri-apps/api/core'
import { Notification } from '@arco-design/web-react'
import { mountRepository } from '../../../repositories/mount/MountRepository'
import { MountListItem } from '../../../type/config'
import { logger } from '../../../services/LoggerService'

import type {
  MountOptions,
  VfsOptions,
} from '../../../type/rclone/storage/mount/parameters'

const mountLogger = logger.withContext('MountController')

// ==========================================
// 向后兼容的导出接口
// ==========================================

/**
 * 刷新挂载列表
 */
async function reupMount(noRefreshUI?: boolean) {
  try {
    await mountRepository.refreshMountList(noRefreshUI)
  } catch (error) {
    mountLogger.error('Failed to refresh mount list', error as Error)
  }
}

/**
 * 清除所有已挂载存储的 VFS 目录缓存并刷新挂载列表
 * 解决远程添加文件后本地不显示的问题
 */
async function refreshMountWithVfsCache(): Promise<void> {
  try {
    // 先清除所有 VFS 缓存，强制 rclone 重新读取远程目录
    await mountRepository.forgetAllVfsCache()
    // 再刷新挂载列表
    await mountRepository.refreshMountList()
  } catch (error) {
    mountLogger.error('Failed to refresh mount with VFS cache', error as Error)
  }
}

/**
 * 获取挂载配置
 */
function getMountStorage(mountPath: string): MountListItem | undefined {
  return mountRepository.getMountConfig(mountPath)
}

/**
 * 检查挂载配置是否存在（同步版本，仅检查配置，不检查实际挂载状态）
 * 注意：此函数检查的是配置是否存在，而非实际的rclone挂载状态
 * 如需检查实际挂载状态，请使用 mountRepository.isMounted()（异步版本）
 */
function isMounted(mountPath: string): boolean {
  const mountList = mountRepository.getMountConfig(mountPath)
  return mountList !== undefined
}

/**
 * 添加挂载配置
 */
async function addMountStorage(
  storageName: string,
  mountPath: string,
  parameters: { vfsOpt: VfsOptions; mountOpt: MountOptions },
  autoMount?: boolean
): Promise<boolean> {
  return mountRepository.addMountConfig(storageName, mountPath, parameters, autoMount)
}

/**
 * 删除挂载配置
 */
async function delMountStorage(mountPath: string) {
  try {
    await mountRepository.deleteMountConfig(mountPath)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    mountLogger.error('Failed to delete mount config', error as Error)
    Notification.error({
      title: '删除挂载配置失败',
      content: errorMsg,
    })
  }
}

/**
 * 编辑挂载配置
 */
async function editMountStorage(mountInfo: MountListItem, oldMountPath?: string) {
  await mountRepository.editMountConfig(mountInfo, oldMountPath)
}

/**
 * 挂载存储 - 包含错误处理，避免生产模式下显示"errors disabled in production"
 */
async function mountStorage(mountInfo: MountListItem): Promise<boolean> {
  try {
    await mountRepository.mountStorage(mountInfo)
    return true
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    mountLogger.error(`Mount failed for ${mountInfo.mountPath}`, error as Error)
    
    // 显示友好的错误通知，而不是让错误传播到生产模式
    Notification.error({
      title: '挂载失败',
      content: errorMsg,
      duration: 10000, // 显示更长时间，方便用户阅读
    })
    return false
  }
}

/**
 * 卸载存储
 */
async function unmountStorage(mountPath: string): Promise<boolean> {
  try {
    await mountRepository.unmountStorage(mountPath)
    return true
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    mountLogger.error(`Unmount failed for ${mountPath}`, error as Error)
    Notification.error({
      title: '卸载失败',
      content: errorMsg,
    })
    return false
  }
}

/**
 * 获取可用驱动器字母（Windows）
 */
async function getAvailableDriveLetter(): Promise<string> {
  return await invoke('get_available_drive_letter')
}

// ==========================================
// 导出（向后兼容）
// ==========================================

export {
  reupMount,
  refreshMountWithVfsCache,
  mountStorage,
  unmountStorage,
  addMountStorage,
  delMountStorage,
  editMountStorage,
  getMountStorage,
  isMounted,
  getAvailableDriveLetter,
}