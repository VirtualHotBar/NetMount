import { useTranslation } from 'react-i18next'
import { Switch, InputNumber, Select, Input } from '@arco-design/web-react'
import { StorageParamItemType } from '../../type/controller/storage/info'
import { ParametersType } from '../../type/defaults'
import { FilterType } from '../../type/controller/storage/info'
import { StorageAndPathInputer } from './StorageAndPathInputer'
import { HumanizedValueInput } from './HumanizedValueInput'

//应用过滤器
function filter(filters: FilterType[], formValuesResult: ParametersType) {
  if (filters.length == 0) return undefined
  for (const filter of filters) {
    const value = formValuesResult[filter.name]
    if (typeof value === 'string' && value.includes(String(filter.value))) {
      return filter.state
    }
    if (Array.isArray(value) && value.includes(filter.value)) {
      return filter.state
    }
  }
  return false
}

function InputFormItemContent_module({
  data,
  formValuesResult,
  isEditMode,
  framework,
}: {
  data: StorageParamItemType
  formValuesResult?: ParametersType
  isEditMode?: boolean
  framework?: 'rclone' | 'openlist'
}) {
  const { t } = useTranslation()

  let content: JSX.Element
  switch (data.type) {
    case 'boolean':
      content = <Switch />
      break
    case 'number':
      if (data.exType === 'SizeSuffix') {
        content = <HumanizedValueInput mode="size" />
      } else if (data.exType === 'Duration') {
        content = <HumanizedValueInput mode="duration" />
      } else {
        content = <InputNumber mode="button" />
      }
      break
    default: //case 'string':
      if (data.mark) {
        //特殊的输入器
        if (data.mark.includes('StorageAndPathInputer')) {
          //存储和路径输入器
          content = <StorageAndPathInputer />
          break
        }
      }

      if (data.select) {
        //选择器
        const selectContent: JSX.Element[] = []

        for (const item of data.select) {
          //过滤
          const filterState =
            formValuesResult && item.filters ? filter(item.filters, formValuesResult) : true

          if (filterState)
            selectContent.push(
              <Select.Option value={item.value} key={item.value}>
                {t(item.label)}
              </Select.Option>
            )
        }

        content = <Select placeholder={t('please_select')}>{selectContent}</Select>
      } else if (data.isPassword) {
        //密码 - 编辑模式下显示提示（仅rclone存储）
        const placeholderText = isEditMode && framework === 'rclone'
          ? t('password_obscured_hint')
          : t('please_input')
        content = <Input.Password placeholder={placeholderText} />
      } else {
        content = <Input placeholder={t('please_input')} />
      }
      break
  }

  return content
}

export { InputFormItemContent_module, filter }
