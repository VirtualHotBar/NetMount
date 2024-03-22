interface OnedriveParameters {
    // 标准选项
    client_id?: string;
    client_secret?: string;
    region?: "global" | "us" | "de" | "cn";
    token?: string;
    auth_url?: string;
    token_url?: string;
    chunk_size?: string; // 假设SizeSuffix是一个表示大小后缀的类型
    drive_id?: string;
    drive_type?: "personal" | "business" | "documentLibrary";
    root_folder_id?: string;
    access_scopes?: string[];
    disable_site_permission?: boolean;
    expose_onenote_files?: boolean;
    server_side_across_configs?: boolean;
    list_chunk?: number;
    no_versions?: boolean;
    link_scope?: "anonymous" | "organization";
    link_type?: "view" | "edit" | "embed";
    link_password?: string;
    hash_type?: "auto" | "quickxor" | "sha1" | "sha256" | "crc32" | "none";
    av_override?: boolean;
    delta?: boolean;
    metadata_permissions?: "off" | "read" | "write" | "read,write";
    encoding?: string;

    // 高级选项中未包含在上述标准选项中的额外属性（如description）
    description?: string;
}

export { OnedriveParameters };