import {  rclone_api_post } from "../utils/rclone/request";
import { createStorage } from "./storage/create";
import { getFileList, reupStorage } from "./storage/storage";

export async function Test() {
    console.log(await getFileList('1','/www.sysri'));
    
    
}