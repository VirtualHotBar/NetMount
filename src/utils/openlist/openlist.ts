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

async function modifyOpenlistConfig(rewriteData:any=openlistInfo.openlistConfig){
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

async function addOpenlistInRclone(){
    //await delStorage(openlistInfo.markInRclone)
    await createStorage(openlistInfo.markInRclone,'webdav',{
        'url':openlistInfo.endpoint.url+'/dav',
        'vendor':'other',
        'user':nmConfig.framework.openlist.user,
        'pass':nmConfig.framework.openlist.password,
    })
}


export{ getOpenlistToken,modifyOpenlistConfig,setOpenlistPass,addOpenlistInRclone}