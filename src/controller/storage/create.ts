import { ParametersType } from "../../type/defaults";
import { rclone_api_post } from "../../utils/rclone/request";
import { isEmptyObject } from "../../utils/utils";
import { reupStorage } from "./storage";


async function createStorage(name: string, type: string, parameters: ParametersType) {

    const back = await rclone_api_post("/config/create", {
        "name": name,
        "type": type,
        "parameters": parameters
    })

    reupStorage()

    return isEmptyObject(back);
}


export { createStorage }