import { invoke } from "@tauri-apps/api/core"
import runCmd from "../tauri/cmd"
import { addParams, openlistDataDir } from "./process"
import { openlistInfo } from "../../services/openlist"
import { createStorage } from "../../controller/storage/create"
import { nmConfig } from "../../services/config"



async function getOpenlistToken() {
    const resultStr = await runCmd('binaries/openlist', ['admin', 'token', ...addParams()], true)
    const mark = 'Admin token:'
    const startIndex = resultStr.indexOf(mark)
    if (startIndex === -1) {
        console.error('getOpenlistToken: Failed to find "Admin token:" in output')
        return ''
    }
    
    // 提取 "Admin token:" 之后的内容，并只取第一行
    const tokenPart = resultStr.substring(startIndex + mark.length)
    const firstLine = tokenPart.split('\n')[0]!.trim()
    
    console.log('getOpenlistToken: Extracted token length:', firstLine.length)
    return firstLine
}

async function setOpenlistPass(pass:string){
    const resultStr = await runCmd('binaries/openlist', ['admin', 'set',  pass,...addParams()], true)
    console.log(resultStr);
}

async function modifyOpenlistConfig(rewriteData: {
    force?: boolean;
    scheme?: {
        http_port?: number;
    };
    temp_dir?: string;
} = openlistInfo.openlistConfig){
    console.log(rewriteData);
    
     const path = openlistDataDir()+'config.json'
     let oldOpenlistConfig = {}
     try {
         oldOpenlistConfig = await invoke('read_json_file',{path}) as object
     } catch (e) {
         console.log('配置文件不存在或损坏，使用空配置:', e)
     }
     const newOpenlistConfig = {...oldOpenlistConfig, ...rewriteData}
     await invoke('write_json_file',{configData:newOpenlistConfig,path:path})
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