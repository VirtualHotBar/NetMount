import { rclone_api_post } from "../utils/rclone/request";
import { createStorage } from "./storage/create";
import { getFileList, reupStorage } from "./storage/storage";
import { invoke } from '@tauri-apps/api';

import { appWindow } from "@tauri-apps/api/window";
import { app } from "@tauri-apps/api";
import { nmConfig, osInfo } from "../services/config";
import { Aria2 } from "../utils/aria2/aria2";
import { checkUpdate } from "./update/update";
import { getWinFspInstallState, installWinFsp } from "../utils/utils";

export async function Test() {


    console.log(await rclone_api_post('/options/get'));

    console.log(nmConfig);


    /*     let data = await invoke('read_config_file') as any;
        console.log(data);
        console.log(await invoke('write_config_file', {
            configData: data
        })); */


    /*     let taskids = (await rclone_api_post('/job/list')).jobids as Array<number>
        taskids.forEach(async (taskid) => {
            console.log(await rclone_api_post('/job/status', {
                jobid: taskid
            }));
        }) */
    /*     console.log(await rclone_api_post('/operations/copyurl',{
            remote:'/hpm-od/QQNT_VirtualHotBar_9.9.7.21453_QQNT.HPM',
            fs:'Webdav:'
        })); */




        

/*     const aria2Test = new Aria2('https://down.hotpe.top/d/Package/HotPE-V2.7.240201.exe',
        'F:/',
        'test1.7z',
        8, (back) => {
            console.log(back);
        })



    aria2Test.start() */
    //console.log(await runCmd('curl', [url,'-o', path]));

    console.log(osInfo);
    
    //await installWinFsp()
    //console.log(await getWinFspInstallState());
    await invoke('set_localized',{
        localized_data:{
            quit:"退出"
        }
    })


    
}