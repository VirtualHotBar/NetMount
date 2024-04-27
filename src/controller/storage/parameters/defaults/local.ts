import { DefaultParams } from "../../../../type/rclone/storage/defaults";
import { LocalParamsAdvanced, LocalParamsStandard } from "../../../../type/rclone/storage/parameters/local";

const standard: LocalParamsStandard = {
    // 对于本地文件系统，标准参数通常不需要
}

const advanced: LocalParamsAdvanced = {
    nounc: false,
    copy_links: false,
    links: false,
    skip_links: false,
    zero_size_links: false,
    unicode_normalization: false,
    no_check_updated: false,
    one_file_system: false,
    case_sensitive: false,
    case_insensitive: false,
    no_preallocate: false,
    no_sparse: false,
    no_set_modtime: false,
    encoding: "Slash,Dot",
    description: "",
}

const localDefaults: DefaultParams = {
    "name": "New_Storage",
    "standard": standard,
    "advanced": advanced,
    "required": []
}

export { localDefaults };