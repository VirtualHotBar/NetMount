import { rclone_api_post } from "../utils/rclone/request";
import { createStorage } from "./storage/create";
import { getFileList, reupStorage } from "./storage/storage";
import { invoke } from '@tauri-apps/api';

import { appWindow } from "@tauri-apps/api/window";
import {app } from "@tauri-apps/api";


export async function Test() {


    console.log(await rclone_api_post('/options/get'));




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


}