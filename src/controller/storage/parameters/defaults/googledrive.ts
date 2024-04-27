import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface GoogleDriveParamsStandard {
    client_id?: string;
    client_secret?: string;
    scope?: string;
    root_folder_id?: string;
    service_account_file?: string;
}

interface GoogleDriveParamsAdvanced {
    service_account_credentials?: string;
    team_drive?: string;
    auth_owner_only?: boolean;
    use_trash?: boolean;
    skip_gdocs?: boolean;
    shared_with_me?: boolean;
    trashed_only?: boolean;
    export_formats?: string;
    import_formats?: string;
    allow_import_name_change?: boolean;
    use_created_date?: boolean;
    list_chunk?: number;
    impersonate?: string;
    alternate_export?: boolean;
    upload_cutoff?: number;
    chunk_size?: number;
    acknowledge_abuse?: boolean;
    keep_revision_forever?: boolean;
    v2_download_min_size?: number;
    pacer_min_sleep?: number;
    pacer_burst?: number;
}

const standard: GoogleDriveParamsStandard = {
    client_id: "",
    client_secret: "",
    scope: "",
    root_folder_id: "",
    service_account_file: ""
}

const advanced: GoogleDriveParamsAdvanced = {
    service_account_credentials: "",
    team_drive: "",
    auth_owner_only: false,
    use_trash: true,
    skip_gdocs: false,
    shared_with_me: false,
    trashed_only: false,
    export_formats: "docx,xlsx,pptx,svg",
    import_formats: "",
    allow_import_name_change: false,
    use_created_date: false,
    list_chunk: 1000,
    impersonate: "",
    alternate_export: false,
    upload_cutoff: 8388608,
    chunk_size: 8388608,
    acknowledge_abuse: false,
    keep_revision_forever: false,
    v2_download_min_size: -1,
    pacer_min_sleep: 100000000,
    pacer_burst: 100
}

const googleDriveDefaults: DefaultParams = {
    "name": "Google Drive",
    "standard": standard,
    "advanced": advanced,
    required:["client_id", "client_secret"]
}

export{googleDriveDefaults}