
import { DefaultParams } from "../../type/rclone/storage/defaults";
import { rclone_api_post } from "../../utils/rclone/request";
import { isEmptyObject } from "../../utils/rclone/utils";
import { reupStorage } from "./storage";


async function createStorage(name: string, type: string, parameters: object) {

    const back = await rclone_api_post("/config/create", {
        "name": name,
        "type": type,
        "parameters": parameters
    })

    reupStorage()

    return isEmptyObject(back);
}

//检查必填参数的合法性
function checkParams(storageName: string, parameters: { [key: string]: any }, defaultParams: DefaultParams, t?: Function): { isOk: boolean, msg: string } {
    let isOk = true;
    let msg = '';

    if (!t) {
        t = (v: string) => { return v }
    }

    if (!storageName) {
        isOk = false;
        msg += `${t('storage_name_illegal')}`;
    }

    if (isOk) {
        for (const param of defaultParams.required) {
            if (!parameters[param]) {
                isOk = false;
                msg += `${t('missing_parameter')}:${t(param)}`;
                break
            }
        }
    }




    // 返回结果前清理末尾的换行符，避免多余的空白
    msg = msg.trimEnd();

    return { isOk: isOk, msg: msg };
}


export { createStorage, checkParams }