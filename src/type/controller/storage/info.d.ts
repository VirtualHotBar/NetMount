
//过滤器
interface FilterType {
    name: string,//匹配参数名
    value: any,//匹配值
    state: boolean,//是否过滤
}

interface ParamItemOptionType {
    label: string,//选项名称(显示名称)
    value: string | number,//选项值
    help: string,//选项帮助信息

    filters?: FilterType[],//过滤自己
}

interface StorageParamItemType {
    label: string,//参数名称(显示名称)
    name: string,//参数名
    description: string,//参数描述
    type: 'string' | 'number' | 'boolean',//参数类型，基础类型
    exType?: 'SpaceSepList' | 'CommaSepList' | 'Encoding' | 'SizeSuffix' | 'Duration' | 'Time' | 'Tristate' | 'Bits',//扩展类型,commaSepList:逗号分隔列表,spaceSepList:空格分隔列表
    default: any,//默认值
    required: boolean,//是否必填
    advanced: boolean,//是否高级参数
    select?: ParamItemOptionType[],//可选值
    isPassword: boolean,//是否是密码

    hide?: boolean,//是否隐藏,优先于filters
    filters?: FilterType[],

    mark?: ('StorageAndPathInputer' | 'PathInputer')[],//参数标记,StorageSelector:存储选择器
    //formatRules:''
}


interface StorageParamsType {
    name: string,//存储名称
    parameters: StorageParamItemType[],//参数列表
    exParameters?:{//扩展参数
        /* rclone?:{
            
        } */
        openlist?:{
            supplement?: StorageParamItemType[]
        }
    }
}

interface StorageInfoType {
    framework: 'rclone'|'openlist';//框架
    label: string;//存储名称(显示)
    type: string;//存储类型
    description: string;//存储描述
    defaultParams: StorageParamsType;//默认参数
    displayType?: string;
    otherConfig?:{
        rclone?:{
            
        }
        openlist?:{

        }
    }
}

export { StorageInfoType, StorageParamsType, StorageParamItemType, ParamItemOptionType, FilterType }