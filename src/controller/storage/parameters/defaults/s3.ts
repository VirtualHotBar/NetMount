import { DefaultParams } from "../../../../type/rclone/storage/defaults"
import { S3ParamsAdvanced, S3ParamsStandard } from "../../../../type/rclone/storage/parameters/s3"


const standard: S3ParamsStandard = {
    provider: {
        select: 'Alibaba',
        values: [
            "AWS", "Alibaba", "ArvanCloud", "Ceph", "ChinaMobile", "Cloudflare", 
            "DigitalOcean", "Dreamhost", "GCS", "HuaweiOBS", "IBMCOS", "IDrive", 
            "IONOS", "LyveCloud", "Leviia", "Liara", "Linode", "Minio", "Netease", 
            "Petabox", "RackCorp", "Rclone", "Scaleway", "SeaweedFS", "StackPath", 
            "Storj", "Synology", "TencentCOS", "Wasabi", "Qiniu", "Other"
        ]
    },
    env_auth: false,
    access_key_id: "",
    secret_access_key: "",
    region: "",
    endpoint: "",
    location_constraint: "",
    acl: "private",
    server_side_encryption: "",
    sse_kms_key_id: "",
    storage_class: "STANDARD",
}

const advanced: S3ParamsAdvanced = {
    bucket_acl: "private",
    requester_pays: false,
    sse_customer_algorithm: "",
    sse_customer_key: "",
    sse_customer_key_base64: "",
    sse_customer_key_md5: "",
    upload_cutoff: "200Mi",
    chunk_size: "5Mi",
    max_upload_parts: 10000,
    copy_cutoff: "4.656Gi",
    disable_checksum: false,
    shared_credentials_file: "",
    profile: "",
    session_token: "",
    upload_concurrency: 4,
    force_path_style: true,
    v2_auth: false,
    use_dual_stack: false,
    use_accelerate_endpoint: false,
    leave_parts_on_error: false,
    list_chunk: 1000,
    list_version: 0,
    list_url_encode: { select: 'unset', values: ['true', 'false', 'unset'] },
    no_check_bucket: false,
    no_head: false,
    no_head_object: false,
    encoding: "Slash,InvalidUtf8,Dot",
    disable_http2: false,
    download_url: "",
    directory_markers: false,
    use_multipart_etag: { select: 'unset', values: ['true', 'false', 'unset'] },
    use_presigned_request: false,
    versions: false,
    version_at: "",
    version_deleted: false,
    decompress: false,
    might_gzip: { select: 'unset', values: ['true', 'false', 'unset'] },
    use_accept_encoding_gzip: { select: 'unset', values: ['true', 'false', 'unset'] },
    no_system_metadata: false,
    sts_endpoint: "",
    use_already_exists: { select: 'unset', values: ['true', 'false', 'unset'] },
    use_multipart_uploads: { select: 'unset', values: ['true', 'false', 'unset'] },
    description: "",
}

const s3Defaults: DefaultParams = {
    "name": "New_Storage",
    "standard": standard,
    "advanced": advanced,
    "required": ['provider','access_key_id','secret_access_key']
}
export{s3Defaults}