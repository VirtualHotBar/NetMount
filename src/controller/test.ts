import { rclone_api_post } from "../utils/rclone/request";
import { createStorage } from "./storage/create";
import { convertStoragePath, getFileList, reupStorage } from "./storage/storage";
import { invoke } from '@tauri-apps/api';

import { appWindow } from "@tauri-apps/api/window";
import { app } from "@tauri-apps/api";
import { nmConfig, osInfo, roConfig } from "../services/config";
import { Aria2 } from "../utils/aria2/aria2";
import { checkUpdate } from "./update/update";
import { getAvailablePorts, getWinFspInstallState, installWinFsp, showPathInExplorer } from "../utils/utils";
import { t } from "i18next";
import { FilterType, StorageInfoType, StorageParamItemType } from "../type/controller/storage/info";
import { storageInfoList, updateStorageInfoList } from "./storage/allList";
import { rcloneInfo } from "../services/rclone";
import { alist_api_get, } from "../utils/alist/request";
import { alistInfo } from "../services/alist";
import { addAlistInRclone } from "../utils/alist/alist";
import { restartRclone } from "../utils/rclone/process";
import { restartAlist } from "../utils/alist/process";
import { exit } from "./main";

export async function Test() {
    console.log(nmConfig);
    console.log(osInfo);
    console.log(rcloneInfo);

    console.log(await rclone_api_post('/options/get'));
    console.log(await rclone_api_post('/rc/list'),);

    console.log((await getAvailablePorts(2))[1]);
    
    //exit(true)

    /* console.log(await rclone_api_post('/operations/publiclink',{
        fs: convertStoragePath('S3_new',undefined,undefined,undefined,true),
        remote :convertStoragePath('S3_new','Package/HotPE-V2.7.240201.7z',undefined,true,false),
    })); */
    
    //console.log(await alist_api_get('/api/me'));
    //console.log(roConfig.env.path.homeDir);

    //console.log(storageInfoList);
    
    //await addAlistInRclone()

    //await restartAlist()
    //await restartRclone()
    //console.log(await getAlistToken());


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


    //await installWinFsp()
    //console.log(await getWinFspInstallState());

    //


    //console.log(typeList);

    //updateStorageInfoList();
}