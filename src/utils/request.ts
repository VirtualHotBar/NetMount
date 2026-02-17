/**
 * HTTP 请求工具 - 提供超时、重试、请求拦截等功能
 * 增强网络请求的健壮性
 */

import { AppError, ErrorType } from './error';
import {
  API_TIMEOUT,
  RETRY_CONFIG,
} from './constants';

// ============================================
// 类型定义
// ============================================

/**
 * 请求配置
 */
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryOnTimeout?: boolean;
  abortSignal?: AbortSignal;
  headers?: Record<string, string>;
}

/**
 * 请求响应
 */
export interface RequestResult<T> {
  success: boolean;
  data?: T;
  error?: AppError;
  attempts: number;
  duration: number;
}

/**
 * 重试策略类型
 */
export type RetryStrategy = 'fixed' | 'exponential' | 'linear';

// ============================================
// 工具函数
// ============================================

/**
 * 计算重试延迟 (带抖动)
 */
function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
  multiplier: number,
  maxDelay: number,
  jitterRange: number,
  strategy: RetryStrategy
): number {
  let delay: number;

  switch (strategy) {
    case 'exponential':
      delay = baseDelay * Math.pow(multiplier, attempt);
      break;
    case 'linear':
      delay = baseDelay * (attempt + 1);
      break;
    case 'fixed':
    default:
      delay = baseDelay;
  }

  // 限制最大延迟
  delay = Math.min(delay, maxDelay);

  // 添加随机抖动 (±jitterRange/2)
  const jitter = (Math.random() - 0.5) * jitterRange;
  delay = Math.max(0, Math.round(delay + jitter));

  return delay;
}

/**
 * 判断是否应该重试
 */
function shouldRetry(error: unknown, retryOnTimeout: boolean, attempt: number, maxAttempts: number): boolean {
  if (attempt >= maxAttempts) {
    return false;
  }

  // 超时错误且不允许重试
  if (!retryOnTimeout && error instanceof AppError && error.type === ErrorType.TIMEOUT) {
    return false;
  }

  // 网络错误通常可以重试
  if (error instanceof AppError) {
    const retryableTypes = [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.API,
    ];
    return retryableTypes.includes(error.type);
  }

  // 其他错误默认可以重试
  return true;
}

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
}

// ============================================
// 主请求函数
// ============================================

/**
 * 增强型 fetch 请求 - 支持超时、重试、AbortSignal
 * 
 * @param url - 请求 URL
 * @param options - Fetch 选项
 * @param config - 请求配置 (超时、重试等)
 * @returns 请求结果
 */
export async function robustFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
  config: RequestConfig = {}
): Promise<RequestResult<T>> {
  const {
    timeout = API_TIMEOUT.DEFAULT,
    retries = RETRY_CONFIG.MAX_ATTEMPTS,
    retryDelay = RETRY_CONFIG.INITIAL_DELAY,
    retryOnTimeout = true,
    abortSignal,
    headers = {},
  } = config;

  const startTime = Date.now();
  let lastError: AppError | undefined;
  let attempts = 0;

  try {
    // 重试循环
    while (attempts < retries) {
      attempts++;

      try {
        // 如果外部已取消，直接终止
        if (abortSignal?.aborted) {
          lastError = AppError.network('请求被中止');
          break;
        }

        const controller = new AbortController();

        // 超时控制（每次尝试独立计时）
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // 监听外部 abort
        const onAbort = () => {
          controller.abort();
        };
        abortSignal?.addEventListener('abort', onAbort);

        // 合并 headers：默认值 < options.headers < config.headers
        const mergedHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...normalizeHeaders(options.headers),
          ...headers,
        };

        let response: Response;
        try {
          response = await fetch(url, {
            ...options,
            headers: mergedHeaders,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
          abortSignal?.removeEventListener('abort', onAbort);
        }

        // 检查 HTTP 状态
        if (!response.ok) {
          throw AppError.api(
            `HTTP ${response.status}: ${response.statusText}`,
            `HTTP_${response.status}`,
            { url, status: response.status }
          );
        }

        // 解析 JSON
        const data = await response.json() as T;

        return {
          success: true,
          data,
          attempts,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        // 如果是AbortError，检查是否超时
        if (error instanceof DOMException && error.name === 'AbortError') {
          // 外部 abort 或超时都会触发 AbortError；优先认为外部取消不可重试
          if (abortSignal?.aborted) {
            lastError = AppError.network('请求被中止');
          } else {
            lastError = AppError.timeout(url, timeout);
          }
        } else if (error instanceof AppError) {
          lastError = error;
        } else if (error instanceof Error) {
          lastError = AppError.network(error.message, error);
        } else {
          lastError = AppError.api(String(error), 'UNKNOWN_ERROR');
        }

        // 外部取消：不再重试
        if (abortSignal?.aborted) {
          break;
        }

        // 判断是否应该重试
        if (!shouldRetry(lastError, retryOnTimeout, attempts, retries)) {
          break;
        }

        // 计算并等待延迟
        const delay = calculateRetryDelay(
          attempts - 1,
          retryDelay,
          RETRY_CONFIG.BACKOFF_MULTIPLIER,
          RETRY_CONFIG.MAX_DELAY,
          RETRY_CONFIG.JITTER_RANGE,
          'exponential'
        );

        console.warn(
          `[Request] Attempt ${attempts}/${retries} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // 所有重试都失败了
    return {
      success: false,
      error: lastError ?? AppError.api('请求失败', 'REQUEST_FAILED'),
      attempts,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof AppError
        ? error
        : AppError.api(String(error), 'UNKNOWN_ERROR'),
      attempts,
      duration: Date.now() - startTime,
    };
  }
}

// ============================================
// 便捷方法
// ============================================

/**
 * GET 请求
 */
export async function robustGet<T = unknown>(
  url: string,
  config?: RequestConfig
): Promise<RequestResult<T>> {
  return robustFetch<T>(url, { method: 'GET' }, config);
}

/**
 * POST 请求
 */
export async function robustPost<T = unknown>(
  url: string,
  body?: unknown,
  config?: RequestConfig
): Promise<RequestResult<T>> {
  return robustFetch<T>(url, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  }, config);
}

/**
 * DELETE 请求
 */
export async function robustDelete<T = unknown>(
  url: string,
  config?: RequestConfig
): Promise<RequestResult<T>> {
  return robustFetch<T>(url, { method: 'DELETE' }, config);
}

// ============================================
// 专用请求工具
// ============================================

/**
 * 带超时的单次请求
 * 
 * @param url - 请求 URL
 * @param options - Fetch 选项
 * @param timeoutMs - 超时时间 (毫秒)
 * @returns 响应数据或抛出错误
 */
export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = API_TIMEOUT.DEFAULT
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw AppError.api(
        `HTTP ${response.status}: ${response.statusText}`,
        `HTTP_${response.status}`,
        { url }
      );
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw AppError.timeout(url, timeoutMs);
    }
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Error) {
      throw AppError.network(error.message, error);
    }
    throw AppError.api(String(error), 'FETCH_FAILED');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 可取消的请求包装器
 * 
 * @param url - 请求 URL
 * @param options - Fetch 选项
 * @returns { abort, promise } - abort 函数和 promise
 */
export function cancellableFetch<T>(
  url: string,
  options: RequestInit = {}
): { abort: () => void; promise: Promise<T> } {
  const controller = new AbortController();
  const promise = fetchWithTimeout<T>(url, {
    ...options,
    signal: controller.signal,
  });

  return {
    abort: () => controller.abort(),
    promise,
  };
}

/**
 * 并发请求控制器
 * 
 * @param requests - 请求列表
 * @param concurrency - 并发数量
 * @returns 所有请求结果
 */
export async function concurrentFetch<T>(
  requests: Array<() => Promise<T>>,
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = new Array(requests.length);
  const executing = new Set<Promise<void>>();

  for (let i = 0; i < requests.length; i++) {
    const request = requests[i]!;
    const promise = (async () => {
      results[i] = await request();
    })();

    executing.add(promise);
    promise.finally(() => executing.delete(promise));

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
