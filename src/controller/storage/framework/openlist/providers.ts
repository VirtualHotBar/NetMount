import { StorageInfoType, StorageParamItemType } from "../../../../type/controller/storage/info";
import { openlist_api_get } from "../../../../utils/openlist/request";

function normalizeStorageId(raw: string): string {
    return String(raw ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// 结构A：对象映射 { driverName: {config, common, additional} }
// 结构B：数组 [ {name, config, common, additional} ]

interface DriverInfo {
    name?: string;  // 数组结构中的驱动名
    config?: {
        name?: string;
    };
    common?: DriverOption[];
    additional?: DriverOption[];
}

interface DriverOption {
    name: string;
    help?: string;
    type?: string;
    required?: boolean;
    default?: unknown;
    options?: string;
}

// 检测驱动列表数据结构类型
function detectDriverListStructure(data: unknown): 'object-map' | 'array' | 'unknown' {
    if (!data) return 'unknown';

    if (Array.isArray(data)) {
        return 'array';
    }

    if (typeof data === 'object' && Object.keys(data).length > 0) {
        // 检查第一个值是否有 config/common/additional 字段
        const record = data as Record<string, unknown>;
        const firstKey = Object.keys(record)[0];
        const firstValue = record[firstKey!] as Record<string, unknown> | undefined;
        if (firstValue && (firstValue.config || firstValue.common || firstValue.additional)) {
            return 'object-map';
        }
    }

    return 'unknown';
}

// 将数组结构转换为对象映射结构
function normalizeDriverList(data: unknown): Record<string, DriverInfo> {
    const structure = detectDriverListStructure(data);
    
    if (structure === 'object-map') {
        return data as Record<string, DriverInfo>;
    }
    
    if (structure === 'array') {
        const result: Record<string, DriverInfo> = {};
        (data as DriverInfo[]).forEach((driver) => {
            const key = driver.name || driver.config?.name || 'unknown';
            result[key] = driver;
        });
        return result;
    }
    
    console.error('Unknown driver list structure:', data);
    return {};
}

// 安全获取驱动配置
function safeGetDriverConfig(provider: DriverInfo, key: string): { name?: string } {
    const defaultConfig = { name: key };
    
    if (!provider) return defaultConfig;
    
    // 容错：config 可能缺失
    if (!provider.config) {
        console.warn(`Driver ${key} missing config field, using fallback`);
        return { name: key };
    }
    
    return {
        name: provider.config.name || key
    };
}

// 安全获取驱动参数列表
function safeGetDriverOptions(provider: DriverInfo, field: 'common' | 'additional'): DriverOption[] {
    if (!provider) return [];
    
    const options = provider[field];
    
    if (!options) {
        console.warn(`Driver ${provider.name || 'unknown'} missing ${field} field`);
        return [];
    }
    
    if (!Array.isArray(options)) {
        console.warn(`Driver ${provider.name || 'unknown'} ${field} is not an array`);
        return [];
    }
    
    return options;
}

async function updateOpenlistStorageInfoList() {
    try {
        const response = await openlist_api_get('/api/admin/driver/list');
        
        if (!response.data) {
            console.error('Failed to get driver list: no data in response', response);
            return [];
        }
        
        // 归一化驱动列表（处理双结构）
        const openlistProviders = normalizeDriverList(response.data);
        const openlistStorageInfoList: StorageInfoType[] = [];
        
        // 可选：回退方案 - 如果归一化失败，尝试使用 driver/names + driver/info
        if (Object.keys(openlistProviders).length === 0) {
            console.log('Driver list normalization failed, trying fallback approach...');
            return await updateOpenlistStorageInfoListFallback();
        }

        for (const key in openlistProviders) {
            try {
                const provider = openlistProviders[key];
                
                // 容错：跳过无效的驱动数据
                if (!provider || typeof provider !== 'object') {
                    console.warn(`Skipping invalid driver data for key: ${key}`);
                    continue;
                }
                
                const config = safeGetDriverConfig(provider, key);
                const commonOptions = safeGetDriverOptions(provider, 'common');
                const additionalOptions = safeGetDriverOptions(provider, 'additional');
                
                const getStorageParams = (options: DriverOption[], prefix: string = ''): StorageParamItemType[] => {
                    const storageParams: StorageParamItemType[] = [];
                    
                    for (const option of options) {
                        // 容错：跳过无效的选项
                        if (!option || typeof option !== 'object') {
                            console.warn(`Skipping invalid option in driver ${key}`);
                            continue;
                        }
                        
                        const storageParam: StorageParamItemType = {
                            label: option.name || 'unknown',
                            name: prefix + (option.name || 'unknown'),
                            description: option.help || '',
                            type: 'string',
                            required: option.required || false,
                            default: '',
                            advanced: false,
                            isPassword: false,
                            mark: []
                        };

                        // 类型(基础)
                        let type: 'boolean' | 'number' | 'string';
                        switch (option.type) {
                            case 'bool': type = 'boolean'; break;
                            case 'number': type = 'number'; break;
                            default: type = 'string';
                        }
                        storageParam.type = type;

                        // 默认值
                        let defaultValue: string | number | boolean;
                        if (type === 'boolean') {
                            defaultValue = Boolean(option.default);
                        } else if (type === 'number') {
                            defaultValue = Number(option.default) || 0;
                        } else {
                            defaultValue = option.default !== undefined ? String(option.default) : '';
                        }
                        storageParam.default = defaultValue;

                        // 选项
                        if (option.type === 'select' && option.options) {
                            try {
                                storageParam.select = option.options.split(',').map((item: string) => {
                                    return {
                                        label: item.trim(),
                                        value: item.trim(),
                                        help: item.trim(),
                                    };
                                });
                            } catch (e) {
                                console.warn(`Failed to parse select options for ${option.name}:`, e);
                                storageParam.select = [];
                            }
                        }

                        // 为隐藏无用参数
                        if (['mount_path', 'order', 'webdav_policy', 'web_proxy', 'remark', 'order_by', 'order_direction', 'enable_sign', 'cache_expiration', 'down_proxy_url', 'extract_folder'].includes(option.name)) {
                            storageParam.hide = true;
                        }

                        // 设置webdav代理
                        if (option.name === 'webdav_policy') {
                            storageParam.default = "native_proxy"; // 本机代理
                        }

                        storageParams.push(storageParam);
                    }
                    return storageParams;
                };

                openlistStorageInfoList.push({
                    label: 'storage.' + normalizeStorageId(config.name ?? key),
                    type: key,
                    description: 'description.' + normalizeStorageId(key),
                    framework: 'openlist',
                    defaultParams: {
                        name: config.name + '_new',
                        parameters: getStorageParams(commonOptions).concat(getStorageParams(additionalOptions, 'addition.')),
                        exParameters: {
                            openlist: {
                                supplement: [],
                            }
                        }
                    }
                });
            } catch (driverError) {
                // 单个驱动异常不导致整个列表失败
                console.error(`Error processing driver ${key}:`, driverError);
                continue;
            }
        }

        console.log(`Successfully loaded ${openlistStorageInfoList.length} OpenList drivers`);
        return openlistStorageInfoList;
        
    } catch (error) {
        console.error('Failed to update OpenList storage info list:', error);
        // 出错时返回空数组而不是抛出异常，避免UI崩溃
        return [];
    }
}

// 回退方案：使用 driver/names + driver/info 拼装
async function updateOpenlistStorageInfoListFallback(): Promise<StorageInfoType[]> {
    try {
        console.log('Using fallback: /api/admin/driver/names + /api/admin/driver/info');
        
        // 获取驱动名称列表
        const namesResponse = await openlist_api_get('/api/admin/driver/names');
        if (!namesResponse.data || !Array.isArray(namesResponse.data)) {
            console.error('Failed to get driver names:', namesResponse);
            return [];
        }
        
        const openlistStorageInfoList: StorageInfoType[] = [];
        
        // 逐个获取驱动详情
        for (const driverName of namesResponse.data) {
            try {
                const infoResponse = await openlist_api_get('/api/admin/driver/info', { driver: driverName });
                if (!infoResponse.data) {
                    console.warn(`Failed to get info for driver ${driverName}`);
                    continue;
                }
                
                // 将单驱动信息转换为兼容格式
                const provider = infoResponse.data;
                const config = safeGetDriverConfig(provider, driverName);
                const commonOptions = safeGetDriverOptions(provider, 'common');
                const additionalOptions = safeGetDriverOptions(provider, 'additional');
                
                // 复用参数解析逻辑（简化版）
                const parseOptions = (options: DriverOption[], prefix: string = ''): StorageParamItemType[] => {
                    return options.map(option => ({
                        label: option.name || 'unknown',
                        name: prefix + (option.name || 'unknown'),
                        description: option.help || '',
                        type: option.type === 'bool' ? 'boolean' : option.type === 'number' ? 'number' : 'string',
                        required: option.required || false,
                        default: option.default !== undefined ? option.default : '',
                        advanced: false,
                        isPassword: false,
                        mark: [],
                        hide: ['mount_path', 'order', 'webdav_policy', 'web_proxy', 'remark'].includes(option.name),
                        select: option.type === 'select' && option.options 
                            ? option.options.split(',').map((item: string) => ({ label: item.trim(), value: item.trim(), help: item.trim() }))
                            : []
                    }));
                };
                
                openlistStorageInfoList.push({
                    label: 'storage.' + normalizeStorageId(config.name ?? driverName),
                    type: driverName,
                    description: 'description.' + normalizeStorageId(driverName),
                    framework: 'openlist',
                    defaultParams: {
                        name: config.name + '_new',
                        parameters: parseOptions(commonOptions).concat(parseOptions(additionalOptions, 'addition.')),
                        exParameters: {
                            openlist: {
                                supplement: [],
                            }
                        }
                    }
                });
                
            } catch (e) {
                console.warn(`Error fetching driver info for ${driverName}:`, e);
                continue;
            }
        }
        
        console.log(`Fallback: Successfully loaded ${openlistStorageInfoList.length} OpenList drivers`);
        return openlistStorageInfoList;
        
    } catch (error) {
        console.error('Fallback approach also failed:', error);
        return [];
    }
}


export { updateOpenlistStorageInfoList }
