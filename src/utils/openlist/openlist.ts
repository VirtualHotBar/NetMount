import { invoke } from "@tauri-apps/api/core"
import runCmd from "../tauri/cmd"
import { addParams, openlistDataDir } from "./process"
import { openlistInfo } from "../../services/openlist"
import { createStorage } from "../../controller/storage/create"
import { delStorage } from "../../controller/storage/storage"
import { nmConfig } from "../../services/config"



async function getOpenlistToken() {
    const resultStr = await runCmd('openlist', ['admin', 'token', ...addParams()])
    const mark = 'Admin token:'
    const startIndex = resultStr.indexOf(mark)
    if (startIndex === -1) {
        console.error('getOpenlistToken: Failed to find "Admin token:" in output')
        return ''
    }
    
    // 提取 "Admin token:" 之后的内容，并只取第一行
    const tokenPart = resultStr.substring(startIndex + mark.length)
    const firstLine = tokenPart.split('\n')[0].trim()
    
    console.log('getOpenlistToken: Extracted token length:', firstLine.length)
    return firstLine
}

async function setOpenlistPass(pass:string){
    const resultStr = await runCmd('openlist', ['admin', 'set',  pass,...addParams()])
    console.log(resultStr);
}

// 深度合并对象（带循环引用检测）
function deepMerge(target: any, source: any, visited = new WeakSet()): any {
    // 处理 null 或 undefined
    if (!target) target = {};
    if (!source) return target;
    
    // 循环引用检测
    if (visited.has(source)) {
        console.warn('Circular reference detected in deepMerge, skipping nested object');
        return target;
    }
    
    // 只处理纯对象
    if (source && typeof source === 'object' && !Array.isArray(source)) {
        visited.add(source);
    }
    
    const output = { ...target };
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = target[key];
            
            // 递归合并对象
            if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
                output[key] = deepMerge(
                    targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue) 
                        ? targetValue 
                        : {}, 
                    sourceValue,
                    visited
                );
            } else {
                // 直接赋值（包括数组和基本类型）
                output[key] = sourceValue;
            }
        }
    }
    return output;
}

async function modifyOpenlistConfig(rewriteData: any = openlistInfo.openlistConfig) {
    console.log('modifyOpenlistConfig input:', rewriteData);

    const dataDir = openlistDataDir();
    const path = dataDir + 'config.json';
    const backupPath = dataDir + 'config.json.bak';

    try {
        // 确保数据目录存在
        await invoke('fs_make_dir', { path: dataDir });
        await invoke('fs_make_dir', { path: dataDir + 'data' });
        await invoke('fs_make_dir', { path: dataDir + 'log' });

        // 读取旧配置
        let oldOpenlistConfig: any = {};
        try {
            oldOpenlistConfig = await invoke('read_json_file', { path }) as object;
        } catch (e) {
            console.log('No existing config found, creating new one');
        }

        // 备份原配置
        try {
            await invoke('copy_file', { src: path, dest: backupPath });
            console.log('Config backup created at:', backupPath);
        } catch (e) {
            console.log('No existing config to backup');
        }

        // 深度合并配置
        const newOpenlistConfig = deepMerge(oldOpenlistConfig, rewriteData);

        // 确保数据库文件使用绝对路径，避免创建在项目目录下
        if (newOpenlistConfig.database?.db_file) {
            const dbFile = newOpenlistConfig.database.db_file;
            // 检查是否已经是绝对路径 (Windows: 包含 ':'，Unix: 以 '/' 开头)
            const isAbsolute = dbFile.includes(':') || dbFile.startsWith('/');
            if (!isAbsolute) {
                newOpenlistConfig.database.db_file = dataDir + dbFile;
            }
        }

        // 确保日志文件使用绝对路径
        if (newOpenlistConfig.log?.name) {
            const logFile = newOpenlistConfig.log.name;
            const isAbsolute = logFile.includes(':') || logFile.startsWith('/');
            if (!isAbsolute) {
                newOpenlistConfig.log.name = dataDir + logFile;
            }
        }

        // 确保 bleve_dir 使用绝对路径
        if (newOpenlistConfig.bleve_dir) {
            const bleveDir = newOpenlistConfig.bleve_dir;
            const isAbsolute = bleveDir.includes(':') || bleveDir.startsWith('/');
            if (!isAbsolute) {
                newOpenlistConfig.bleve_dir = dataDir + bleveDir;
            }
        }

        console.log('Merged config:', newOpenlistConfig);

        // 写入新配置
        await invoke('write_json_file', { configData: newOpenlistConfig, path: path });
        console.log('Config written successfully to:', path);
    } catch (error) {
        console.error('Failed to modify OpenList config:', error);
        throw error;
    }
}

async function addOpenlistInRclone() {
    const webdavUrl = openlistInfo.endpoint.url + '/dav';
    const username = nmConfig.framework.openlist.user;
    
    console.log('=== OpenList WebDAV Configuration ===');
    console.log('WebDAV URL:', webdavUrl);
    console.log('WebDAV Username:', username);
    console.log('Note: WebDAV password is the same as Web UI login password');
    
    // 可选：探测 WebDAV 端点以提供诊断信息
    try {
        const probeRes = await fetch(webdavUrl, {
            method: 'OPTIONS',
            headers: {
                'Authorization': 'Basic ' + btoa(username + ':' + nmConfig.framework.openlist.password)
            }
        });
        console.log('WebDAV probe HTTP status:', probeRes.status);
        if (probeRes.status === 401) {
            console.warn('WebDAV returned 401 - Please check if user has WebDAV Read/Management permissions enabled');
        } else if (probeRes.status === 403) {
            console.warn('WebDAV returned 403 - Please check if user has necessary file permissions');
        } else if (probeRes.ok || probeRes.status === 207) {
            console.log('WebDAV endpoint appears to be accessible');
        }
    } catch (probeError) {
        console.warn('WebDAV probe failed (this is normal if server is still starting):', probeError);
    }
    console.log('=====================================');
    
    await createStorage(openlistInfo.markInRclone, 'webdav', {
        'url': webdavUrl,
        'vendor': 'other',
        'user': username,
        'pass': nmConfig.framework.openlist.password,
    });
}


export{ getOpenlistToken,modifyOpenlistConfig,setOpenlistPass,addOpenlistInRclone}