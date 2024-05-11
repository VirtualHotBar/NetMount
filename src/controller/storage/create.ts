import { Message } from "@arco-design/web-react";
import { ParametersType } from "../../type/defaults";
import { alist_api_post } from "../../utils/alist/request";
import { rclone_api_post } from "../../utils/rclone/request";
import { isEmptyObject } from "../../utils/utils";
import { searchStorageInfo } from "./allList";
import { reupStorage } from "./storage";


async function createStorage(name: string, type: string, parameters: ParametersType, exAdditional: ParametersType = {}/*  exParameters?: { alist?: { additional?: ParametersType } } */) {
    const storageInfo = searchStorageInfo(type)
    let backData
    switch (storageInfo.framework) {
        case 'rclone':
            backData = await rclone_api_post("/config/create", {
                "name": name,
                "type": type,
                "parameters": parameters,
                ...exAdditional
            })
            reupStorage()
            return isEmptyObject(backData);
        case 'alist':
            parameters.addition = JSON.stringify(parameters.addition)

            backData = await alist_api_post('/api/admin/storage/create', {
                ...parameters,
                driver: storageInfo.type,
                ...exAdditional
            });
            if (backData.code != 200) {
                Message.error(backData.message)
            }

            return backData.code === 200

    }
}


export { createStorage }