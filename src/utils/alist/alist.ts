import { invoke } from "@tauri-apps/api/core"
import runCmd from "../tauri/cmd"
import { addParams, openlistDataDir } from "./process"
import { openlistInfo } from "../../services/openlist"
import { createStorage } from "../../controller/storage/create"
import { delStorage } from "../../controller/storage/storage"
import { nmConfig } from "../../services/config"



async function getAlistToken() {
    const resultStr = await runCmd('openlist', ['admin', 'token', ...addParams()])
    const mark = 'Admin token:'
    return resultStr.substring(resultStr.indexOf(mark) + mark.length).split(' ').join('')
}

async function setAlistPass(pass:string){
    const resultStr = await runCmd('openlist', ['admin', 'set',  pass,...addParams()])
    console.log(resultStr);
}

async function modifyAlistConfig(rewriteData:any=openlistInfo.openlistConfig){
    console.log(rewriteData);
    
     const path = openlistDataDir()+'config.json'
     const oldAlistConfig =await invoke('read_json_file',{path}) as object
     const newAlistConfig = {...oldAlistConfig, ...rewriteData}
     await invoke('write_json_file',{configData:newAlistConfig,path:path})
}

async function addAlistInRclone(){
    //await delStorage(openlistInfo.markInRclone)
    await createStorage(openlistInfo.markInRclone,'webdav',{
        'url':openlistInfo.endpoint.url+'/dav',
        'vendor':'other',
        'user':nmConfig.framework.openlist.user,
        'pass':nmConfig.framework.openlist.password,
    })
}


export{ getAlistToken,modifyAlistConfig,setAlistPass,addAlistInRclone}