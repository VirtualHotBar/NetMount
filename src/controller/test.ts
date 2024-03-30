import {  rclone_api_post } from "../utils/rclone/request";
import { createStorage } from "./storage/create";
import { getFileList, reupStorage } from "./storage/storage";

export async function Test() {
    console.log(await rclone_api_post('/options/get'));

    console.log(await rclone_api_post('/core/version'));
}