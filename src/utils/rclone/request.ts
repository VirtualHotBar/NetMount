import { getRuntime } from '../../runtime/port'
import { rcloneInfo } from '../../services/rclone'
import { logger } from '../../services/LoggerService'
import { buildApiUrl, getRcloneApiHeaders, handleApiResponse } from './httpClient'
import {
  JobStatusResponse,
  isAsyncJobResponse,
  isJobStatusResponse,
} from '../../type/rclone/api'

interface RcloneApiResponse {
  [key: string]: unknown
}

const ASYNC_TASK_DEFAULTS = {
  pollInterval: 1000,
  timeout: 0,
}

async function printError(error: Error | Response): Promise<void> {
  logger.error('Rclone API Error:', error instanceof Error ? error : undefined, 'RcloneAPI', { error })

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
      // ignore
    }
  } else if (error instanceof Error) {
    errorMessage = error.message
  } else {
    errorMessage = String(error)
  }

  if (errorMessage) {
    getRuntime().notify('error', errorMessage)
  }
}

async function rclone_api_noop(): Promise<boolean> {
  try {
    const url = buildApiUrl(rcloneInfo.endpoint.url, '/rc/noop')
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: getRcloneApiHeaders().Authorization },
    })
    return res.ok
  } catch (e) {
    logger.debug('Rclone ping failed', 'Rclone', { error: e })
    return false
  }
}

async function rclone_api_post(
  path: string,
  bodyData: object = {},
  ignoreError?: boolean
): Promise<RcloneApiResponse | undefined> {
  const fullPath = buildApiUrl(rcloneInfo.endpoint.url, path)

  try {
    const res = await fetch(fullPath, {
      method: 'POST',
      headers: getRcloneApiHeaders(),
      body: JSON.stringify(bodyData),
    })

    const data = await handleApiResponse(res)
    return data
  } catch (error) {
    if (!ignoreError) {
      await printError(error as Error | Response)
    }
    return undefined
  }
}

async function rclone_api_get(
  path: string,
  ignoreError?: boolean
): Promise<RcloneApiResponse | undefined> {
  const fullPath = buildApiUrl(rcloneInfo.endpoint.url, path)

  try {
    const res = await fetch(fullPath, {
      method: 'GET',
      headers: getRcloneApiHeaders(),
    })

    const data = await handleApiResponse(res)
    return data
  } catch (error) {
    if (!ignoreError) {
      await printError(error as Error | Response)
    }
    return undefined
  }
}

async function rclone_api_post_async(
  path: string,
  bodyData: object = {},
  ignoreError?: boolean
): Promise<number | undefined> {
  const fullPath = buildApiUrl(rcloneInfo.endpoint.url, path)

  try {
    const res = await fetch(fullPath, {
      method: 'POST',
      headers: getRcloneApiHeaders(),
      body: JSON.stringify({ ...bodyData, _async: true }),
    })

    const data = await handleApiResponse(res)
    
    if (!isAsyncJobResponse(data)) {
      logger.error('Invalid async job response format', undefined, 'RcloneAPI', { data })
      return undefined
    }
    
    return data.jobid
  } catch (error) {
    if (!ignoreError) {
      await printError(error as Error | Response)
    }
    return undefined
  }
}

async function rclone_api_job_status(
  jobid: number,
  ignoreError?: boolean
): Promise<JobStatusResponse | undefined> {
  const fullPath = buildApiUrl(rcloneInfo.endpoint.url, '/job/status')

  try {
    const res = await fetch(fullPath, {
      method: 'POST',
      headers: getRcloneApiHeaders(),
      body: JSON.stringify({ jobid }),
    })

    const data = await handleApiResponse(res)
    
    if (!isJobStatusResponse(data)) {
      logger.error('Invalid job status response format', undefined, 'RcloneAPI', { data, jobid })
      return undefined
    }
    
    return data
  } catch (error) {
    if (!ignoreError) {
      await printError(error as Error | Response)
    }
    return undefined
  }
}

async function rclone_api_wait_for_job(
  jobid: number,
  pollInterval: number = ASYNC_TASK_DEFAULTS.pollInterval,
  timeout: number = ASYNC_TASK_DEFAULTS.timeout,
  signal?: AbortSignal
): Promise<boolean> {
  const startTime = Date.now()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) {
      logger.debug(`Job ${jobid} was cancelled`, 'Rclone')
      await rclone_api_post('/job/stop', { jobid }, true).catch(() => {})
      return false
    }

    const status = await rclone_api_job_status(jobid, true)

    if (!status) {
      logger.error(`Failed to get job status for jobid: ${jobid}`)
      return false
    }

    if (status.finished) {
      if (status.success) {
        logger.debug(`Job ${jobid} completed successfully`, 'Rclone')
        return true
      } else {
        const errorMsg = status.error || 'Unknown error'
        logger.error(`Job ${jobid} failed: ${errorMsg}`)
        getRuntime().notify('error', `Task failed: ${errorMsg}`)
        return false
      }
    }

    if (timeout > 0 && Date.now() - startTime > timeout) {
      logger.error(`Job ${jobid} timed out`, undefined, 'Rclone')
      getRuntime().notify('error', 'Task timed out')
      await rclone_api_post('/job/stop', { jobid }, true).catch(() => {})
      return false
    }

    await Promise.race([
      new Promise(resolve => setTimeout(resolve, pollInterval)),
      new Promise((_, reject) => {
        if (signal) {
          signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true })
        }
      }),
    ]).catch(() => {})
  }
}

async function rclone_api_exec_async(
  path: string,
  bodyData: object = {},
  pollInterval: number = ASYNC_TASK_DEFAULTS.pollInterval,
  timeout: number = ASYNC_TASK_DEFAULTS.timeout,
  signal?: AbortSignal
): Promise<boolean> {
  const jobid = await rclone_api_post_async(path, bodyData, true)

  if (jobid === undefined) {
    logger.error(`Failed to start async job for ${path}`)
    return false
  }

  logger.debug(`Started async job ${jobid} for ${path}`, 'Rclone')
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
export type { RcloneApiResponse }
