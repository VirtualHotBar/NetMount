/**
 * ErrorService 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// i18next 在 vitest 上下文中未初始化（翻译资源由 Tauri 侧 src-tauri/locales 加载，
// 不进入 JS 测试环境），未初始化的 t() 会返回空串/undefined。此处以 src-tauri/locales/zh-cn.json
// 中的真实翻译作为 fixture mock t()，使 AppError 的 i18n 驱动逻辑（资源插值、按分类回退）可观测。
vi.mock('i18next', () => {
  const TRANSLATIONS: Record<string, string> = {
    error_network: '网络连接失败，请检查网络设置',
    error_validation: '输入数据有误，请检查后重试',
    error_resource_not_found: '{{resource}} 不存在',
  }
  const t = (key: string, opts?: Record<string, unknown>): string => {
    const raw = TRANSLATIONS[key]
    if (raw === undefined) {
      // 未知 key：尊重 defaultValue 选项（getUserMessage 的回退链依赖此行为）
      return (opts?.defaultValue as string | undefined) ?? key
    }
    return raw.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts?.[name] ?? ''))
  }
  return { t, default: { t } }
})

import {
  ErrorCategory,
  ErrorSeverity,
  AppError,
  errorService,
} from '../ErrorService'

describe('ErrorService', () => {
  beforeEach(() => {
    // 清除错误日志
    errorService.clearErrorLog()
  })

  describe('AppError', () => {
    it('should create basic AppError with correct properties', () => {
      const error = new AppError(
        'Test error',
        ErrorCategory.API,
        ErrorSeverity.HIGH,
        'TEST_ERROR'
      )

      expect(error.name).toBe('AppError')
      expect(error.message).toBe('Test error')
      expect(error.category).toBe(ErrorCategory.API)
      expect(error.severity).toBe(ErrorSeverity.HIGH)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should have default values for optional parameters', () => {
      const error = new AppError('Simple error')

      expect(error.category).toBe(ErrorCategory.UNKNOWN)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.code).toBe('UNKNOWN_ERROR')
      expect(error.context).toBeUndefined()
    })

    it('should include original error in stack', () => {
      const originalError = new Error('Original error')
      const error = new AppError(
        'Wrapped error',
        ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM,
        'WRAPPER_ERROR',
        undefined,
        originalError
      )

      expect(error.originalError).toBe(originalError)
    })

    describe('Factory Methods', () => {
      it('should create network error', () => {
        const error = AppError.network('Network failed')
        expect(error.category).toBe(ErrorCategory.NETWORK)
        expect(error.severity).toBe(ErrorSeverity.HIGH)
        expect(error.code).toBe('NETWORK_ERROR')
      })

      it('should create API error with custom code', () => {
        const error = AppError.api('API failed', 'CUSTOM_API_ERROR')
        expect(error.category).toBe(ErrorCategory.API)
        expect(error.code).toBe('CUSTOM_API_ERROR')
      })

      it('should create validation error with field', () => {
        const error = AppError.validation('Invalid input', 'username')
        expect(error.category).toBe(ErrorCategory.VALIDATION)
        expect(error.severity).toBe(ErrorSeverity.MEDIUM)
        expect(error.context?.field).toBe('username')
      })

      it('should create auth error', () => {
        const error = AppError.auth()
        expect(error.category).toBe(ErrorCategory.AUTHENTICATION)
        expect(error.code).toBe('AUTH_ERROR')
      })

      it('should create forbidden error', () => {
        const error = AppError.forbidden('No access')
        expect(error.category).toBe(ErrorCategory.AUTHORIZATION)
        expect(error.code).toBe('FORBIDDEN_ERROR')
      })

      it('should create not found error', () => {
        const error = AppError.notFound('User')
        expect(error.category).toBe(ErrorCategory.NOT_FOUND)
        expect(error.message).toContain('User')
      })

      it('should create timeout error', () => {
        const error = AppError.timeout('Fetch', 5000)
        expect(error.category).toBe(ErrorCategory.TIMEOUT)
        expect(error.context?.timeout).toBe(5000)
      })

      it('should create file system error', () => {
        const original = new Error('FS error')
        const error = AppError.fileSystem('File not found', original)
        expect(error.category).toBe(ErrorCategory.FILE_SYSTEM)
        expect(error.originalError).toBe(original)
      })

      it('should create config error with critical severity', () => {
        const error = AppError.config('Invalid config')
        expect(error.category).toBe(ErrorCategory.CONFIGURATION)
        expect(error.severity).toBe(ErrorSeverity.CRITICAL)
      })
    })

    describe('getUserMessage', () => {
      it('should return category-based message for unknown error code', () => {
        const error = new AppError(
          'Test',
          ErrorCategory.NETWORK,
          ErrorSeverity.HIGH,
          'UNKNOWN_CODE'
        )
        expect(error.getUserMessage()).toContain('网络')
      })

      it('should return validation message for validation errors', () => {
        const error = AppError.validation('Test')
        expect(error.getUserMessage()).toContain('输入数据')
      })
    })

    describe('shouldShowToUser', () => {
      it('should return false for LOW severity', () => {
        const error = new AppError('Test', ErrorCategory.UNKNOWN, ErrorSeverity.LOW)
        expect(error.shouldShowToUser()).toBe(false)
      })

      it('should return true for MEDIUM severity', () => {
        const error = new AppError('Test', ErrorCategory.UNKNOWN, ErrorSeverity.MEDIUM)
        expect(error.shouldShowToUser()).toBe(true)
      })

      it('should return true for HIGH severity', () => {
        const error = new AppError('Test', ErrorCategory.UNKNOWN, ErrorSeverity.HIGH)
        expect(error.shouldShowToUser()).toBe(true)
      })

      it('should return true for CRITICAL severity', () => {
        const error = new AppError('Test', ErrorCategory.UNKNOWN, ErrorSeverity.CRITICAL)
        expect(error.shouldShowToUser()).toBe(true)
      })
    })

    describe('shouldReport', () => {
      it('should return false for LOW severity', () => {
        const error = new AppError('Test', ErrorCategory.UNKNOWN, ErrorSeverity.LOW)
        expect(error.shouldReport()).toBe(false)
      })

      it('should return false for MEDIUM severity', () => {
        const error = new AppError('Test', ErrorCategory.UNKNOWN, ErrorSeverity.MEDIUM)
        expect(error.shouldReport()).toBe(false)
      })

      it('should return true for HIGH severity', () => {
        const error = new AppError('Test', ErrorCategory.UNKNOWN, ErrorSeverity.HIGH)
        expect(error.shouldReport()).toBe(true)
      })

      it('should return true for CRITICAL severity', () => {
        const error = new AppError('Test', ErrorCategory.UNKNOWN, ErrorSeverity.CRITICAL)
        expect(error.shouldReport()).toBe(true)
      })
    })

    describe('toJSON', () => {
      it('should convert error to JSON object', () => {
        const error = new AppError(
          'Test error',
          ErrorCategory.API,
          ErrorSeverity.HIGH,
          'TEST_ERROR',
          { key: 'value' }
        )

        const json = error.toJSON()

        expect(json.name).toBe('AppError')
        expect(json.message).toBe('Test error')
        expect(json.category).toBe(ErrorCategory.API)
        expect(json.severity).toBe(ErrorSeverity.HIGH)
        expect(json.code).toBe('TEST_ERROR')
        expect(json.context).toEqual({ key: 'value' })
        expect(json.timestamp).toBeDefined()
        expect(json.stack).toBeDefined()
      })
    })
  })

  describe('errorService.normalize', () => {
    it('should return AppError as-is', () => {
      const appError = new AppError('Test')
      const result = errorService.normalize(appError)
      expect(result).toBe(appError)
    })

    it('should convert Error to AppError', () => {
      const error = new Error('Regular error')
      const result = errorService.normalize(error)

      expect(result).toBeInstanceOf(AppError)
      expect(result.message).toBe('Regular error')
      expect(result.originalError).toBe(error)
    })

    it('should convert string to AppError', () => {
      const result = errorService.normalize('Error message')

      expect(result).toBeInstanceOf(AppError)
      expect(result.message).toBe('Error message')
    })

    it('should convert unknown to AppError', () => {
      const result = errorService.normalize(null)

      expect(result).toBeInstanceOf(AppError)
      expect(result.message).toBe('null')
    })
  })

  describe('errorService.assert', () => {
    it('should not throw when condition is true', () => {
      expect(() => {
        errorService.assert(true, 'Should not throw')
      }).not.toThrow()
    })

    it('should throw AppError when condition is false', () => {
      expect(() => {
        errorService.assert(false, 'Assertion failed')
      }).toThrow(AppError)
    })

    it('should use custom category when provided', () => {
      try {
        errorService.assert(false, 'Validation failed', ErrorCategory.VALIDATION)
      } catch (error) {
        expect((error as AppError).category).toBe(ErrorCategory.VALIDATION)
      }
    })
  })

  describe('errorService.assertExists', () => {
    it('should return value when not null/undefined', () => {
      const value = { id: 1 }
      const result = errorService.assertExists(value, 'value')
      expect(result).toBe(value)
    })

    it('should throw when value is null', () => {
      expect(() => {
        errorService.assertExists(null, 'user')
      }).toThrow(AppError)
    })

    it('should throw when value is undefined', () => {
      expect(() => {
        errorService.assertExists(undefined, 'user')
      }).toThrow(AppError)
    })
  })

  describe('errorService.getErrorLog', () => {
    it('should return empty array initially', () => {
      expect(errorService.getErrorLog()).toEqual([])
    })

    it('should return logged errors after handle', async () => {
      const error = new Error('Test error')
      await errorService.handle(error, 'TestContext', {
        showMessage: false,
        showNotification: false,
      })

      const log = errorService.getErrorLog()
      expect(log.length).toBeGreaterThan(0)
      expect(log[0]).toBeInstanceOf(AppError)
    })
  })

  describe('errorService.clearErrorLog', () => {
    it('should clear all logged errors', async () => {
      const error = new Error('Test error')
      await errorService.handle(error, 'TestContext', {
        showMessage: false,
        showNotification: false,
      })

      expect(errorService.getErrorLog().length).toBeGreaterThan(0)

      errorService.clearErrorLog()

      expect(errorService.getErrorLog()).toEqual([])
    })
  })
})
