import { StorageListAll } from "../../type/rclone/storage/storageListAll";
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

const storageListAll = [
    {
        name: 'Alist',
        type: 'webdav',
        displayType:'alist',
        introduce: 'alist_introduce',
        defaultParams: alistDefaults
    },
    {
        name: 'OneDrive',
        type: 'onedrive',
        introduce: 'onedrive_introduce',
        defaultParams: onedriveDefaults
    },
    {
        name: 'WebDav',
        type: 'webdav',
        introduce: 'Webdav_introduce',
        defaultParams: webdavDefaults
    }, {
        name: 'Google Drive',
        type: 'drive',
        introduce: 'googledrive_introduce',
        defaultParams: googleDriveDefaults
    },
    {
        name: 'Dropbox',
        type: 'dropbox',
        introduce: 'dropbox_introduce',
        defaultParams: dropboxDefaults
    },
    {
        name: 'S3 Object Storage',
        type: 's3',
        introduce: 's3_introduce',
        defaultParams: s3Defaults
    },
    {
        name: 'Google Cloud Storage',
        type: 'google cloud storage',
        introduce: 'googlecloudstorage_introduce',
        defaultParams: googleCloudStorageDefaults
    },
    {
        name: 'FTP',
        type: 'ftp',
        introduce: 'ftp_introduce',
        defaultParams: ftpDefaults
    },
    {
        name: 'Local Disk',
        type: 'local',
        introduce: 'local_introduce',
        defaultParams: localDefaults
    },
    {
        name: 'Box',
        type: 'box',
        introduce: 'box_introduce',
        defaultParams: boxDefaults
    },
    {
        name: 'HTTP',
        type: 'http',
        introduce: 'http_introduce',
        defaultParams: httpDefaults
    },
    {
        name: 'OpenStack Object Storage',
        type: 'swift',
        introduce: 'swift_introduce',
        defaultParams: swiftDefaults
    },
    {
        name: 'Pcloud',
        type: 'pcloud',
        introduce: 'pcloud_introduce',
        defaultParams: pcloudDefaults
    },
    {
        name: 'Qingstor',
        type: 'qingstor',
        introduce: 'qingstor_introduce',
        defaultParams: qingstorDefaults
    },
    {
        name: 'SFTP',
        type: 'sftp',
        introduce: 'sftp_introduce',
        defaultParams: sftpDefaults
    },
    {
        name: 'Yandex Disk',
        type: 'yandex',
        introduce: 'yandex_introduce',
        defaultParams: yandexDefaults
    },
    {
        name: 'Mega',
        type: 'mega',
        introduce: 'mega_introduce',
        defaultParams: megaDefaults
    },
    {
        name: 'OpenDrive',
        type: 'opendrive',
        introduce: 'opendrive_introduce',
        defaultParams: opendriveDefaults
    },
    {
        name: 'Jottacloud',
        type: 'jottacloud',
        introduce: 'jottacloud_introduce',
        defaultParams: jottacloudDefaults
    },
    {
        name: 'Crypt',
        type: 'crypt',
        introduce: 'crypt_introduce',
        defaultParams: cryptDefaults
    },
    {
        name: 'Alias',
        type: 'alias',
        introduce: 'alias_introduce',
        defaultParams: aliasDefaults
    },
];


//根据标识返回StorageListAll
function searchStorage(v: string | undefined, displayType: boolean=false): StorageListAll {
    for (const storageItem of storageListAll) {
        if(!displayType){
            if (( storageItem.introduce === v|| storageItem.name === v||storageItem.type === v )&&!storageItem.displayType) {
                return storageItem
            }
        }else{
            if (storageItem.introduce === v|| storageItem.name === v||storageItem.displayType === v ) {
                return storageItem
            } 
        }
    }
    return storageListAll[0]
}



/* 根据上面内容，生成s3声明及初始值（ts），以下面的格式:


import { ParamsSelectType } from "../defaults";

interface OneDriveParamsStandard {
    client_id?: string;
    client_secret?: string;
    region?: ParamsSelectType;
}


interface OneDriveParamsAdvanced {
    token?: string;
    auth_url?: string;
    token_url?: string;
    chunk_size?: string; // Assuming this to be a string for simplification
    drive_id?: string;
    drive_type?: ParamsSelectType;
    root_folder_id?: string;
    access_scopes?: string;
    disable_site_permission?: boolean;
    expose_onenote_files?: boolean;
    server_side_across_configs?: boolean;
    list_chunk?: number;
    no_versions?: boolean;
    link_scope?: string;
    link_type?: string;
    link_password?: string;
    hash_type?: string;
    av_override?: boolean;
    delta?: boolean;
    metadata_permissions?: string;
    encoding?: string;
    description?: string;
}
const standard: OneDriveParamsStandard = {
    client_id: "",
    client_secret: "",
    region: {
        select: 'global',
        values: ['global', 'us', 'de', 'cn']
    },
}

const advanced: OneDriveParamsAdvanced = {
    drive_type: { select: 'personal', values: ['personal', 'business','documentLibrary'] },
    token: "",
    auth_url: "",
    token_url: "",
    chunk_size: "10Mi",
    drive_id: "",
    root_folder_id: "",
    access_scopes: "Files.Read Files.ReadWrite Files.Read.All Files.ReadWrite.All Sites.Read.All offline_access",
    disable_site_permission: false,
    expose_onenote_files: false,
    server_side_across_configs: false,
    list_chunk: 1000,
    no_versions: false,
    link_scope: "anonymous",
    link_type: "view",
    link_password: "",
    hash_type: "auto",
    av_override: false,
    delta: false,
    metadata_permissions: "off",
    encoding: "Slash,LtGt,DoubleQuote,Colon,Question,Asterisk,Pipe,BackSlash,Del,Ctl,LeftSpace,LeftTilde,RightSpace,RightPeriod,InvalidUtf8,Dot",
    description: ""
}

const onedriveDefaults: DefaultParams = {
    "name": "OneDrive",
    "standard": standard,
    "advanced": advanced,
    "required": ['client_id', 'client_secret']
}
 */

export { storageListAll, searchStorage }