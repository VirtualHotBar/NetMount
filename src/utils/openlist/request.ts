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
        const res = await fetch(url, { method: 'GET' });
        return res.ok;
    } catch (e) {
        console.log('OpenList ping failed:', e);
        return false;
    }
}

/**
 * OpenList API GET 请求
 */
async function openlist_api_get(path: string, queryData?: object): Promise<ApiResponse> {
    const fullPath = buildFullPath(path, queryData);

    return wrapApiCall(async () => {
        const res = await fetch(fullPath, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'Authorization': openlistInfo.endpoint.auth.token,
            },
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
        const res = await fetch(fullPath, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Authorization': openlistInfo.endpoint.auth.token,
                'Content-Type': 'application/json'
            },
            body: bodyData ? JSON.stringify(bodyData) : null,
        });
        return handleApiResponse(res, fullPath, 'POST');
    }, fullPath, 'POST');
}

export { openlist_api_get, openlist_api_post, openlist_api_ping };
export type { ApiResponse };