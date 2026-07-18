import { getRuntime } from '../../runtime/port'
import { t } from 'i18next'
import { ParametersType } from '../../type/defaults'
import { openlist_api_post } from '../../utils/openlist/request'
import { rclone_api_post } from '../../utils/rclone/request'
import { isEmptyObject } from '../../utils'
import { searchStorageInfo } from './allList'
import { reupStorage, searchStorage } from './storage'
import { logger } from '../../services/LoggerService'

/**
 * 验证存储名称
 */
function validateStorageName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return t('validation_storage_name_empty')
  }
  if (name.trim().length === 0) {
    return t('validation_storage_name_empty')
  }
  if (name.length > 128) {
    return t('validation_storage_name_too_long')
  }
  if (/[<>:"|?*/\\]/.test(name)) {
    return t('validation_storage_name_invalid_chars')
  }
  return null
}

/**
 * 验证存储类型
 */
function validateStorageType(type: string): string | null {
  if (!type || typeof type !== 'string') {
    return t('validation_storage_type_empty')
  }
  return null
}

/**
 * 验证参数
 */
function validateParameters(parameters: ParametersType): string | null {
  if (!parameters || typeof parameters !== 'object') {
    return t('validation_storage_params_empty')
  }
  return null
}

/**
 * 统一输入验证
 */
function validateStorageInput(
  name: string,
  type: string,
  parameters: ParametersType
): { valid: boolean; error?: string } {
  const nameError = validateStorageName(name)
  if (nameError) return { valid: false, error: nameError }

  const typeError = validateStorageType(type)
  if (typeError) return { valid: false, error: typeError }

  const paramError = validateParameters(parameters)
  if (paramError) return { valid: false, error: paramError }

  return { valid: true }
}

async function createStorage(
  name: string,
  type: string,
  parameters: ParametersType,
  exAdditional: ParametersType = {},
  opt?: { obscure?: boolean; noObscure?: boolean }
): Promise<boolean> {
  // 输入验证
  const validation = validateStorageInput(name, type, parameters)
  if (!validation.valid) {
    getRuntime().notify('error',validation.error || t('validation_input_invalid'))
    logger.error('Storage validation failed', undefined, 'StorageCreate', { error: validation.error })
    return false
  }

  const storageInfo = searchStorageInfo(type)
  if (!storageInfo) {
    getRuntime().notify('error',t('error_unsupported_storage_type') + ': ' + type)
    logger.error('Storage type not found', undefined, 'StorageCreate', { type })
    return false
  }

  const storage = searchStorage(name)
  let backData

  try {
    switch (storageInfo.framework) {
      case 'rclone': {
        const requestBody: ParametersType = {
          name: name,
          type: storageInfo.type,
          parameters: parameters,
          ...exAdditional,
        }
        // 如果提供了 opt 参数，添加到请求中
        if (opt) {
          requestBody['opt'] = opt
        }
        backData = await rclone_api_post('/config/create', requestBody)
        await reupStorage()
        return backData ? isEmptyObject(backData as Record<string, unknown>) : false
      }

      case 'openlist': {
        // 安全序列化 addition
        let serializedAddition: string
        try {
          serializedAddition = JSON.stringify(parameters.addition)
        } catch (e) {
          logger.error('Failed to serialize addition', e as Error, 'StorageCreate')
          getRuntime().notify('error',t('error_storage_params_serialization'))
          return false
        }

        const openlistParams = {
          ...parameters,
          addition: serializedAddition,
          driver: storageInfo.type,
          ...exAdditional,
        }

        if (!storage) {
          // 创建新存储
          backData = await openlist_api_post('/api/admin/storage/create', openlistParams)
        } else {
          // 更新现有存储
          const storageId = storage.other?.openlist?.id
          if (!storageId) {
            getRuntime().notify('error',t('error_storage_id_not_found'))
            return false
          }
          backData = await openlist_api_post('/api/admin/storage/update', {
            ...openlistParams,
            id: storageId,
          })
        }

        if (backData.code !== 200) {
          getRuntime().notify('error',backData.message || t('error_operation_failed'))
          return false
        }

        await reupStorage()
        return true
      }

      default:
        getRuntime().notify('error',t('error_unsupported_framework') + ': ' + storageInfo.framework)
        return false
    }
  } catch (error) {
    logger.error('Storage operation failed', error as Error, 'StorageCreate')
    getRuntime().notify('error',t('error_storage_network_failure'))
    return false
  }
}

export { createStorage }
