import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface SwiftParamsStandard {
    env_auth?: boolean;
    user?: string;
    key?: string;
    auth?: string;
    user_id?: string;
    domain?: string;
    tenant?: string;
    tenant_id?: string;
    tenant_domain?: string;
    region?: string;
    storage_url?: string;
    auth_token?: string;
    application_credential_id?: string;
    application_credential_name?: string;
    application_credential_secret?: string;
    auth_version?: number;
    endpoint_type?: string;
    storage_policy?: string;
}

interface SwiftParamsAdvanced {
    leave_parts_on_error?: boolean;
    chunk_size?: string;
    no_chunk?: boolean;
    no_large_objects?: boolean;
    encoding?: string;
    description?: string;
}

const standard: SwiftParamsStandard = {
    env_auth: false,
    user: "",
    key: "",
    auth: "",
    user_id: "",
    domain: "",
    tenant: "",
    tenant_id: "",
    tenant_domain: "",
    region: "",
    storage_url: "",
    auth_token: "",
    application_credential_id: "",
    application_credential_name: "",
    application_credential_secret: "",
    auth_version: 0,
    endpoint_type: "public",
    storage_policy: "",
};

const advanced: SwiftParamsAdvanced = {
    leave_parts_on_error: false,
    chunk_size: "5Gi",
    no_chunk: false,
    no_large_objects: false,
    encoding: "Slash,InvalidUtf8",
    description: "",
};

const swiftDefaults: DefaultParams= {
    "name": "Swift",
    "standard": standard,
    "advanced": advanced,
    "required": [] // 假设 'auth' 是必需的，具体根据实际情况调整
};

export{swiftDefaults}