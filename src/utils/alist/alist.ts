import { invoke } from "@tauri-apps/api"
import runCmd from "../tauri/cmd"
import { addParams, alistDataDir } from "./process"
import { alistInfo } from "../../services/alist"



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
    const path = alistDataDir()+'config.json'
    const oldAlistConfig =await invoke('read_config_file',{path}) as object
    const newAlistConfig = {...oldAlistConfig, ...rewriteData}
    await invoke('write_config_file',{configData:newAlistConfig,path:path})
}

export{ getAlistToken,modifyAlistConfig,setAlistPass}