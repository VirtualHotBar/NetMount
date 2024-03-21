import { rclone_api_get, rclone_api_post } from "../utils/rclone/request";
import { reupStorage } from "./storage/storage";

export async function Test() {
    reupStorage()
}