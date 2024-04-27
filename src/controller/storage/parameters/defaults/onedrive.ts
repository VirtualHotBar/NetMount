import { DefaultParams } from "../../../../type/rclone/storage/defaults"
import { OneDriveParamsAdvanced, OneDriveParamsStandard } from "../../../../type/rclone/storage/parameters/onedrive"


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
    "name": "New_Storage",
    "standard": standard,
    "advanced": advanced,
    "required": ['client_id', 'client_secret']
}


export { onedriveDefaults }