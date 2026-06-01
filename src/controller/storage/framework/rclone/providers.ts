import {
  FilterType,
  ParamItemOptionType,
  StorageInfoType,
  StorageParamItemType,
  RcloneProvider,
} from '../../../../type/controller/storage/info'
import { rclone_api_post } from '../../../../utils/rclone/request'

function normalizeStorageId(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

async function updateRcloneStorageInfoList() {
  const response = await rclone_api_post('/config/providers')
  const providers = (response?.providers as RcloneProvider[]) || []

  const rcloneStorageInfoList: StorageInfoType[] = []

  for (const provider of providers) {
    const storageParams: StorageParamItemType[] = []

    for (const option of provider.Options) {
      const storageParam: StorageParamItemType = {
        label: option.Name,
        name: option.Name,
        description: option.Help,
        type: 'string',
        required: option.Required,
        default: '',
        advanced: option.Advanced,
        isPassword: option.IsPassword,
        mark: [],
      }

      let type: 'boolean' | 'number' | 'string'

      switch (option.Type) {
        case 'bool':
          type = 'boolean'
          break
        case 'int':
          type = 'number'
          break
        default:
          type = 'string'
      }

      storageParam.type = type

      let defaultValue: string | number | boolean
      if (type === 'boolean') {
        defaultValue = option.Default
      } else if (type === 'number') {
        defaultValue = option.Default
      } else {
        defaultValue = option.ValueStr
      }

      storageParam.default = defaultValue

      if (type === 'string' && option.Type !== 'string') {
        const validExTypes = [
          'SpaceSepList',
          'CommaSepList',
          'Encoding',
          'SizeSuffix',
          'Duration',
          'Time',
          'Tristate',
          'Bits',
        ] as const
        if (validExTypes.includes(option.Type as (typeof validExTypes)[number])) {
          storageParam.exType = option.Type as (typeof validExTypes)[number]
        }
      }

      if (type === 'string' && option.Name.includes('remote')) {
        storageParam.mark?.push('StorageAndPathInputer')
      }

      const generateFilter = (name: string, list: string) => {
        const filters: FilterType[] = []
        const Providers = list.split('!').join('').split(',') as Array<string>
        const filterState = !list.startsWith('!')
        for (const Provider of Providers) {
          filters.push({
            name: name,
            value: Provider,
            state: filterState,
          })
        }
        return filters
      }

      if (option.Provider) {
        storageParam.filters = generateFilter('provider', option.Provider)
      }

      if (option.Examples && option.Examples.length > 0) {
        storageParam.select = option.Examples.map((item: { Value: string; Help: string }) => {
          const select: ParamItemOptionType = {
            label: item.Value,
            value: item.Value,
            help: item.Help,
          }

          if (option.Provider) {
            select.filters = generateFilter('provider', option.Provider)
          }

          return select
        })
      }

      storageParams.push(storageParam)
    }

    // S3 存储特殊处理：将 force_path_style 从高级选项提升为基础选项
    // MinIO 等自建 S3 服务需要此选项，用户反馈无法找到此设置
    if (provider.Prefix === 's3') {
      for (const param of storageParams) {
        if (param.name === 'force_path_style') {
          param.advanced = false
          break
        }
      }
    }

    // 压缩存储特殊处理：将 remote 和压缩选项从高级选项提升为基础选项
    // 用户反馈压缩存储实际不压缩，原因是关键配置项被隐藏
    if (provider.Prefix === 'compress') {
      for (const param of storageParams) {
        if (param.name === 'remote' || param.name === 'compression_mode' || param.name === 'compression_level') {
          param.advanced = false
        }
      }
    }

    rcloneStorageInfoList.push({
      label: 'storage.' + normalizeStorageId(provider.Prefix),
      type: provider.Prefix,
      description: 'description.' + normalizeStorageId(provider.Prefix),
      framework: 'rclone',
      defaultParams: {
        name: provider.Name + '_new',
        parameters: storageParams,
      },
    })
  }

  return rcloneStorageInfoList
}

export { updateRcloneStorageInfoList }
