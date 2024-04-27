import { ParamsSelectType } from "../defaults";

interface S3ParamsStandard {
    provider?: ParamsSelectType;
    env_auth?: boolean;
    access_key_id?: string;
    secret_access_key?: string;
    region?: string;
    endpoint?: string;
    location_constraint?: string;
    acl?: string;
    server_side_encryption?: string;
    sse_kms_key_id?: string;
    storage_class?: string;
}

interface S3ParamsAdvanced {
    bucket_acl?: string;
    requester_pays?: boolean;
    sse_customer_algorithm?: string;
    sse_customer_key?: string;
    sse_customer_key_base64?: string;
    sse_customer_key_md5?: string;
    upload_cutoff?: string; // Assuming this to be a string for simplification
    chunk_size?: string; // Assuming this to be a string for simplification
    max_upload_parts?: number;
    copy_cutoff?: string; // Assuming this to be a string for simplification
    disable_checksum?: boolean;
    shared_credentials_file?: string;
    profile?: string;
    session_token?: string;
    upload_concurrency?: number;
    force_path_style?: boolean;
    v2_auth?: boolean;
    use_dual_stack?: boolean;
    use_accelerate_endpoint?: boolean;
    leave_parts_on_error?: boolean;
    list_chunk?: number;
    list_version?: number;
    list_url_encode?: ParamsSelectType;
    no_check_bucket?: boolean;
    no_head?: boolean;
    no_head_object?: boolean;
    encoding?: string;
    disable_http2?: boolean;
    download_url?: string;
    directory_markers?: boolean;
    use_multipart_etag?: ParamsSelectType;
    use_presigned_request?: boolean;
    versions?: boolean;
    version_at?: string;
    version_deleted?: boolean;
    decompress?: boolean;
    might_gzip?: ParamsSelectType;
    use_accept_encoding_gzip?: ParamsSelectType;
    no_system_metadata?: boolean;
    sts_endpoint?: string;
    use_already_exists?: ParamsSelectType;
    use_multipart_uploads?: ParamsSelectType;
    description?: string;
}

export{S3ParamsStandard, S3ParamsAdvanced}