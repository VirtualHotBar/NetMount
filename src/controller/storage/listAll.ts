import { StorageListAll } from "../../type/rclone/storage/storageListAll";
import { webdavDefaults } from "./parameters/defaults/webdav";

const storageListAll:Array<StorageListAll> = [
    {
        name: 'WebDav',
        type: 'webdav',
        introduce: 'Webdav_introduce',
        defaultParams:webdavDefaults
    }
]

//根据标识返回StorageListAll
function searchStorage(v:string|undefined):StorageListAll{
    for(const storageItem of storageListAll){
        if (storageItem.type === v||storageItem.name === v) {
            return storageItem
        }
    }
    return storageListAll[0]
}

export {storageListAll,searchStorage}