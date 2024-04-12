import { fs } from "@tauri-apps/api";
import { downloadFile, takeRightStr } from "../../utils/utils";
import { ResItem, ResList } from "../../type/controller/update";
import { nmConfig, osInfo } from "../../services/config";
import { getVersion } from "@tauri-apps/api/app";
import { Modal } from "@arco-design/web-react";


async function checkUpdate(updateCall: (resList: ResItem,localUpdateId: number) => void) {
    const localUpdateId = await getUpdateId()

    const resList: ResItem = (await (await fetch(nmConfig.api.url + '/GetUpdate/?arch=' + osInfo.arch + '&osType=' + osInfo.osType)).json()).data

    if (resList.id && Number(resList.id) < localUpdateId) {
        updateCall(resList,localUpdateId)
    }
}

async function getUpdateId() {
    return Number(takeRightStr(await getVersion(), '-'))
}

export { checkUpdate }