// 定义 LocalParamsStandard 类型，这里暂无具体参数
interface LocalParamsStandard {
    // 这里可以添加未来可能会有的标准参数
}

// 定义 LocalParamsAdvanced 类型，包含你给出的所有高级选项
interface LocalParamsAdvanced {
    nounc: boolean,
    copy_links: boolean,
    links: boolean,
    skip_links: boolean,
    zero_size_links: boolean,
    unicode_normalization: boolean,
    no_check_updated: boolean,
    one_file_system: boolean,
    case_sensitive: boolean,
    case_insensitive: boolean,
    no_preallocate: boolean,
    no_sparse: boolean,
    no_set_modtime: boolean,
    encoding: string,
    description: string
}

export{LocalParamsStandard, LocalParamsAdvanced}