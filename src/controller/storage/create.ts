
import { rclone_api_post } from "../../utils/rclone/request";


async function createStorage(name: string, type: string, parameters: object) {

    const test = await rclone_api_post("/config/create", {
        "name": name,
        "type": type,
        "parameters": parameters
    })
    console.log(test);
}

export { createStorage }