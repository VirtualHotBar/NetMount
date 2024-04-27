import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface QingStorParamsStandard {
    env_auth?: boolean;
    access_key_id?: string;
    secret_access_key?: string;
    endpoint?: string;
    zone?: string;
}

interface QingStorParamsAdvanced {
    connection_retries?: number;
    upload_cutoff?: string; // 假设 SizeSuffix 可以被表示为 string
    chunk_size?: string; // 假设 SizeSuffix 可以被表示为 string
    upload_concurrency?: number;
    encoding?: string;
    description?: string;
}

const standard: QingStorParamsStandard = {
    env_auth: false,
    access_key_id: '',
    secret_access_key: '',
    endpoint: "https://qingstor.com:443",
    zone: "pek3a"
};

const advanced: QingStorParamsAdvanced = {
    connection_retries: 3,
    upload_cutoff: "200Mi",
    chunk_size: "4Mi",
    upload_concurrency: 1,
    encoding: "Slash,Ctl,InvalidUtf8",
    description: ''
};


const qingstorDefaults: DefaultParams = {
    "name": "QingStor",
    "standard": standard,
    "advanced": advanced,
    required: ["access_key_id", "secret_access_key"]
};

export { qingstorDefaults }