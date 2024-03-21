import { rclone_api_get, rclone_api_post } from "../utils/rclone/request";

export async function Test() {
    let test = await rclone_api_post(
        '/config/listremotes',

    )
    console.log(test);
    

}