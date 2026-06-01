/**
 * Alist Config Import Service
 * 导入 alist/OpenList 存储配置
 *
 * alist (及 OpenList) 的存储配置格式与 OpenList API 的存储格式兼容。
 * 本服务解析 alist 导出的 JSON 配置，并通过 OpenList API 逐一创建存储。
 */

import { t } from 'i18next'
import { openlist_api_get, openlist_api_post } from '../../utils/openlist/request'
import { reupStorage } from './StorageManager'
import { logger } from '../LoggerService'

// alist/OpenList 存储配置项接口
interface AlistStorageItem {
  id?: number
  mount_path: string
  order?: number
  driver: string
  cache_expiration?: number
  status?: string
  addition: string | Record<string, unknown>
  remark?: string
  modified?: string
  disabled?: boolean
  enable_sign?: boolean
  order_by?: string
  order_direction?: string
  extract_folder?: string
  web_proxy?: boolean
  webdav_policy?: string
  down_proxy_url?: string
}

// 导入结果接口
interface ImportResult {
  total: number
  success: number
  failed: number
  skipped: number
  errors: Array<{ name: string; error: string }>
}

/**
 * 验证并解析 alist 配置 JSON
 * 支持两种格式：
 * 1. 直接的存储数组: [{mount_path: "/xxx", driver: "xxx", ...}]
 * 2. 包含 content 字段的对象: {content: [{...}], total: N}
 *
 * @param input - JSON 字符串或已解析的对象
 */
function parseAlistConfig(input: string | unknown): AlistStorageItem[] {
  let data: unknown

  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch {
      throw new Error(t('alist_import_parse_error'))
    }
  } else {
    data = input
  }

  // 处理数组格式
  if (Array.isArray(data)) {
    return validateStorageItems(data)
  }

  // 处理对象格式 (可能是 API 响应格式)
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>

    // 尝试 data.content 格式
    if (obj.data && typeof obj.data === 'object') {
      const dataObj = obj.data as Record<string, unknown>
      if (Array.isArray(dataObj.content)) {
        return validateStorageItems(dataObj.content)
      }
    }

    // 尝试 content 格式
    if (Array.isArray(obj.content)) {
      return validateStorageItems(obj.content)
    }
  }

  throw new Error(t('alist_import_format_error'))
}

/**
 * 验证存储项数组
 */
function validateStorageItems(items: unknown[]): AlistStorageItem[] {
  const validItems: AlistStorageItem[] = []

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const obj = item as Record<string, unknown>

    // 必须有 mount_path 和 driver
    if (!obj.mount_path || typeof obj.mount_path !== 'string') {
      logger.warn('Skipping alist storage item: missing mount_path', 'AlistImport', { item })
      continue
    }
    if (!obj.driver || typeof obj.driver !== 'string') {
      logger.warn('Skipping alist storage item: missing driver', 'AlistImport', { item })
      continue
    }

    // 规范化 addition 字段
    let addition: string | Record<string, unknown> = {}
    if (typeof obj.addition === 'string') {
      addition = obj.addition
    } else if (obj.addition && typeof obj.addition === 'object') {
      addition = obj.addition as Record<string, unknown>
    }

    validItems.push({
      mount_path: obj.mount_path as string,
      driver: obj.driver as string,
      addition,
      order: typeof obj.order === 'number' ? obj.order : 0,
      cache_expiration: typeof obj.cache_expiration === 'number' ? obj.cache_expiration : 30,
      remark: typeof obj.remark === 'string' ? obj.remark : '',
      disabled: typeof obj.disabled === 'boolean' ? obj.disabled : false,
      enable_sign: typeof obj.enable_sign === 'boolean' ? obj.enable_sign : false,
      order_by: typeof obj.order_by === 'string' ? obj.order_by : '',
      order_direction: typeof obj.order_direction === 'string' ? obj.order_direction : '',
      extract_folder: typeof obj.extract_folder === 'string' ? obj.extract_folder : '',
      web_proxy: typeof obj.web_proxy === 'boolean' ? obj.web_proxy : false,
      webdav_policy: typeof obj.webdav_policy === 'string' ? obj.webdav_policy : 'native_proxy',
      down_proxy_url: typeof obj.down_proxy_url === 'string' ? obj.down_proxy_url : '',
    })
  }

  return validItems
}

/**
 * 从 mount_path 提取存储名称
 * "/local" -> "local"
 * "/115 Cloud" -> "115 Cloud"
 */
function extractStorageName(mountPath: string): string {
  return mountPath.replace(/^\//, '').trim()
}

/**
 * 检查驱动是否受支持
 */
async function isDriverSupported(driver: string): Promise<boolean> {
  try {
    const response = await openlist_api_get('/api/admin/driver/names')
    if (response.data && Array.isArray(response.data)) {
      return response.data.includes(driver)
    }
    return false
  } catch {
    logger.warn('Failed to check driver support', 'AlistImport', { driver })
    return false
  }
}

/**
 * 导入单个 alist 存储到 OpenList
 */
async function importSingleStorage(item: AlistStorageItem): Promise<boolean> {
  const storageName = extractStorageName(item.mount_path)

  // 检查驱动是否受支持
  const supported = await isDriverSupported(item.driver)
  if (!supported) {
    throw new Error(t('alist_import_driver_not_supported', { driver: item.driver }))
  }

  // 构建 OpenList API 请求参数
  const additionStr = typeof item.addition === 'string'
    ? item.addition
    : JSON.stringify(item.addition)

  const params: Record<string, unknown> = {
    mount_path: item.mount_path.startsWith('/') ? item.mount_path : `/${item.mount_path}`,
    driver: item.driver,
    order: item.order ?? 0,
    cache_expiration: item.cache_expiration ?? 30,
    addition: additionStr,
    remark: item.remark ?? '',
    disabled: item.disabled ?? false,
    enable_sign: item.enable_sign ?? false,
    order_by: item.order_by ?? '',
    order_direction: item.order_direction ?? '',
    extract_folder: item.extract_folder ?? '',
    web_proxy: item.web_proxy ?? false,
    webdav_policy: item.webdav_policy ?? 'native_proxy',
    down_proxy_url: item.down_proxy_url ?? '',
  }

  const response = await openlist_api_post('/api/admin/storage/create', params)

  if (response.code !== 200) {
    throw new Error(response.message || t('error_operation_failed'))
  }

  logger.info(`Successfully imported alist storage: ${storageName}`, 'AlistImport')
  return true
}

/**
 * 导入 alist 配置
 * @param input - alist 配置 JSON 字符串或已解析的对象
 * @param onProgress - 进度回调 (current, total)
 * @returns 导入结果
 */
async function importAlistConfig(
  input: string | unknown,
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  }

  // 解析配置
  const items = parseAlistConfig(input)
  result.total = items.length

  if (items.length === 0) {
    throw new Error(t('alist_import_no_storages'))
  }

  logger.info(`Starting alist config import: ${items.length} storages`, 'AlistImport')

  // 逐一导入
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    const storageName = extractStorageName(item.mount_path)

    onProgress?.(i + 1, items.length)

    try {
      await importSingleStorage(item)
      result.success++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to import alist storage: ${storageName}`, error as Error, 'AlistImport')
      result.failed++
      result.errors.push({ name: storageName, error: errorMsg })
    }
  }

  // 刷新存储列表
  if (result.success > 0) {
    await reupStorage()
  }

  logger.info(
    `Alist config import completed: ${result.success} success, ${result.failed} failed`,
    'AlistImport'
  )

  return result
}

export { importAlistConfig, parseAlistConfig, type AlistStorageItem, type ImportResult }
