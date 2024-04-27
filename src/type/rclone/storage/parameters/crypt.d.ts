import { ParamsSelectType } from "../defaults";


interface CryptParamsStandard {
    remote?: string;
    filename_encryption?: ParamsSelectType;
    directory_name_encryption?: boolean;
    password?: string;
    password2?: string;
}

interface CryptParamsAdvanced {
    server_side_across_configs?: boolean;
    show_mapping?: boolean;
    no_data_encryption?: boolean;
    pass_bad_blocks?: boolean;
    strict_names?: boolean;
    filename_encoding?: ParamsSelectType;
    suffix?: string;
}

export{CryptParamsStandard, CryptParamsAdvanced}