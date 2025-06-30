import { Message } from "@arco-design/web-react";
import { ParametersType } from "../../type/defaults";
import { openlist_api_post } from "../../utils/openlist/request";
import { rclone_api_post } from "../../utils/rclone/request";
import { isEmptyObject } from "../../utils/utils";
import { searchStorageInfo } from "./allList";
import { reupStorage, searchStorage } from "./storage";


async function createStorage(name: string, type: string, parameters: ParametersType, exAdditional: ParametersType = {}/*  exParameters?: { openlist?: { additional?: ParametersType } } */) {
    const storageInfo = searchStorageInfo(type)
    const storage = searchStorage(name)
    let backData
    switch (storageInfo.framework) {
        case 'rclone':
            backData = await rclone_api_post("/config/create", {
                "name": name,
                "type": storageInfo.type,
                "parameters": parameters,
                ...exAdditional
            })
            reupStorage()
            return isEmptyObject(backData);
        case 'openlist':
            parameters.addition = JSON.stringify(parameters.addition)

            if(!storage){
                backData = await openlist_api_post('/api/admin/storage/create', {
                    ...parameters,
                    driver: storageInfo.type,
                    ...exAdditional
                });
                if (backData.code != 200) {
                    Message.error(backData.message)
                }
            }else{//修改
                backData = await openlist_api_post('/api/admin/storage/update', {
                    ...parameters,
                    driver: storageInfo.type,
                    ...exAdditional,
                    id: storage.other?.openlist?.id
                });
            }
            if (backData.code != 200) {
                Message.error(backData.message)
            }
            reupStorage()
            return backData.code === 200||500;
    }
}


export { createStorage }