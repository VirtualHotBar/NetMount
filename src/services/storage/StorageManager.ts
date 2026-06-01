import { hooks } from '../../services/hook'
import { rcloneInfo } from '../../services/rclone'
import { StorageList, StorageSpace } from '../../type/rclone/rcloneInfo'
import { ParametersType } from '../../type/defaults'
import { rclone_api_post } from '../../utils/rclone/request'
import { openlist_api_get, openlist_api_post } from '../../utils/openlist/request'
import { formatPath } from '../../utils'
import { openlistInfo } from '../../services/openlist'
import { delMountStorage } from '../../controller/storage/mount/mount'
import { nmConfig } from '../../services/ConfigService'
import { configService } from '../../services/ConfigService'
import { OpenlistStorageItem } from '../../type/openlist/openlistInfo'
import { registerDeleteStorage } from '../../services/storage/StorageService'
import { RETRY_CONFIG } from '../../constants'
import { logger } from '../../services/LoggerService'
import { isRcloneConfigDump, isRcloneAboutResponse } from '../../utils/validators/rcloneValidators'
import { useStorageStore } from '../../stores/storageStore'

/**
 * Refresh and update storage list from both rclone and OpenList
 * Cleans up invalid internal storages automatically
 */
async function reupStorage() {
  try {
    const storageListTemp: StorageList[] = []
    const storagesToDelete: string[] = []

    // rclone
    try {
      const dumpResult = await rclone_api_post('/config/dump')
      
      // Validate response structure
      if (!isRcloneConfigDump(dumpResult)) {
        logger.warn('Invalid rclone config dump response', 'StorageManager', { dumpResult })
        throw new Error('Invalid rclone config dump response')
      }
      
      // 并行查询所有存储的容量信息，避免串行等待
      const storageNames = Object.keys(dumpResult)
      const spaceResults = await Promise.all(
        storageNames.map(async (storageName) => {
          const space = await getStorageSpace(storageName)
          return { storageName, space }
        })
      )

      for (const { storageName, space } of spaceResults) {
        // 检查是否是失效的内部存储（标记为 -2）
        if (space.total === -2 && storageName.includes('.netmount-')) {
          logger.warn(`Detected invalid internal storage: ${storageName}, will cleanup`, 'StorageManager')
          storagesToDelete.push(storageName)
          continue // 不添加到列表
        }

        storageListTemp.push({
          framework: 'rclone',
          name: storageName,
          type: dumpResult[storageName]?.type || 'unknown',
          space: space,
          hide: storageName.includes(openlistInfo.markInRclone),
        })
      }

      // 清理失效的内部存储
      for (const name of storagesToDelete) {
        try {
          logger.info(`Cleaning up invalid internal storage: ${name}`, 'StorageManager')
          await rclone_api_post('/config/delete', { name }, true)
          logger.info(`Successfully deleted: ${name}`, 'StorageManager')
        } catch (deleteError) {
          logger.error(`Failed to delete ${name}:`, deleteError as Error, 'StorageManager')
        }
      }
    } catch (rcloneError) {
      logger.error('Failed to fetch rclone storage list:', rcloneError as Error, 'StorageManager')
      // rclone 失败不影响 openlist 的加载
    }

    // openlist
    try {
      const response = await openlist_api_get('/api/admin/storage/list')
      const responseData = response.data as { content?: OpenlistStorageItem[] } | undefined
      const list = (responseData?.content) || []
      for (const storage of list) {
        // 数据验证
        if (!storage || !storage.mount_path) {
          logger.warn('Invalid storage data from OpenList:', 'StorageManager', { storage })
          continue
        }
        storageListTemp.push({
          framework: 'openlist',
          name: storage.mount_path.substring(1),
          type: storage.driver,
          other: {
            openlist: {
              id: storage.id,
              driverPath: storage.mount_path,
              status: storage.status,
            },
          },
        })
      }
    } catch (openlistError) {
      logger.error('Failed to fetch OpenList storage list:', openlistError as Error, 'StorageManager')
      // openlist 失败不影响已加载的 rclone 存储
    }

    // 使用 ConfigService 更新 rcloneInfo，避免直接修改全局状态
    configService.updateRcloneInfo({ storageList: storageListTemp })
    // Sync to store for reactive updates
    useStorageStore.getState().setStorageList(storageListTemp)
    hooks.upStorage()
  } catch (error) {
    logger.error('Critical error in reupStorage:', error as Error, 'StorageManager')
    // 即使出错也触发更新，避免 UI 卡住
    hooks.upStorage()
  }
}

/**
 * Filter out hidden storages from the list
 * @param storageList - List of all storages
 * @returns List of visible storages
 */
function filterHideStorage(storageList: StorageList[]): StorageList[] {
  const data: StorageList[] = []
  for (const item of storageList) {
    if (!item.hide) data.push(item)
  }
  return data
}

/**
 * Get storage space information for a specific storage
 * @param name - Storage name
 * @returns Storage space info (total, free, used)
 */
async function getStorageSpace(name: string): Promise<StorageSpace> {
  // 添加重试逻辑，因为存储刚创建时可能还未就绪
  let retries = RETRY_CONFIG.MAX_ATTEMPTS
  let lastError: unknown

  while (retries > 0) {
    try {
      const aboutResult = await rclone_api_post(
        '/operations/about',
        {
          fs: name + ':',
        },
        true
      )
      
      // Validate response structure
      if (!isRcloneAboutResponse(aboutResult)) {
        logger.warn('Invalid rclone about response', 'StorageManager', { aboutResult, name })
        return { total: -1, free: -1, used: -1 }
      }

      if (aboutResult.total && aboutResult.total > 0) {
        return { total: Number(aboutResult.total), free: Number(aboutResult.free ?? -1), used: Number(aboutResult.used ?? -1) }
      } else {
        return { total: -1, free: -1, used: -1 }
      }
    } catch (error) {
      lastError = error
      retries--
      if (retries > 0) {
        logger.info(`getStorageSpace failed for ${name}, retrying... (${retries} attempts left)`, 'StorageManager')
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.INITIAL_DELAY))
      }
    }
  }

  // 对于内部存储（如 .netmount-*），如果获取失败，考虑删除无效配置
  if (name.includes('.netmount-')) {
    logger.warn(`Internal storage ${name} is not accessible, marking for cleanup`, 'StorageManager')
    // 返回无效标记，让调用方决定是否删除
    return { total: -2, free: -2, used: -2 }
  }

  // 检测token相关错误（如百度网盘refresh token过期）
  const errorStr = String(lastError)
  if (errorStr.includes('refresh_token') || errorStr.includes('token') || errorStr.includes('auth') || 
      errorStr.includes('empty token') || errorStr.includes('wrong refresh token')) {
    logger.warn(`Storage ${name} may have token issues: ${errorStr}`, 'StorageManager')
    return { total: -3, free: -3, used: -3 } // 特殊标记：token错误
  }

  logger.warn(`getStorageSpace failed for ${name} after all retries:`, 'StorageManager', { lastError })
  return { total: -1, free: -1, used: -1 }
}

/**
 * Delete a storage by name
 * @param name - Storage name to delete
 */
async function delStorage(name: string) {
  const storage = searchStorage(name)

  //删除挂载
  for (const mount of nmConfig.mount.lists) {
    if (mount.storageName === storage?.name) {
      await delMountStorage(mount.mountPath)
    }
  }

  switch (storage?.framework) {
    case 'rclone':
      await rclone_api_post('/config/delete', {
        name: storage.name,
      })
      break
    case 'openlist':
      await openlist_api_post('/api/admin/storage/delete', undefined, {
        id: storage.other?.openlist?.id,
      })
      break
  }
  reupStorage()
}

/**
 * Get storage parameters/configuration by name
 * @param name - Storage name
 * @returns Storage parameters
 */
async function getStorageParams(name: string): Promise<ParametersType> {
  const storage = searchStorage(name)

  switch (storage?.framework) {
    case 'rclone': {
      const result = await rclone_api_post('/config/get', {
        name: storage?.name,
      })
      return result || {}
    }
    case 'openlist': {
      const response = await openlist_api_get('/api/admin/storage/get', {
        id: storage?.other?.openlist?.id,
      })
      const params = (response.data ?? {}) as Record<string, unknown>
      // 安全解析 addition 字段
      if (params.addition && typeof params.addition === 'string') {
        try {
          params.addition = JSON.parse(params.addition)
        } catch (parseError) {
          logger.warn(`Failed to parse addition field for storage ${storage?.name}`, 'StorageManager', { error: (parseError as Error).message, additionValue: params.addition })
          // 保留原值，避免崩溃
          params.addition = {}
        }
      } else if (!params.addition) {
        params.addition = {}
      }
      return params as ParametersType
    }
  }
  return {}
}

/**
 * Search for a storage by keyword (name or driver path)
 * @param keyword - Storage name or driver path to search
 * @returns Storage info or undefined
 */
function searchStorage(keyword: string): StorageList | undefined {
  for (const storage of rcloneInfo.storageList) {
    if (
      storage.name === keyword ||
      (storage.framework === 'openlist' && storage.other?.openlist?.driverPath === keyword)
    ) {
      return storage
    }
  }
  return undefined
}

/**
 * Convert storage path to rclone format
 * @param storageName - Storage name
 * @param path - Path to convert
 * @param _isDir - Whether path is a directory (unused)
 * @param noStorageName - If true, exclude storage name from result
 * @param onlyStorageName - If true, only return storage name
 * @returns Converted path string
 */
const convertStoragePath = (
  storageName: string,
  path?: string,
  _isDir?: boolean,
  noStorageName: boolean = false,
  onlyStorageName: boolean = false
): string => {
  if (path === '/') {
    path = ''
  }
  const storage = searchStorage(storageName)
  logger.info(`Storage lookup result for "${storageName}":`, 'StorageManager', { storage })

  switch (storage?.framework) {
    case 'rclone':
      return (
        (noStorageName ? '' : storageName + ':') +
        (onlyStorageName ? '' : path ? formatPathRclone(path) : '')
      )
    case 'openlist': {
      // 修复双斜杠问题：确保 path 不以 / 开头再拼接
      const normalizedPath = path && path.startsWith('/') ? path.substring(1) : path
      return (
        (noStorageName ? '' : openlistInfo.markInRclone + ':') +
        (onlyStorageName
          ? ''
          : normalizedPath
            ? formatPathRclone(storageName + '/' + normalizedPath)
            : storageName)
      )
    }
    default:
      return ''
  }
}

/**
 * Get file name from path
 * @param path - File path
 * @returns File name
 */
function getFileName(path: string): string {
  const pathArr = path.split('/')
  return pathArr[pathArr.length - 1] ?? ''
}

/**
 * Format path for rclone (remove leading/trailing slashes)
 * @param path - Path to format
 * @returns Formatted path
 */
function formatPathRclone(path: string): string {
  path = formatPath(path)
  if (path.startsWith('/')) {
    path = path.substring(1)
  }
  // 始终移除末尾斜杠
  if (path.endsWith('/')) {
    path = path.substring(0, path.length - 1)
  }
  return path
}

/**
 * Rename an existing storage
 * @param oldName - Current storage name
 * @param newName - New storage name
 * @returns true if successful
 */
async function renameStorage(oldName: string, newName: string): Promise<boolean> {
  if (!oldName || !newName || oldName === newName) {
    return false
  }

  const storage = searchStorage(oldName)
  if (!storage) {
    logger.error(`Storage not found: ${oldName}`, undefined, 'StorageManager')
    return false
  }

  // Check if new name already exists
  if (searchStorage(newName)) {
    logger.error(`Storage name already exists: ${newName}`, undefined, 'StorageManager')
    return false
  }

  try {
    switch (storage.framework) {
      case 'rclone': {
        // Get current config
        const config = await rclone_api_post('/config/get', { name: oldName })
        if (!config) {
          logger.error(`Failed to get config for ${oldName}`, undefined, 'StorageManager')
          return false
        }
        // Create new config with new name
        await rclone_api_post('/config/create', {
          name: newName,
          type: config.type,
          parameters: config,
        })
        // Delete old config
        await rclone_api_post('/config/delete', { name: oldName })
        break
      }
      case 'openlist': {
        // OpenList storage rename is not directly supported
        logger.warn('OpenList storage rename not supported', 'StorageManager')
        return false
      }
    }

    // Update mount references
    for (const mount of nmConfig.mount.lists) {
      if (mount.storageName === oldName) {
        mount.storageName = newName
      }
    }

    // Update task references
    for (const task of nmConfig.task) {
      if (task.source.storageName === oldName) {
        task.source.storageName = newName
      }
      if (task.target.storageName === oldName) {
        task.target.storageName = newName
      }
    }

    await reupStorage()
    logger.info(`Storage renamed: ${oldName} -> ${newName}`, 'StorageManager')
    return true
  } catch (error) {
    logger.error(`Failed to rename storage ${oldName} -> ${newName}:`, error as Error, 'StorageManager')
    return false
  }
}

export {
  reupStorage,
  delStorage,
  getStorageParams,
  searchStorage,
  filterHideStorage,
  convertStoragePath,
  getStorageSpace,
  formatPathRclone,
  getFileName,
  renameStorage,
}

// Register deleteStorage implementation to avoid circular dependencies
// This allows utils/rclone/process.ts to call deleteStorage without importing from controller
registerDeleteStorage(delStorage)
