import { FilterType, ParamItemOptionType, StorageInfoType, StorageParamItemType } from "../../type/controller/storage/info";
import { rclone_api_post } from "../../utils/rclone/request";

const storageInfoList: StorageInfoType[] = []

async function updateStorageInfoList() {
    const providers = (await rclone_api_post('/config/providers')).providers as Array<any>


    console.log(providers);

    //let typeList: Array<string> = []

    for (const provider of providers) {
        let storageParams: StorageParamItemType[] = []

        for (const option of provider.Options) {

            //console.log(option.Name);

            //console.log(option.Type);

            /*             if(option.DefaultStr !== option.ValueStr){//DefaultStr和ValueStr区别是，前者DefaultStr包含‘<nil>’字符串
                            console.log(option.DefaultStr,option.ValueStr);
                        } */
            //all type: ['string', 'bool', 'CommaSepList', 'Encoding', 'SizeSuffix', 'int', 'Duration', 'SpaceSepList', 'Time', 'Tristate', 'Bits']
            /*if (!typeList.includes(option.Type)) {
                            typeList.push(option.Type)
                        } */

            let storageParam: StorageParamItemType = {
                label: option.Name,
                name: option.Name,
                description: option.Help,
                type: 'string',
                required: option.Required,
                default: '',
                advanced: option.Advanced,
                isPassword: option.IsPassword,
                mark: []
            }

            //类型(基础)
            let type: 'boolean' | 'number' | 'string';

            switch (option.Type) {
                case 'bool': type = 'boolean'; break;
                case 'int': type = 'number'; break;
                default: type = 'string'
            }

            storageParam.type = type;

            //默认值
            let defaultValue: string | number | boolean;
            if (type === 'boolean') {
                defaultValue = option.Default
            } else if (type === 'number') {
                defaultValue = option.Default
            } else {
                defaultValue = option.ValueStr// option.DefaultStr
            }

            storageParam.default = defaultValue;

            //扩展类型
            if (type === 'string' && option.Type!== 'string') {
                storageParam.exType = option.Type;
            }

            //特殊标记（实现选择本地数据）
            if (type === 'string' && option.Name.includes('remote')) {//本地存储数据
                storageParam.mark?.push('StorageAndPathInputer');
            }

            //过滤器
            const generateFilter = (name: string, list: string) => {
                let filters: FilterType[] = []
                const Providers = list.split('!').join('').split(',') as Array<string>;
                const filterState = !list.startsWith('!')
                for (const Provider of Providers) {
                    filters.push({
                        name: name,
                        value: Provider,
                        state: filterState
                    })
                    //console.log(filterState ? Provider : Provider.substring(1));
                }
                //console.log(filters);

                return filters
            }

            if (option.Provider) {
                storageParam.filters = generateFilter('provider', option.Provider);
            }

            /* if(option.ShortOpt){//短选项
                console.log(option.ShortOpt,option);
            } */



            //选项
            if (option.Examples && option.Examples.length > 0) {
                storageParam.select = option.Examples.map((item: any) => {
                    let select: ParamItemOptionType = {
                        label: item.Value,
                        value: item.Value,
                        help: item.Help,
                    }

                    if (option.Provider) {
                        select.filters = generateFilter('provider', option.Provider);
                    }

                    return select
                })
                //console.log(storageParam);
            }

            storageParams.push(storageParam)
        }


        storageInfoList.push({
            label: provider.Name,
            type: provider.Prefix,
            description: provider.Description,
            defaultParams: {
                name: provider.Name + '_new',
                parameters: storageParams
            }
        })
    }
}

//根据标识返回StorageListAll
function searchStorageInfo(v: string | undefined, displayType: boolean = false): StorageInfoType {
    for (const storageItem of storageInfoList) {
        if (!displayType) {
            if ((storageItem.description === v || storageItem.label === v || storageItem.type === v) && !storageItem.displayType) {
                return storageItem
            }
        } else {
            if (storageItem.description === v || storageItem.label === v || storageItem.displayType === v) {
                return storageItem
            }
        }
    }
    return storageInfoList[0]
}


export { searchStorageInfo, updateStorageInfoList, storageInfoList }