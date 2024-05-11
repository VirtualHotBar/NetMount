import { FilterType, ParamItemOptionType, StorageInfoType, StorageParamItemType } from "../../type/controller/storage/info";
import { rclone_api_post } from "../../utils/rclone/request";
import { updateAlistStorageInfoList } from "./framework/alist/providers";
import { updateRcloneStorageInfoList } from "./framework/rclone/providers";

let storageInfoList: StorageInfoType[] = []

async function updateStorageInfoList() {
    storageInfoList = []
    storageInfoList.push(
        ...(await updateAlistStorageInfoList()),
        ...(await updateRcloneStorageInfoList()),)
}

//根据标识返回StorageListAll
function searchStorageInfo(v: string | undefined, displayType: boolean = false): StorageInfoType {
    for (const storageItem of storageInfoList) {
        if (!displayType) {
            if ((storageItem.description === v || storageItem.label === v || storageItem.type === v) && !storageItem.displayType) {
                return storageItem
            }
        } else {
            if (storageItem.description === v || storageItem.label === v || storageItem.displayType === v) {
                return storageItem
            }
        }
    }
    return storageInfoList[0]
}


export { searchStorageInfo, updateStorageInfoList, storageInfoList }