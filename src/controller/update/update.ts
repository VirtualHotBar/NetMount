import * as fs from "@tauri-apps/plugin-fs";
import { compareVersions, downloadFile, takeRightStr } from "../../utils/utils";
import { ResItem, ResList } from "../../type/controller/update";
import { nmConfig, osInfo } from "../../services/config";
import { getVersion } from "@tauri-apps/api/app";
import { Modal } from "@arco-design/web-react";


async function checkUpdate(updateCall: (resList: ResItem, localVersions: String) => void) {
    const localVersions = await getVersion()
    try {
        const resList: ResItem = (await (await fetch(nmConfig.api.url + '/GetUpdate/?arch=' + osInfo.arch + '&osType=' + osInfo.osType)).json()).data
        if (resList.id && compareVersions(resList.id, localVersions) === 1) {
            updateCall(resList, localVersions)
        }
    } catch {
        console.error('checkUpdate error')

    }

}


export { checkUpdate }