import { FilterType, StorageInfoType, StorageParamItemType } from "../../type/controller/storage/info";
import { DefaultParams } from "../../type/rclone/storage/defaults";
import { StorageList } from "../../type/rclone/storage/storageListAll";
import { rclone_api_post } from "../../utils/rclone/request";
import { aliasDefaults } from "./parameters/defaults/alias";
import { alistDefaults } from "./parameters/defaults/alist";
import { boxDefaults } from "./parameters/defaults/box";
import { cryptDefaults } from "./parameters/defaults/crypt";
import { dropboxDefaults } from "./parameters/defaults/dropbox";
import { ftpDefaults } from "./parameters/defaults/ftp";
import { googleCloudStorageDefaults } from "./parameters/defaults/googleCloudStorage";
import { googleDriveDefaults } from "./parameters/defaults/googledrive";
import { httpDefaults } from "./parameters/defaults/http";
import { jottacloudDefaults } from "./parameters/defaults/jottacloud";
import { localDefaults } from "./parameters/defaults/local";
import { megaDefaults } from "./parameters/defaults/mega";
import { onedriveDefaults } from "./parameters/defaults/onedrive";
import { opendriveDefaults } from "./parameters/defaults/opendrive";
import { pcloudDefaults } from "./parameters/defaults/pcloud";
import { qingstorDefaults } from "./parameters/defaults/qingstor";
import { s3Defaults } from "./parameters/defaults/s3";
import { sftpDefaults } from "./parameters/defaults/sftp";
import { swiftDefaults } from "./parameters/defaults/swift";
import { webdavDefaults } from "./parameters/defaults/webdav";
import { yandexDefaults } from "./parameters/defaults/yandex";

const storageInfoList: StorageInfoType[] = []

async function updateStorageInfoList(){
    const providers = (await rclone_api_post('/config/providers')).providers as Array<any>

    
    console.log(providers);

    //let typeList: Array<string> = []

    for (const provider of providers) {
        let storageParams: StorageParamItemType[] = []

        for (const option of provider.Options) {

            //console.log(option.Type);

            /*             if(option.DefaultStr !== option.ValueStr){//DefaultStr和ValueStr区别是，前者DefaultStr包含‘<nil>’字符串
                            console.log(option.DefaultStr,option.ValueStr);
                        } */
            //all type: ['string', 'bool', 'CommaSepList', 'Encoding', 'SizeSuffix', 'int', 'Duration', 'SpaceSepList', 'Time', 'Tristate', 'Bits']
            /*if (!typeList.includes(option.Type)) {
                            typeList.push(option.Type)
                        } */

            let storageParam: StorageParamItemType = {
                label: option.Name,
                name: option.Name,
                description: option.Help,
                type: 'string',
                required: option.Required,
                default: '',
                advanced: option.Advanced,
                isPassword: option.IsPassword,
                mark: []
            }

            //类型(基础)
            let type: 'boolean' | 'number' | 'string';

            switch (option.Type) {
                case 'bool': type = 'boolean'; break;
                case 'int': type = 'number'; break;
                default: type = 'string'
            }

            storageParam.type = type;

            //默认值
            let defaultValue: string | number | boolean;
            if (type === 'boolean') {
                defaultValue = option.Default
            } else if (type === 'number') {
                defaultValue = option.Default
            } else {
                defaultValue = option.ValueStr// option.DefaultStr
            }

            storageParam.default = defaultValue;

            //扩展类型
            if (type === 'string' && option.Type !== 'string') {
                storageParam.exType = option.Type;
            }

            //特殊标记（实现选择本地数据）
            if (type === 'string' && option.Name.includes('remote')) {//本地存储数据
                storageParam.mark?.push('StorageSelector');
            }

            const generateFilter = (name: string, list: string) => {
                let filters: FilterType[] = []
                const Providers = list.split(',') as Array<string>;
                for (const Provider of Providers) {
                    const filterState = !Provider.startsWith('!')

                    filters.push({
                        name: name,
                        value: filterState ? Provider : Provider.substring(1),
                        state: filterState
                    })
                    //console.log(filterState ? Provider : Provider.substring(1));
                }
                //console.log(filters);
                
                return filters
            }

            if (option.Provider) {
                storageParam.filters = generateFilter('provider', option.Provider);
            }

            /* if(option.ShortOpt){//短选项
                console.log(option.ShortOpt,option);
            } */



            //选项
            if (option.Examples && option.Examples.length > 0) {
                storageParam.select = option.Examples.map((item: any) => {

                    if (option.Provider) {
                        storageParam.filters = generateFilter('provider', option.Provider);
                    }

                    return {
                        label: item.Value,
                        value: item.Value
                    }

                })
                //console.log(storageParam);
            }

            storageParams.push(storageParam)
        }

        storageInfoList.push({
            label: provider.Name,
            type: provider.Prefix,
            description: provider.Description,
            defaultParams: {
                name: provider.Name + '_new',
                parameters: storageParams
            }
        })
    }
}

const storageListAll:StorageList[] = [
    {
        name: 'Alist',
        type: 'webdav',
        displayType:'alist',
        description: 'alist_description',
        defaultParams: alistDefaults
    },
    {
        name: 'OneDrive',
        type: 'onedrive',
        description: 'onedrive_description',
        defaultParams: onedriveDefaults
    },
    {
        name: 'WebDav',
        type: 'webdav',
        description: 'Webdav_description',
        defaultParams: webdavDefaults
    }, {
        name: 'Google Drive',
        type: 'drive',
        description: 'googledrive_description',
        defaultParams: googleDriveDefaults
    },
    {
        name: 'Dropbox',
        type: 'dropbox',
        description: 'dropbox_description',
        defaultParams: dropboxDefaults
    },
    {
        name: 'S3 Object Storage',
        type: 's3',
        description: 's3_description',
        defaultParams: s3Defaults
    },
    {
        name: 'Google Cloud Storage',
        type: 'google cloud storage',
        description: 'googlecloudstorage_description',
        defaultParams: googleCloudStorageDefaults
    },
    {
        name: 'FTP',
        type: 'ftp',
        description: 'ftp_description',
        defaultParams: ftpDefaults
    },
    {
        name: 'Local Disk',
        type: 'local',
        description: 'local_description',
        defaultParams: localDefaults
    },
    {
        name: 'Box',
        type: 'box',
        description: 'box_description',
        defaultParams: boxDefaults
    },
    {
        name: 'HTTP',
        type: 'http',
        description: 'http_description',
        defaultParams: httpDefaults
    },
    {
        name: 'OpenStack Object Storage',
        type: 'swift',
        description: 'swift_description',
        defaultParams: swiftDefaults
    },
    {
        name: 'Pcloud',
        type: 'pcloud',
        description: 'pcloud_description',
        defaultParams: pcloudDefaults
    },
    {
        name: 'Qingstor',
        type: 'qingstor',
        description: 'qingstor_description',
        defaultParams: qingstorDefaults
    },
    {
        name: 'SFTP',
        type: 'sftp',
        description: 'sftp_description',
        defaultParams: sftpDefaults
    },
    {
        name: 'Yandex Disk',
        type: 'yandex',
        description: 'yandex_description',
        defaultParams: yandexDefaults
    },
    {
        name: 'Mega',
        type: 'mega',
        description: 'mega_description',
        defaultParams: megaDefaults
    },
    {
        name: 'OpenDrive',
        type: 'opendrive',
        description: 'opendrive_description',
        defaultParams: opendriveDefaults
    },
    {
        name: 'Jottacloud',
        type: 'jottacloud',
        description: 'jottacloud_description',
        defaultParams: jottacloudDefaults
    },
    {
        name: 'Crypt',
        type: 'crypt',
        description: 'crypt_description',
        defaultParams: cryptDefaults
    },
    {
        name: 'Alias',
        type: 'alias',
        description: 'alias_description',
        defaultParams: aliasDefaults
    },
];


//根据标识返回StorageListAll
function searchStorage(v: string | undefined, displayType: boolean=false): StorageList {
    for (const storageItem of storageListAll) {
        if(!displayType){
            if (( storageItem.description === v|| storageItem.name === v||storageItem.type === v )&&!storageItem.displayType) {
                return storageItem
            }
        }else{
            if (storageItem.description === v|| storageItem.name === v||storageItem.displayType === v ) {
                return storageItem
            } 
        }
    }
    return storageListAll[0]
}


export { storageListAll, searchStorage ,updateStorageInfoList}