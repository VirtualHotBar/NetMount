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

export{OneDriveParamsStandard, OneDriveParamsAdvanced}