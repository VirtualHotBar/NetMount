import { FilterType, ParamItemOptionType, StorageInfoType, StorageParamItemType } from "../../../../type/controller/storage/info";
import { alist_api_get } from "../../../../utils/alist/request";
import { rclone_api_post } from "../../../../utils/rclone/request";
import { storageInfoList } from "../../allList";

async function updateAlistStorageInfoList() {
    const alistProviders = (await alist_api_get('/api/admin/driver/list')).data//alist driver list
    const alistStorageInfoList: StorageInfoType[] = []

    for (const key in alistProviders) {
        const provider = alistProviders[key]
        const getStorageParams = (options: any[], prefix: string = '') => {
            let storageParams: StorageParamItemType[] = []
            for (const option of options) {
                let storageParam: StorageParamItemType = {
                    label: option.name,
                    name: prefix + option.name,
                    description: option.help,
                    type: 'string',
                    required: option.required,
                    default: '',
                    advanced: false,
                    isPassword: false,
                    mark: []
                }

                //类型(基础)
                let type: 'boolean' | 'number' | 'string';
                switch (option.type) {
                    case 'bool': type = 'boolean'; break;
                    case 'number': type = 'number'; break;
                    default: type = 'string'
                }
                storageParam.type = type;

                //默认值
                let defaultValue: string | number | boolean;
                if (type === 'boolean') {
                    defaultValue = Boolean(option.default)
                } else if (type === 'number') {
                    defaultValue = Number(option.default)
                } else {
                    defaultValue = option.default// 
                }
                storageParam.default = defaultValue;

                //选项
                if (option.type === 'select') {
                    storageParam.select = (option.options as string).split(',').map((item: any) => {
                        return {
                            label: item,
                            value: item,
                            help: item,
                        }
                    });
                }

                //为隐藏无用参数
                if (['mount_path', 'order', 'webdav_policy', 'web_proxy', 'remark', 'order_by', 'order_direction', 'enable_sign', 'cache_expiration', 'down_proxy_url', 'extract_folder'].includes(option.name)) {
                    storageParam.hide = true
                }


                storageParams.push(storageParam)
            }
            return storageParams
        }

        alistStorageInfoList.push({
            label: 'storage.'+provider.config.name,
            type: key,
            description: 'description.'+key.toLocaleLowerCase(),
            framework: 'alist',
            defaultParams: {
                name: provider.config.name + '_new',
                parameters: getStorageParams(provider.common).concat(getStorageParams(provider.additional, 'addition.')),
                exParameters: {
                    alist: {
                        supplement: [],
                    }
                }
            }
        })

        //console.log(provider.config);
    }

    return alistStorageInfoList
}


export { updateAlistStorageInfoList }