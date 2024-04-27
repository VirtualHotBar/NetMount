import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface JottacloudParamsStandard {
    client_id?: string;
    client_secret?: string;
}

interface JottacloudParamsAdvanced {
    token?: string;
    auth_url?: string;
    token_url?: string;
    md5_memory_limit?: string;
    trashed_only?: boolean;
    hard_delete?: boolean;
    upload_resume_limit?: string;
    no_versions?: boolean;
    encoding?: string;
    description?: string;
}

const standard: JottacloudParamsStandard = {
    client_id: "",
    client_secret: "",
}

const advanced: JottacloudParamsAdvanced = {
    token: "",
    auth_url: "",
    token_url: "",
    md5_memory_limit: "10Mi",
    trashed_only: false,
    hard_delete: false,
    upload_resume_limit: "10Mi",
    no_versions: false,
    encoding: "Slash,LtGt,DoubleQuote,Colon,Question,Asterisk,Pipe,Del,Ctl,InvalidUtf8,Dot",
    description: "",
}

const jottacloudDefaults: DefaultParams = {
    "name": "Jottacloud",
    "standard": standard,
    "advanced": advanced,
    "required": [] // 根据实际情况调整必须的参数
};

export{jottacloudDefaults}