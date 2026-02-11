/**
 * 错误处理系统 - 提供统一的错误类型和处理机制
 * 增强应用的健壮性和可维护性
 */

import { Message, Notification } from "@arco-design/web-react";
import { t } from "i18next";

/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',      // 输入验证错误
  API = 'API',                    // API调用错误
  NETWORK = 'NETWORK',            // 网络错误
  TIMEOUT = 'TIMEOUT',            // 超时错误
  NOT_FOUND = 'NOT_FOUND',        // 资源未找到
  PERMISSION = 'PERMISSION',      // 权限错误
  CONFIG = 'CONFIG',              // 配置错误
  UNKNOWN = 'UNKNOWN',            // 未知错误
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 应用错误类 - 提供结构化的错误信息
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly details: Record<string, unknown> | undefined;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;
  public readonly originalCause: Error | undefined;

  constructor(options: {
    message: string;
    type?: ErrorType | undefined;
    severity?: ErrorSeverity | undefined;
    code?: string | undefined;
    details?: Record<string, unknown> | undefined;
    recoverable?: boolean | undefined;
    cause?: Error | undefined;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.type = options.type ?? ErrorType.UNKNOWN;
    this.severity = options.severity ?? ErrorSeverity.ERROR;
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.details = options.details;
    this.timestamp = new Date();
    this.recoverable = options.recoverable ?? false;

    // 保留原始错误
    if (options.cause) {
      this.originalCause = options.cause;
    }

    // 确保 instanceof 正确工作
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 创建验证错误
   */
  static validation(
    message: string,
    details?: Record<string, unknown>
  ): AppError {
    return new AppError({
      message,
      type: ErrorType.VALIDATION,
      severity: ErrorSeverity.WARNING,
      code: 'VALIDATION_ERROR',
      details,
      recoverable: true,
    });
  }

  /**
   * 创建API错误
   */
  static api(
    message: string,
    code?: string,
    details?: Record<string, unknown>,
    cause?: Error
  ): AppError {
    return new AppError({
      message,
      type: ErrorType.API,
      severity: ErrorSeverity.ERROR,
      code: code ?? 'API_ERROR',
      details,
      recoverable: true,
      cause,
    });
  }

  /**
   * 创建网络错误
   */
  static network(message: string, cause?: Error): AppError {
    return new AppError({
      message,
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.ERROR,
      code: 'NETWORK_ERROR',
      recoverable: true,
      cause,
    });
  }

  /**
   * 创建超时错误
   */
  static timeout(operation: string, timeoutMs: number): AppError {
    return new AppError({
      message: `操作 "${operation}" 超时 (${timeoutMs}ms)`,
      type: ErrorType.TIMEOUT,
      severity: ErrorSeverity.WARNING,
      code: 'TIMEOUT_ERROR',
      details: { operation, timeoutMs },
      recoverable: true,
    });
  }

  /**
   * 创建未找到错误
   */
  static notFound(resource: string, identifier?: string): AppError {
    return new AppError({
      message: identifier
        ? `未找到 ${resource}: ${identifier}`
        : `未找到 ${resource}`,
      type: ErrorType.NOT_FOUND,
      severity: ErrorSeverity.WARNING,
      code: 'NOT_FOUND',
      details: { resource, identifier },
      recoverable: true,
    });
  }

  /**
   * 创建配置错误
   */
  static config(message: string, details?: Record<string, unknown>): AppError {
    return new AppError({
      message,
      type: ErrorType.CONFIG,
      severity: ErrorSeverity.CRITICAL,
      code: 'CONFIG_ERROR',
      details,
      recoverable: false,
    });
  }

  /**
   * 序列化错误信息
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      recoverable: this.recoverable,
      stack: this.stack,
      cause: this.originalCause?.message,
    };
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    // 如果有国际化键，使用国际化消息
    const i18nKey = `errors.${this.code}`;
    const i18nMessage = t(i18nKey, { defaultValue: '' });
    
    if (i18nMessage) {
      return i18nMessage;
    }

    // 否则返回原始消息
    return this.message;
  }
}

/**
 * 错误处理器配置
 */
interface ErrorHandlerConfig {
  showNotification: boolean;
  showMessage: boolean;
  logToConsole: boolean;
  rethrow: boolean;
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  showNotification: false,
  showMessage: true,
  logToConsole: true,
  rethrow: false,
};

/**
 * 错误处理器 - 统一处理错误的中心点
 */
export class ErrorHandler {
  private static errorLog: AppError[] = [];
  private static maxLogSize = 100;

  /**
   * 处理错误
   */
  static handle(
    error: unknown,
    config: Partial<ErrorHandlerConfig> = {}
  ): AppError {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    // 转换为 AppError
    const appError = this.normalizeError(error);

    // 记录错误
    this.logError(appError, mergedConfig.logToConsole);

    // 显示通知
    if (mergedConfig.showNotification && appError.severity === ErrorSeverity.CRITICAL) {
      this.showNotification(appError);
    }

    // 显示消息
    if (mergedConfig.showMessage) {
      this.showMessage(appError);
    }

    // 是否重新抛出
    if (mergedConfig.rethrow) {
      throw appError;
    }

    return appError;
  }

  /**
   * 将任意错误转换为 AppError
   */
  private static normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError({
        message: error.message,
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.ERROR,
        code: 'UNKNOWN_ERROR',
        cause: error,
      });
    }

    if (typeof error === 'string') {
      return new AppError({
        message: error,
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.ERROR,
        code: 'UNKNOWN_ERROR',
      });
    }

    return new AppError({
      message: '发生未知错误',
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.ERROR,
      code: 'UNKNOWN_ERROR',
      details: { originalError: error },
    });
  }

  /**
   * 记录错误
   */
  private static logError(error: AppError, logToConsole: boolean): void {
    // 添加到内存日志
    this.errorLog.unshift(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop();
    }

    // 控制台输出
    if (logToConsole) {
      const logMethod = error.severity === ErrorSeverity.CRITICAL 
        ? console.error 
        : error.severity === ErrorSeverity.WARNING 
          ? console.warn 
          : console.log;

      logMethod(`[${error.type}] ${error.code}:`, error.message, error.details);
    }
  }

  /**
   * 显示通知
   */
  private static showNotification(error: AppError): void {
    Notification.error({
      title: t('error'),
      content: error.getUserMessage(),
      duration: 5000,
    });
  }

  /**
   * 显示消息提示
   */
  private static showMessage(error: AppError): void {
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.ERROR) {
      Message.error(error.getUserMessage());
    } else if (error.severity === ErrorSeverity.WARNING) {
      Message.warning(error.getUserMessage());
    }
  }

  /**
   * 获取错误日志
   */
  static getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * 清除错误日志
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * 创建安全执行包装器
   */
  static safe<T>(
    fn: () => T | Promise<T>,
    fallback?: T,
    config?: Partial<ErrorHandlerConfig>
  ): Promise<T | undefined> {
    return Promise.resolve()
      .then(() => fn())
      .catch((error) => {
        this.handle(error, config);
        return fallback;
      });
  }
}

/**
 * 便捷函数 - 快速处理错误
 */
export function handleError(
  error: unknown,
  config?: Partial<ErrorHandlerConfig>
): AppError {
  return ErrorHandler.handle(error, config);
}

/**
 * 便捷函数 - 安全执行
 */
export function safeExecute<T>(
  fn: () => T | Promise<T>,
  fallback?: T,
  config?: Partial<ErrorHandlerConfig>
): Promise<T | undefined> {
  return ErrorHandler.safe(fn, fallback, config);
}

/**
 * 全局错误监听器设置
 */
export function setupGlobalErrorHandlers(): void {
  // 处理未捕获的 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    
    // 排除 ResizeObserver 错误 (已知的 Chrome bug)
    if (event.reason?.message?.includes('ResizeObserver')) {
      return;
    }

    ErrorHandler.handle(event.reason, {
      showNotification: true,
      showMessage: true,
    });
  });

  // 处理全局错误
  window.addEventListener('error', (event) => {
    event.preventDefault();
    
    // 排除 ResizeObserver 错误
    if (event.message?.includes('ResizeObserver')) {
      return;
    }

    ErrorHandler.handle(
      new Error(`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`),
      {
        showNotification: true,
        showMessage: true,
      }
    );
  });
}
