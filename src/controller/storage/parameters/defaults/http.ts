import { DefaultParams } from "../../../../type/rclone/storage/defaults";


interface HTTPParamsStandard {
    url: string;
}

interface HTTPParamsAdvanced {
    headers?: string; // Assuming this to be a string for simplification
    no_slash?: boolean;
    no_head?: boolean;
    description?: string;
}

const standard: HTTPParamsStandard = {
    url: "", // This should be provided by the user since it's required
}

const advanced: HTTPParamsAdvanced = {
    headers: "",
    no_slash: false,
    no_head: false,
    description: ""
}

const httpDefaults: DefaultParams = {
    "name": "http",
    "standard": standard,
    "advanced": advanced,
    "required": ['url']
}

export{httpDefaults}