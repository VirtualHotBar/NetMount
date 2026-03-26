import { Message } from '@arco-design/web-react'
import { rcloneInfo } from '../../services/rclone'
import { nmConfig } from '../../services/config'

// API 响应接口
interface RcloneApiResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// 异步任务默认配置
const ASYNC_TASK_DEFAULTS = {
  pollInterval: 1000, // 轮询间隔 1 秒
  timeout: 0, // 默认不超时
}

/**
 * 获取 Rclone API 请求头
 */
const getRcloneApiHeaders = () => {
  return {
    Authorization: `Basic ${btoa(`${nmConfig.framework.rclone.user}:${nmConfig.framework.rclone.password}`)}`,
    'Content-Type': 'application/json',
  }
}

/**
 * 构建完整 API URL
 */
function buildApiUrl(path: string): string {
  return `${rcloneInfo.endpoint.url}${path}`
}

/**
 * 统一处理 API 响应
 */
async function handleApiResponse(
  res: Response,
  fullPath: string,
  method: string
): Promise<RcloneApiResponse> {
  // 检查 HTTP 状态
  if (!res.ok) {
    // 尽可能把返回体里的 error 信息带上，便于定位问题
    let bodyText = ''
    try {
      bodyText = await res.text()
    } catch {
      bodyText = ''
    }

    let extraMessage = ''
    if (bodyText) {
      try {
        // 尝试解析为 JSON（rclone 常见错误结构：{ error, input, path, status }
        const json = JSON.parse(bodyText) as { error?: unknown }
        if (typeof json?.error === 'string' && json.error.trim()) {
          extraMessage = json.error
        } else {
          extraMessage = JSON.stringify(json)
        }
      } catch {
        // 非 JSON：直接附加原文本
        extraMessage = bodyText
      }
    }

    const message = [`HTTP ${res.status}: `, extraMessage ? `Rclone: ${extraMessage}` : '']
      .filter(Boolean)
      .join('\n')

    console.error(
      `Rclone API HTTP error [${method}]: ${res.status} ${res.statusText} for ${fullPath}`
    )
    throw new Error(message)
  }

  // 解析 JSON 响应
  try {
    const data = await res.json()
    return data as RcloneApiResponse
  } catch (e) {
    // 如果不是 JSON，返回空对象
    return {} as RcloneApiResponse
  }
}

/**
 * 打印错误信息
 */
async function printError(error: Error | Response): Promise<void> {
  console.error('Rclone API Error:', error)

  let errorMessage = ''

  if (error instanceof Response) {
    if (error.status) {
      errorMessage += `HTTP ${error.status} - ${error.statusText}\n`
    }
    try {
      const text = await error.text()
      if (text) {
        try {
          const errorData = JSON.parse(text) as { error?: unknown }
          if (typeof errorData?.error === 'string' && errorData.error.trim()) {
            errorMessage += `\n${errorData.error}`
          } else {
            errorMessage += `\n${JSON.stringify(errorData)}`
          }
        } catch {
          errorMessage += `\n${text}`
        }
      }
    } catch {
      // 忽略 JSON 解析错误
    }
  } else if (error instanceof Error) {
    errorMessage = error.message
  } else {
    errorMessage = String(error)
  }

  if (errorMessage) {
    Message.error(errorMessage)
  }
}

/**
 * Rclone API Ping 检查
 */
async function rclone_api_noop(): Promise<boolean> {
  try {
    const url = buildApiUrl('/rc/noop')
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: getRcloneApiHeaders().Authorization },
    })
    return res.ok
  } catch (e) {
    console.log('Rclone ping failed:', e)
    return false
  }
}

/**
 * Rclone API POST 请求
 */
async function rclone_api_post(
  path: string,
  bodyData: object = {},
  ignoreError?: boolean
): Promise<RcloneApiResponse | undefined> {
  const fullPath = buildApiUrl(path)

  try {
    const res = await fetch(fullPath, {
      method: 'POST',
      headers: getRcloneApiHeaders(),
      body: JSON.stringify(bodyData),
    })

    const data = await handleApiResponse(res, fullPath, 'POST')
    return data
  } catch (error) {
    if (!ignoreError) {
      await printError(error as Error | Response)
    }
    return undefined
  }
}

/**
 * Rclone API GET 请求
 */
async function rclone_api_get(
  path: string,
  ignoreError?: boolean
): Promise<RcloneApiResponse | undefined> {
  const fullPath = buildApiUrl(path)

  try {
    const res = await fetch(fullPath, {
      method: 'GET',
      headers: getRcloneApiHeaders(),
    })

    const data = await handleApiResponse(res, fullPath, 'GET')
    return data
  } catch (error) {
    if (!ignoreError) {
      await printError(error as Error | Response)
    }
    return undefined
  }
}

// 异步任务响应接口
interface AsyncJobResponse {
  jobid: number
}

// 任务状态响应接口
interface JobStatusResponse {
  jobid: number
  finished: boolean
  success: boolean
  error?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output?: any
}

/**
 * 启动异步任务
 * @param path API 路径
 * @param bodyData 请求体数据
 * @param ignoreError 是否忽略错误
 * @returns 返回 jobid 或 undefined
 */
async function rclone_api_post_async(
  path: string,
  bodyData: object = {},
  ignoreError?: boolean
): Promise<number | undefined> {
  const fullPath = buildApiUrl(path)

  try {
    const res = await fetch(fullPath, {
      method: 'POST',
      headers: getRcloneApiHeaders(),
      body: JSON.stringify({ ...bodyData, _async: true }),
    })

    const data = await handleApiResponse(res, fullPath, 'POST')
    return (data as AsyncJobResponse)?.jobid
  } catch (error) {
    if (!ignoreError) {
      await printError(error as Error | Response)
    }
    return undefined
  }
}

/**
 * 查询任务状态
 * @param jobid 任务 ID
 * @param ignoreError 是否忽略错误
 * @returns 任务状态
 */
async function rclone_api_job_status(
  jobid: number,
  ignoreError?: boolean
): Promise<JobStatusResponse | undefined> {
  const fullPath = buildApiUrl('/job/status')

  try {
    const res = await fetch(fullPath, {
      method: 'POST',
      headers: getRcloneApiHeaders(),
      body: JSON.stringify({ jobid }),
    })

    const data = await handleApiResponse(res, fullPath, 'POST')
    return data as JobStatusResponse
  } catch (error) {
    if (!ignoreError) {
      await printError(error as Error | Response)
    }
    return undefined
  }
}

/**
 * 等待异步任务完成
 * @param jobid 任务 ID
 * @param pollInterval 轮询间隔（毫秒），默认 1000ms
 * @param timeout 超时时间（毫秒），默认 0 表示不超时
 * @param signal 用于取消任务的 AbortSignal
 * @returns 任务是否成功完成
 */
async function rclone_api_wait_for_job(
  jobid: number,
  pollInterval: number = ASYNC_TASK_DEFAULTS.pollInterval,
  timeout: number = ASYNC_TASK_DEFAULTS.timeout,
  signal?: AbortSignal
): Promise<boolean> {
  const startTime = Date.now()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // 检查是否被取消
    if (signal?.aborted) {
      console.log(`Job ${jobid} was cancelled`)
      // 尝试停止任务
      await rclone_api_post('/job/stop', { jobid }, true).catch(() => {
        // 忽略停止任务时的错误
      })
      return false
    }

    const status = await rclone_api_job_status(jobid, true)

    if (!status) {
      console.error(`Failed to get job status for jobid: ${jobid}`)
      return false
    }

    if (status.finished) {
      if (status.success) {
        console.log(`Job ${jobid} completed successfully`)
        return true
      } else {
        const errorMsg = status.error || 'Unknown error'
        console.error(`Job ${jobid} failed: ${errorMsg}`)
        Message.error(`Task failed: ${errorMsg}`)
        return false
      }
    }

    // 检查超时
    if (timeout > 0 && Date.now() - startTime > timeout) {
      console.error(`Job ${jobid} timed out`)
      Message.error('Task timed out')
      // 尝试停止超时的任务
      await rclone_api_post('/job/stop', { jobid }, true).catch(() => {
        // 忽略停止任务时的错误
      })
      return false
    }

    // 等待后再次查询，同时监听取消信号
    await Promise.race([
      new Promise(resolve => setTimeout(resolve, pollInterval)),
      new Promise((_, reject) => {
        if (signal) {
          signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true })
        }
      }),
    ]).catch(() => {
      // 被取消时会抛出错误，继续循环处理取消逻辑
    })
  }
}

/**
 * 执行异步任务并等待完成（封装了启动和等待过程）
 * @param path API 路径
 * @param bodyData 请求体数据
 * @param pollInterval 轮询间隔（毫秒），默认使用 ASYNC_TASK_DEFAULTS.pollInterval
 * @param timeout 超时时间（毫秒），默认使用 ASYNC_TASK_DEFAULTS.timeout
 * @param signal 用于取消任务的 AbortSignal
 * @returns 任务是否成功完成
 */
async function rclone_api_exec_async(
  path: string,
  bodyData: object = {},
  pollInterval: number = ASYNC_TASK_DEFAULTS.pollInterval,
  timeout: number = ASYNC_TASK_DEFAULTS.timeout,
  signal?: AbortSignal
): Promise<boolean> {
  const jobid = await rclone_api_post_async(path, bodyData, true)

  if (jobid === undefined) {
    console.error(`Failed to start async job for ${path}`)
    return false
  }

  console.log(`Started async job ${jobid} for ${path}`)
  return await rclone_api_wait_for_job(jobid, pollInterval, timeout, signal)
}

export {
  rclone_api_post,
  rclone_api_get,
  getRcloneApiHeaders,
  rclone_api_noop,
  rclone_api_post_async,
  rclone_api_job_status,
  rclone_api_wait_for_job,
  rclone_api_exec_async,
}
export type { RcloneApiResponse, AsyncJobResponse, JobStatusResponse }
