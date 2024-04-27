import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface BoxParamsStandard {
    client_id?: string;
    client_secret?: string;
}

interface BoxParamsAdvanced {
    upload_cutoff?: number;
    commit_retries?: number;
}

const standard: BoxParamsStandard = {
    client_id: "",
    client_secret: ""
}

const advanced: BoxParamsAdvanced = {
    upload_cutoff: 52428800,
    commit_retries: 100
}

const boxDefaults: DefaultParams = {
    "name": "Box",
    "standard": standard,
    "advanced": advanced,
    required:['client_id','client_secret']
}

export{boxDefaults}