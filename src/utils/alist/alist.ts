import { invoke } from "@tauri-apps/api/core"
import runCmd from "../tauri/cmd"
import { addParams, alistDataDir } from "./process"
import { alistInfo } from "../../services/alist"
import { createStorage } from "../../controller/storage/create"
import { delStorage } from "../../controller/storage/storage"
import { nmConfig } from "../../services/config"



async function getAlistToken() {
    const resultStr = await runCmd('alist', ['admin', 'token', ...addParams()])
    const mark = 'Admin token:'
    return resultStr.substring(resultStr.indexOf(mark) + mark.length).split(' ').join('')
}

async function setAlistPass(pass:string){
    const resultStr = await runCmd('alist', ['admin', 'set',  pass,...addParams()])
    console.log(resultStr);
}

async function modifyAlistConfig(rewriteData:any=alistInfo.alistConfig){
    // const path = alistDataDir()+'config.json'
    // const oldAlistConfig =await invoke('read_config_file',{path}) as object
    // const newAlistConfig = {...oldAlistConfig, ...rewriteData}
    // await invoke('write_config_file',{configData:newAlistConfig,path:path})
}

async function addAlistInRclone(){
    //await delStorage(alistInfo.markInRclone)
    await createStorage(alistInfo.markInRclone,'webdav',{
        'url':alistInfo.endpoint.url+'/dav',
        'vendor':'other',
        'user':nmConfig.framework.alist.user,
        'pass':nmConfig.framework.alist.password,
    })
}


export{ getAlistToken,modifyAlistConfig,setAlistPass,addAlistInRclone}