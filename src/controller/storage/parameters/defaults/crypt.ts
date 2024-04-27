import { DefaultParams } from "../../../../type/rclone/storage/defaults";
import { CryptParamsAdvanced, CryptParamsStandard } from "../../../../type/rclone/storage/parameters/crypt";

const standard: CryptParamsStandard = {
    remote: "",
    filename_encryption: {
        select:"standard",
        values:["standard","obfuscate","off"]
    },
    directory_name_encryption: true,
    password: "",
    password2: ""
}

const advanced: CryptParamsAdvanced = {
    server_side_across_configs: false,
    show_mapping: false,
    no_data_encryption: false,
    pass_bad_blocks: false,
    strict_names: false,
    filename_encoding: {
        select:'base32',
        values:['base32','base64','base32768']
    },
    suffix: ".bin"
}

const cryptDefaults: DefaultParams = {
    "name": "New_Storage",
    "standard": standard,
    "advanced": advanced,
    "required": ['remote', 'password']
}

export{cryptDefaults}