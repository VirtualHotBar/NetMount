import { Message } from "@arco-design/web-react";
import { ParametersType } from "../../type/defaults";
import { openlist_api_post } from "../../utils/openlist/request";
import { rclone_api_post } from "../../utils/rclone/request";
import { isEmptyObject } from "../../utils/utils";
import { searchStorageInfo } from "./allList";
import { reupStorage, searchStorage } from "./storage";

/**
 * 验证存储名称
 */
function validateStorageName(name: string): string | null {
    if (!name || typeof name !== 'string') {
        return '存储名称不能为空';
    }
    if (name.trim().length === 0) {
        return '存储名称不能为空';
    }
    if (name.length > 128) {
        return '存储名称长度不能超过128字符';
    }
    // 检查非法字符
    if (/[<>:"|?*/\\]/.test(name)) {
        return '存储名称包含非法字符';
    }
    return null;
}

/**
 * 验证存储类型
 */
function validateStorageType(type: string): string | null {
    if (!type || typeof type !== 'string') {
        return '存储类型不能为空';
    }
    return null;
}

/**
 * 验证参数
 */
function validateParameters(parameters: ParametersType): string | null {
    if (!parameters || typeof parameters !== 'object') {
        return '存储参数不能为空';
    }
    return null;
}

/**
 * 统一输入验证
 */
function validateStorageInput(
    name: string, 
    type: string, 
    parameters: ParametersType
): { valid: boolean; error?: string } {
    const nameError = validateStorageName(name);
    if (nameError) return { valid: false, error: nameError };

    const typeError = validateStorageType(type);
    if (typeError) return { valid: false, error: typeError };

    const paramError = validateParameters(parameters);
    if (paramError) return { valid: false, error: paramError };

    return { valid: true };
}

async function createStorage(
    name: string, 
    type: string, 
    parameters: ParametersType, 
    exAdditional: ParametersType = {}
): Promise<boolean> {
    // 输入验证
    const validation = validateStorageInput(name, type, parameters);
    if (!validation.valid) {
        Message.error(validation.error || '输入参数无效');
        console.error('Storage validation failed:', validation.error);
        return false;
    }

    const storageInfo = searchStorageInfo(type);
    if (!storageInfo) {
        Message.error('不支持的存储类型: ' + type);
        console.error('Storage type not found:', type);
        return false;
    }

    const storage = searchStorage(name);
    let backData;

    try {
        switch (storageInfo.framework) {
            case 'rclone':
                backData = await rclone_api_post("/config/create", {
                    "name": name,
                    "type": storageInfo.type,
                    "parameters": parameters,
                    ...exAdditional
                });
                await reupStorage();
                return backData ? isEmptyObject(backData as Record<string, unknown>) : false;

            case 'openlist': {
                // 安全序列化 addition
                let serializedAddition: string;
                try {
                    serializedAddition = JSON.stringify(parameters.addition);
                } catch (e) {
                    console.error('Failed to serialize addition:', e);
                    Message.error('存储参数序列化失败');
                    return false;
                }

                const openlistParams = {
                    ...parameters,
                    addition: serializedAddition,
                    driver: storageInfo.type,
                    ...exAdditional
                };

                if (!storage) {
                    // 创建新存储
                    backData = await openlist_api_post('/api/admin/storage/create', openlistParams);
                } else {
                    // 更新现有存储
                    const storageId = storage.other?.openlist?.id;
                    if (!storageId) {
                        Message.error('无法获取存储 ID');
                        return false;
                    }
                    backData = await openlist_api_post('/api/admin/storage/update', {
                        ...openlistParams,
                        id: storageId
                    });
                }

                if (backData.code !== 200) {
                    Message.error(backData.message || '操作失败');
                    return false;
                }

                await reupStorage();
                return true;
            }

            default:
                Message.error('不支持的存储框架: ' + storageInfo.framework);
                return false;
        }
    } catch (error) {
        console.error('Storage operation failed:', error);
        Message.error('存储操作失败，请检查网络连接');
        return false;
    }
}


export { createStorage };