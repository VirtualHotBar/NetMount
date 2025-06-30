import { FilterType, ParamItemOptionType, StorageInfoType, StorageParamItemType } from "../../type/controller/storage/info";
import { rclone_api_post } from "../../utils/rclone/request";
import { updateOpenlistStorageInfoList } from "./framework/openlist/providers";
import { updateRcloneStorageInfoList } from "./framework/rclone/providers";

let storageInfoList: StorageInfoType[] = []

async function updateStorageInfoList() {
    storageInfoList = []
    storageInfoList.push(
        ...(await updateOpenlistStorageInfoList()),
        ...(await updateRcloneStorageInfoList()),)

    //移除不需要的存储
    const unneededStorages:string[]=['Virtual','Crypt','Alias','SMB','FTP','WebDAV']
    storageInfoList=storageInfoList.filter(item => !unneededStorages.includes(item.type));

    //给存储排序
    const keyWordList: { text: string, weight: number }[] = [
        { "text": "115", "weight": 4 },
        { "text": "139", "weight": 4.5 },
        { "text": "189", "weight": 4.5 },
        { "text": "openlist", "weight": 3.5 },
        { "text": "aliyundrive", "weight": 5 },
        { "text": "baidunetdisk", "weight": 5 },
        { "text": "baiduphoto", "weight": 1 },
        { "text": "cloudreve", "weight": 3 },
        { "text": "feijipan", "weight": 2.5 },
        { "text": "googledrive", "weight": 5.5 },
        { "text": "lanzou", "weight": 4 },
        { "text": "pikpak", "weight": 3.5 },
        { "text": "quark", "weight": 3 },
        { "text": "s3", "weight": 6 },
        { "text": "smb", "weight": 3.5 },
        { "text": "uc", "weight": 2 },
        { "text": "webdav", "weight": 4 },
        { "text": "weiyun", "weight": 6 },
        { "text": "yandexdisk", "weight": 2 },
        { "text": "mega", "weight": 3 },
        { "text": "yandex", "weight": 2 },
        { "text": "box", "weight": 3.3 },
        { "text": "ftp", "weight": 2 },
        { "text": "onedrive", "weight": 6 },
        { "text": "dropbox", "weight": 4.4 },
        { "text": "123pan", "weight": 4 }
    ]


    storageInfoList = storageInfoList.sort((a, b) => {
        let labelA = a.type.toLocaleLowerCase();
        let labelB = b.type.toLocaleLowerCase();
        let aWeight = 0;
        let bWeight = 0;
        for (const keyWord of keyWordList) {
            if (labelA.includes(keyWord.text)) {
                aWeight += keyWord.weight;
                // 确保关键词只影响一次权重
                labelA = labelA.replace(keyWord.text.toLocaleLowerCase(), '');
            }
            if (labelB.includes(keyWord.text)) {
                bWeight += keyWord.weight;
                // 确保关键词只影响一次权重
                labelB = labelB.replace(keyWord.text.toLocaleLowerCase(), '');
            }
        }
        return bWeight - aWeight;
    });

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