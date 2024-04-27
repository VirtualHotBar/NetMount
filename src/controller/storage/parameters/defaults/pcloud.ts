import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface PcloudParamsStandard {
    client_id?: string;
    client_secret?: string;
}

interface PcloudParamsAdvanced {
    token?: string;
    auth_url?: string;
    token_url?: string;
    encoding?: string;
    root_folder_id?: string;
    hostname?: string;
    username?: string;
    password?: string;
    description?: string;
}

const standard: PcloudParamsStandard = {
    client_id: '',
    client_secret: ''
};

const advanced: PcloudParamsAdvanced = {
    token: '',
    auth_url: '',
    token_url: '',
    encoding: "Slash,BackSlash,Del,Ctl,InvalidUtf8,Dot",
    root_folder_id: "d0",
    hostname: "api.pcloud.com",
    username: '',
    password: '',
    description: ''
};


const pcloudDefaults: DefaultParams = {
    "name": "Pcloud",
    "standard": standard,
    "advanced": advanced,
    required: ["client_id", "client_secret"]
};

export { pcloudDefaults };