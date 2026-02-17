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
        // 尽可能把返回体里的 error 信息带上，便于定位问题
        let bodyText = '';
        try {
            bodyText = await res.text();
        } catch {
            bodyText = '';
        }

        let extraMessage = '';
        if (bodyText) {
            try {
                // 尝试解析为 JSON（rclone 常见错误结构：{ error, input, path, status }
                const json = JSON.parse(bodyText) as { error?: unknown };
                if (typeof json?.error === 'string' && json.error.trim()) {
                    extraMessage = json.error;
                } else {
                    extraMessage = JSON.stringify(json);
                }
            } catch {
                // 非 JSON：直接附加原文本
                extraMessage = bodyText;
            }
        }

        const message = [
            `HTTP ${res.status}: `,
            extraMessage ? `Rclone: ${extraMessage}` : '',
        ].filter(Boolean).join('\n');

        console.error(`Rclone API HTTP error [${method}]: ${res.status} ${res.statusText} for ${fullPath}`);
        throw new Error(message);
    }

    // 解析 JSON 响应
    try {
        const data = await res.json();
        return data as RcloneApiResponse;
    } catch (e) {
        // 如果不是 JSON，返回空对象
        return {} as RcloneApiResponse;
    }
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
            const text = await error.text();
            if (text) {
                try {
                    const errorData = JSON.parse(text) as { error?: unknown };
                    if (typeof errorData?.error === 'string' && errorData.error.trim()) {
                        errorMessage += `\n${errorData.error}`;
                    } else {
                        errorMessage += `\n${JSON.stringify(errorData)}`;
                    }
                } catch {
                    errorMessage += `\n${text}`;
                }
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
        Message.error(errorMessage);
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
