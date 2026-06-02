import { logger } from '../../services/LoggerService'
import { nmConfig } from '../../services/ConfigService'
import { rcloneInfo } from '../../services/rclone'
import { useMountStore } from '../../stores/mountStore'
import { hooks } from '../../services/hook'
import { rclone_api_post } from '../../utils/rclone/request'
import { fs_exist_dir, fs_make_dir } from '../../utils'
import { convertStoragePath } from '../../services/storage/StorageManager'
import type { MountListItem } from '../../type/config'
import type { MountList } from '../../type/rclone/rcloneInfo'
import { isMountListResponse } from '../../type/rclone/api'

const mountLogger = logger.withContext('MountRepository')

/**
 * 生成URL-safe的挂载点ID
 */
export function generateMountId(storageName: string, mountPath: string): string {
  const encodedName = encodeURIComponent(storageName)
  const encodedPath = encodeURIComponent(mountPath)
  return `${encodedName}_${encodedPath}`
}

/**
 * 从ID解析storageName和mountPath
 */
export function parseMountId(id: string): { storageName: string; mountPath: string } | null {
  const separatorIndex = id.indexOf('_')
  if (separatorIndex === -1) return null
  try {
    const storageName = decodeURIComponent(id.substring(0, separatorIndex))
    const mountPath = decodeURIComponent(id.substring(separatorIndex + 1))
    return { storageName, mountPath }
  } catch {
    return null
  }
}

/**
 * 路径标准化
 */
export function normalizeMountPath(path: string): string {
  if (!path) return path
  let normalized = path.replace(/\\/g, '/')
  if (normalized.length > 2 && normalized.endsWith('/') && !normalized.endsWith(':/')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

/**
 * 刷新挂载列表（从 rclone 获取）
 */
export async function refreshMountList(noRefreshUI?: boolean): Promise<void> {
  const response = await rclone_api_post('/mount/listmounts')
  
  if (!response || !isMountListResponse(response)) {
    mountLogger.warn('Invalid mount list response format', { response })
    rcloneInfo.mountList = []
    useMountStore.getState().setMountList([])
    !noRefreshUI && hooks.upMount()
    return
  }
  
  const mountPoints = response.mountPoints
  rcloneInfo.mountList = []
  const newMountList: MountList[] = []

  mountPoints.forEach((item) => {
    const mountItem: MountList = {
      storageName: item.fs,
      mountPath: item.mountPoint,
      mountedTime: new Date(item.mountedOn),
    }
    rcloneInfo.mountList.push(mountItem)
    newMountList.push(mountItem)
  })
  
  useMountStore.getState().setMountList(newMountList)
  !noRefreshUI && hooks.upMount()
}

/**
 * 检查挂载点是否已挂载
 */
export async function isMounted(mountPath: string): Promise<boolean> {
  await refreshMountList(true)
  return rcloneInfo.mountList.findIndex(item => item.mountPath === mountPath) !== -1
}

/**
 * 获取挂载配置
 */
export function getMountConfig(mountPath: string): MountListItem | undefined {
  const normalized = normalizeMountPath(mountPath)
  return nmConfig.mount.lists.find(item => normalizeMountPath(item.mountPath) === normalized)
}

/**
 * 执行挂载操作
 */
export async function performMount(mountInfo: MountListItem): Promise<void> {
  // 非 Windows 系统需要创建目录
  if (!rcloneInfo.version.os.toLowerCase().includes('windows')) {
    if (!(await fs_exist_dir(mountInfo.mountPath))) {
      try {
        await fs_make_dir(mountInfo.mountPath)
      } catch (e) {
        const isMacOS = rcloneInfo.version.os.toLowerCase().includes('darwin')
        if (isMacOS && mountInfo.mountPath.includes('/Desktop/')) {
          throw new Error(
            `无法创建挂载目录 "${mountInfo.mountPath}"。macOS 可能未授予桌面访问权限。` +
            `请尝试将挂载路径改为非桌面目录（如 ~/Mounts/），或在系统设置中授予 NetMount 桌面访问权限。`
          )
        }
        throw new Error(`无法创建挂载目录 "${mountInfo.mountPath}": ${e}`)
      }
    }
  }

  // Windows 盘符挂载路径处理：确保路径格式正确
  let mountPath = mountInfo.mountPath
  if (rcloneInfo.version.os.toLowerCase().includes('windows')) {
    // 标准化路径分隔符
    mountPath = mountPath.replace(/\//g, '\\')
    // 对于盘符路径（如 X: 或 X:\），确保格式为 X:\
    if (/^[A-Za-z]:$/.test(mountPath)) {
      mountPath = mountPath + '\\'
    }
  }

  try {
    await rclone_api_post('/mount/mount', {
      fs: convertStoragePath(mountInfo.storageName) || mountInfo.storageName,
      mountPoint: mountPath,
      ...mountInfo.parameters,
    })
  } catch (e) {
    const isMacOS = rcloneInfo.version.os.toLowerCase().includes('darwin')
    const errorMsg = e instanceof Error ? e.message : String(e)
    
    if (isMacOS) {
      // 检测fuse-t相关错误
      if (errorMsg.includes('fuse-t') || errorMsg.includes('macfuse') || errorMsg.includes('nfsmount') || errorMsg.includes('mount_macfuse')) {
        throw new Error(
          `macOS 挂载失败。请检查以下事项：\n` +
          `1. 推荐使用 nfsmount 后端（无需安装额外驱动，M1/M2/M3/M4 均支持）\n` +
          `2. 如果使用 fuse-t：确保已安装 fuse-t 并在"系统设置 > 通用 > 登录项与扩展"中启用\n` +
          `3. 如果使用 macfuse：需要在恢复模式下允许第三方内核扩展（M系列芯片）\n` +
          `4. 确保挂载路径不是桌面目录，建议使用 ~/Mounts/ 目录\n` +
          `原始错误: ${errorMsg}`
        )
      }
      
      if (mountInfo.mountPath.includes('/Desktop/')) {
        throw new Error(
          `挂载到桌面失败。macOS 可能未授予桌面访问权限。\n` +
          `建议将挂载路径改为 ~/Mounts/ 目录，或在"系统设置 > 隐私与安全性 > 文件和文件夹"中授权。\n` +
          `原始错误: ${errorMsg}`
        )
      }
      
      // 通用 macOS 错误处理（M系列芯片常见问题）
      if (errorMsg.includes('permission') || errorMsg.includes('Operation not permitted') || 
          errorMsg.includes('Input/output error') || errorMsg.includes('no mount')) {
        throw new Error(
          `macOS 挂载失败。可能的原因：\n` +
          `1. macOS 安全权限限制（特别是 M1/M2/M3/M4 芯片）\n` +
          `2. 挂载目录权限不足\n` +
          `3. 系统完整性保护（SIP）限制\n` +
          `解决方案：\n` +
          `• 使用 nfsmount 后端（推荐，无需额外驱动）\n` +
          `• 将挂载路径改为 ~/Mounts/ 目录\n` +
          `• 检查"系统设置 > 隐私与安全性"中的文件访问权限\n` +
          `原始错误: ${errorMsg}`
        )
      }
    }
    
    // Windows 错误处理
    if (rcloneInfo.version.os.toLowerCase().includes('windows')) {
      if (errorMsg.includes('winfsp') || errorMsg.includes('FUSE')) {
        // 检测 Windows 24H2 相关的挂载问题
        const isWin24H2Issue = errorMsg.includes('access denied') || 
          errorMsg.includes('unspecified error') ||
          errorMsg.includes('I/O operation was aborted') ||
          errorMsg.includes('failed to retrieve mountpoint')
        
        if (isWin24H2Issue) {
          throw new Error(
            `Windows 挂载失败（可能是 Windows 24H2 兼容性问题）。\n` +
            `请尝试以下解决方案：\n` +
            `1. 确保已安装最新版 WinFsp（从 https://winfsp.dev/ 下载）\n` +
            `2. 以管理员身份运行 NetMount\n` +
            `3. 如果使用盘符挂载，尝试启用"网络驱动器"模式\n` +
            `4. 如果问题持续，尝试挂载到目录路径而非盘符\n` +
            `原始错误: ${errorMsg}`
          )
        }
        
        // 检测挂载点父目录不存在的问题（常见于自编译版本）
        if (errorMsg.includes('parent of mountpoint directory does not exist')) {
          throw new Error(
            `Windows 挂载失败：挂载点父目录不存在。\n` +
            `这可能是 rclone 版本兼容性问题。\n` +
            `请尝试以下解决方案：\n` +
            `1. 如果使用盘符挂载，确保盘符未被占用\n` +
            `2. 尝试挂载到目录路径而非盘符（如 C:\\Mounts\\MyDrive）\n` +
            `3. 确保已安装最新版 WinFsp\n` +
            `原始错误: ${errorMsg}`
          )
        }
        
        throw new Error(
          `Windows 挂载失败。请确保已安装 WinFsp：\n` +
          `1. 从 https://winfsp.dev/ 下载并安装 WinFsp\n` +
          `2. 安装时选择 "Core" 和 "Developer" 组件\n` +
          `原始错误: ${errorMsg}`
        )
      }
      
      // 检测资源不足错误（非分页缓冲区问题）
      if (errorMsg.includes('Insufficient system resources') || 
          errorMsg.includes('1450') ||
          errorMsg.includes('not enough resource')) {
        throw new Error(
          `Windows 挂载失败：系统资源不足。\n` +
          `这可能是非分页缓冲区占用过高的问题。\n` +
          `请尝试：\n` +
          `1. 减少 ReadAhead 参数（建议 4MB 或更低）\n` +
          `2. 重启系统以释放内存\n` +
          `3. 检查是否有其他程序占用大量内存\n` +
          `原始错误: ${errorMsg}`
        )
      }
    }
    
    throw e
  }

  await refreshMountList()
}

/**
 * 清除所有已挂载存储的 VFS 目录缓存
 * 用于刷新操作，强制 rclone 重新从远程读取目录列表
 */
export async function forgetAllVfsCache(): Promise<void> {
  const mounts = rcloneInfo.mountList
  if (mounts.length === 0) return

  const forgetPromises = mounts.map(async (mount) => {
    try {
      await rclone_api_post('/vfs/forget', {
        fs: convertStoragePath(mount.storageName) || mount.storageName,
      }, true)
    } catch {
      // 忽略 - 非关键操作
    }
  })

  await Promise.all(forgetPromises)
  mountLogger.debug('VFS cache forgotten for all mounts', { count: mounts.length })
}

/**
 * 执行卸载操作
 * 卸载前先清理 VFS 缓存引用，卸载后清理残留临时文件
 */
export async function performUnmount(mountPath: string): Promise<void> {
  // 查找对应的存储名称，用于 VFS 缓存清理
  const mountConfig = getMountConfig(mountPath)
  
  // 卸载前通知 VFS 释放缓存引用
  if (mountConfig) {
    try {
      await rclone_api_post('/vfs/forget', {
        fs: convertStoragePath(mountConfig.storageName) || mountConfig.storageName,
      }, true)
    } catch {
      // 忽略 - 非关键操作
    }
  }
  
  await rclone_api_post('/mount/unmount', { mountPoint: mountPath })
  await refreshMountList()
  
  // 卸载后清理该存储的残留临时文件
  if (mountConfig) {
    try {
      const { cleanupVfsCacheOnUnmount } = await import('../../utils/tempCleanup')
      await cleanupVfsCacheOnUnmount(mountConfig.storageName)
    } catch {
      // 忽略 - 非关键操作
    }
  }
}
