import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface MegaParamsStandard {
    user?: string;
    pass?: string;
}

interface MegaParamsAdvanced {
    debug?: boolean;
    hard_delete?: boolean;
    use_https?: boolean;
    encoding?: string;
    description?: string;
}

const standard: MegaParamsStandard = {
    user: "",
    pass: ""
};

const advanced: MegaParamsAdvanced = {
    debug: false,
    hard_delete: false,
    use_https: false,
    encoding: "Slash,InvalidUtf8,Dot",
    description: ""
};


const megaDefaults: DefaultParams = {
    "name": "Mega",
    "standard": standard,
    "advanced": advanced,
    "required": ['user', 'pass']
};

export{megaDefaults}