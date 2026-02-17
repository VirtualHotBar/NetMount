import { Message } from "@arco-design/web-react";
import { rcloneInfo } from "../../services/rclone";
import { nmConfig } from "../../services/config";

// API 响应接口
interface RcloneApiResponse {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

/**
 * 获取 Rclone API 请求头
 */
const getRcloneApiHeaders = () => {
    return {
        Authorization: `Basic ${btoa(`${nmConfig.framework.rclone.user}:${nmConfig.framework.rclone.password}`)}`,
        'Content-Type': 'application/json'
    }
};

/**
 * 构建完整 API URL
 */
function buildApiUrl(path: string): string {
    return `${rcloneInfo.endpoint.url}${path}`;
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
        console.error(`Rclone API HTTP error [${method}]: ${res.status} ${res.statusText} for ${fullPath}`);
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    // 解析 JSON
    let data: RcloneApiResponse;
    try {
        return await fetch(rcloneInfo.endpoint.url + '/rc/noop', { 
            method: 'POST', 
            headers: getRcloneApiHeaders(),
            body: '{}'
        }).then(data => data.ok)
    } catch (e) {
        console.log(e)
        return false;
    }

    return data;
}

/**
 * 打印错误信息
 */
async function printError(error: Error | Response): Promise<void> {
    console.error('Rclone API Error:', error);

    let errorMessage = '';

    if (error instanceof Response) {
        if (error.status) {
            errorMessage += `HTTP ${error.status} - ${error.statusText}\n`;
        }
        try {
            const errorData = await error.json();
            if (errorData.error) {
                errorMessage += `\n${errorData.error}`;
            }
        } catch {
            // 忽略 JSON 解析错误
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    } else {
        errorMessage = String(error);
    }

    if (errorMessage) {
        Message.error(`Error: ${errorMessage}`);
    }
}

/**
 * Rclone API Ping 检查
 */
async function rclone_api_noop(): Promise<boolean> {
    try {
        const url = buildApiUrl('/rc/noop');
        const res = await fetch(url, {
            method: 'POST',
            headers: { Authorization: getRcloneApiHeaders().Authorization }
        });
        return res.ok;
    } catch (e) {
        console.log('Rclone ping failed:', e);
        return false;
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
    const fullPath = buildApiUrl(path);

    try {
        const res = await fetch(fullPath, {
            method: 'POST',
            headers: getRcloneApiHeaders(),
            body: JSON.stringify(bodyData)
        });

        const data = await handleApiResponse(res, fullPath, 'POST');
        return data;
    } catch (error) {
        if (!ignoreError) {
            await printError(error as Error | Response);
        }
        return undefined;
    }
}

/**
 * Rclone API GET 请求
 */
async function rclone_api_get(
    path: string,
    ignoreError?: boolean
): Promise<RcloneApiResponse | undefined> {
    const fullPath = buildApiUrl(path);

    try {
        const res = await fetch(fullPath, {
            method: 'GET',
            headers: getRcloneApiHeaders()
        });

        const data = await handleApiResponse(res, fullPath, 'GET');
        return data;
    } catch (error) {
        if (!ignoreError) {
            await printError(error as Error | Response);
        }
        return undefined;
    }
}

export { rclone_api_post, rclone_api_get, getRcloneApiHeaders, rclone_api_noop };
export type { RcloneApiResponse };