import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface OpenDriveParamsStandard {
    username?: string;
    password?: string;
}

interface OpenDriveParamsAdvanced {
    encoding?: string;
    chunk_size?: string; 
    description?: string;
}

const standard: OpenDriveParamsStandard = {
    username: "",
    password: ""
};

const advanced: OpenDriveParamsAdvanced = {
    encoding: "Slash,LtGt,DoubleQuote,Colon,Question,Asterisk,Pipe,BackSlash,LeftSpace,LeftCrLfHtVt,RightSpace,RightCrLfHtVt,InvalidUtf8,Dot",
    chunk_size: "10Mi",
    description: ""
};


const opendriveDefaults: DefaultParams = {
    "name": "OpenDrive",
    "standard": standard,
    "advanced": advanced,
    "required": ['username', 'password']
};

export{opendriveDefaults}