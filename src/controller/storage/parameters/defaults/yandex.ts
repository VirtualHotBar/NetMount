import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface YandexParamsStandard {
    client_id?: string;
    client_secret?: string;
}

interface YandexParamsAdvanced {
    token?: string;
    auth_url?: string;
    token_url?: string;
    hard_delete?: boolean;
    encoding?: string;
    description?: string;
}

const standard: YandexParamsStandard = {
    client_id: '',
    client_secret: ''
};

const advanced: YandexParamsAdvanced = {
    token: '',
    auth_url: '',
    token_url: '',
    hard_delete: false,
    encoding: "Slash,Del,Ctl,InvalidUtf8,Dot",
    description: ''
};


const yandexDefaults: DefaultParams = {
    "name": "Yandex",
    "standard": standard,
    "advanced": advanced,
    required: [
        "client_id",
        "client_secret"
    ],
};

export{yandexDefaults}