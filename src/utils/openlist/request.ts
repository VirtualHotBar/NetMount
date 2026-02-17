import { openlistInfo } from "../../services/openlist";

// API 响应接口
interface ApiResponse {
    code?: number;
    message?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

/**
 * 构建完整 URL（包含查询参数）
 */
function buildFullPath(path: string, queryData?: object): string {
    const searchParams = new URLSearchParams();
    if (queryData) {
        Object.entries(queryData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });
    }
    const queryString = searchParams.toString();
    return `${openlistInfo.endpoint.url}${path}${queryString ? '?' + queryString : ''}`;
}

/**
 * 统一处理 API 响应
 */
async function handleApiResponse(
    res: Response, 
    fullPath: string, 
    method: string
): Promise<ApiResponse> {
    // 检查 HTTP 状态
    if (!res.ok) {
        console.error(`OpenList API HTTP error [${method}]: ${res.status} ${res.statusText} for ${fullPath}`);
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    // 解析 JSON
    let data: ApiResponse;
    try {
        data = await res.json();
    } catch (parseError) {
        console.error(`OpenList API JSON parse error [${method}] for ${fullPath}:`, parseError);
        throw new Error('JSON parse error');
    }

    // 检查业务状态码
    // 注意：业务错误（code != 200）仅记录日志，不抛出异常
    // 调用方应根据返回的 code 自行处理业务错误
    if (data.code !== undefined && data.code !== 200) {
        console.error(`OpenList API business error [${method}]: code=${data.code}, message=${data.message}, path=${fullPath}`);
    }

    return data;
}

/**
 * 统一错误处理包装器
 */
async function wrapApiCall<T>(
    operation: () => Promise<T>,
    fullPath: string,
    method: string
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        console.error(`OpenList API call failed [${method}] for ${fullPath}:`, error);
        throw error;
    }
}

/**
 * OpenList API Ping 检查
 */
async function openlist_api_ping(): Promise<boolean> {
    try {
        const url = openlistInfo.endpoint.url + '/ping';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒超时
        
        const res = await fetch(url, { 
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (res.ok) {
            return true;
        }
        console.log(`OpenList ping returned status: ${res.status}`);
        return false;
    } catch (e) {
        // 只在特定情况下记录错误，避免日志刷屏
        if (e instanceof Error && e.name !== 'AbortError') {
            console.log('OpenList ping failed:', e.message);
        }
        return false;
    }
}

/**
 * OpenList API GET 请求
 */
async function openlist_api_get(path: string, queryData?: object): Promise<ApiResponse> {
    const fullPath = buildFullPath(path, queryData);

    return wrapApiCall(async () => {
        const headers: Record<string, string> = {}
        if (openlistInfo.endpoint.auth.token) {
            headers['Authorization'] = openlistInfo.endpoint.auth.token
        }
        const res = await fetch(fullPath, {
            method: 'GET',
            redirect: 'follow',
            headers,
        });
        return handleApiResponse(res, fullPath, 'GET');
    }, fullPath, 'GET');
}

/**
 * OpenList API POST 请求
 */
async function openlist_api_post(
    path: string, 
    bodyData?: object, 
    queryData?: object
): Promise<ApiResponse> {
    const fullPath = buildFullPath(path, queryData);

    return wrapApiCall(async () => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        }
        if (openlistInfo.endpoint.auth.token) {
            headers['Authorization'] = openlistInfo.endpoint.auth.token
        }
        const res = await fetch(fullPath, {
            method: 'POST',
            redirect: 'follow',
            headers,
            body: bodyData ? JSON.stringify(bodyData) : null,
        });
        return handleApiResponse(res, fullPath, 'POST');
    }, fullPath, 'POST');
}

export { openlist_api_get, openlist_api_post, openlist_api_ping };
export type { ApiResponse };
