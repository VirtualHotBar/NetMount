import { CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Form, FormInstance, FormItemProps, Grid, Input, InputNumber, InputTag, Link, Message, Notification, Select, Space, Switch, Tooltip, Typography } from "@arco-design/web-react";
import { rcloneInfo } from "../../services/rclone";
import { FilterType, StorageParamItemType } from "../../type/controller/storage/info";
import { ParametersType } from "../../type/defaults";
import { t } from "i18next";
import { IconQuestionCircle } from "@arco-design/web-react/icon";
import { getProperties } from "../../utils/utils";
import { convertStoragePath, filterHideStorage, formatPathRclone, searchStorage } from "../../controller/storage/storage";
import { alistInfo } from "../../services/alist";
const Row = Grid.Row;
const Col = Grid.Col;
const FormItem = Form.Item;

function paramsType2FormItems(params: ParametersType, isAdvanced: boolean = false,filter:string[]=[]) {//丢弃key匹配filter的项
    const formItems: StorageParamItemType[] = []

    getProperties(params).forEach((item) => {
        if (filter.includes(item.key)) return;
        
        let valueType: 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function' | 'array' = typeof item.value;
        let formItem: StorageParamItemType = {
            label: item.key,
            name: item.key,
            description: item.key,
            type: 'boolean',
            required: false,
            default: item.value,
            advanced: isAdvanced,
            isPassword: false,
            //mark: []
        }
        switch (valueType) {
            case 'boolean':
                formItem.type = 'boolean'
                break;
            case 'number':
                formItem.type = 'number'
                break;
         case 'object':
                if (item.value.select) {//选择器
                    formItem.type = 'string'
                    formItem.default = item.value.default
                    formItem.select = item.value.select.map((item: string) => {
                        return {
                            label: item,
                            value: item,
                            help: item
                        }
                    })

                } else {
                    formItem.type = 'string'
                }
                break; 
            default:
                formItem.type = 'string'
                break;
        }
        formItems.push(formItem)
    })

    return formItems
}


//应用过滤器
function filter(filters: FilterType[], formValuesResult: ParametersType) {
    if (filters.length == 0) return undefined
    for (const filter of filters) {
        if (formValuesResult[filter.name] && formValuesResult[filter.name].includes(filter.value)) {
            //console.log('匹配到:', formValuesResult[filter.name], filter.value, filter.state);

            return filter.state
        }
    }
    //console.log('未找到:', formValuesResult.provider, filters);
    return false
}


function StorageAndPathInputer({ value, onChange }: { value?: string, onChange?(value: string): void }) {
    if (value == undefined) value = '';
    if (value.includes(alistInfo.markInRclone)) {
        let tempPath = formatPathRclone(value.substring(value.indexOf(':') + 1));
        if (tempPath.includes('/')) {
            value = tempPath.replace('/', ':')
        } else {
            value = tempPath + ':';
        }
    }

    const separatorIndex = value.indexOf(':')
    let storageName = value.substring(0, separatorIndex)
    let path = formatPathRclone(value.substring(separatorIndex + 1))

    /*const formatPath = (path: string) => {
            path = path.replace(/\\/g, '/');
            path = path.replace(/\/+/g, '/');
    
            if (path.substring(0, 1) != '/') {
                path = '/' + path;
            }
    
            return path
        } */


    const change = () => {
        storageName && onChange && onChange(convertStoragePath(storageName, path)!);
    }
    return <>
        <Row>
            <Col flex={'7rem'}>
                <Select
                    value={storageName}
                    placeholder={t('please_select')}
                    onChange={(value) => {
                        storageName = value;
                        change()
                    }}
                >
                    {filterHideStorage(rcloneInfo.storageList).map((item) => (
                        <Select.Option key={item.name} value={item.name}>
                            {item.name}
                        </Select.Option>
                    ))}
                </Select>
            </Col>
            <Col flex={'auto'}>
                <Input
                    value={'/' + path}
                    onChange={(value) => {
                        path = formatPathRclone(value);
                        change()
                    }}
                    disabled={!storageName}
                />
            </Col>
            <Col flex={'2rem'}>
                <Tooltip content={t('explain_for_task_path_format')}>
                    <Button icon={<IconQuestionCircle />} />
                </Tooltip>
            </Col>
        </Row>
    </>
}

function InputFormItemContent_module({ data, formValuesResult /* style */ }: {
    data: StorageParamItemType;
    formValuesResult?: ParametersType;
    /* style?: CSSProperties; */
}) {
    const { t } = useTranslation()

    let content: JSX.Element
    switch (data.type) {
        case 'boolean':
            content = <Switch /* defaultChecked={data.default} */ />
            break;
        case 'number':
            content = <InputNumber mode='button'/* defaultValue={data.default}  */ />
            break;
        default://case 'string':
            if (data.mark) {//特殊的输入器
                if (data.mark.includes('StorageAndPathInputer')) {//存储和路径输入器
                    content = <StorageAndPathInputer />;
                    break;
                }

            }

            if (data.select) {//选择器
                let selectContent: JSX.Element[] = [];

                for (const item of data.select) {
                    //过滤
                    const filterState = (formValuesResult && item.filters) ? filter(item.filters, formValuesResult) : true;
                   
                    if (filterState) selectContent.push(<Select.Option value={item.value} key={item.value}>{t(item.label)}</Select.Option>)
                }

                content = <Select placeholder={t('please_select')}>{selectContent}</Select>
            } else if (data.isPassword) {//密码
                content = <Input.Password placeholder={t('please_input')} />
            } else {
                content = <Input placeholder={t('please_input')} />
            }
            break;
    }

    return content

}

function InputForm_module({ data, style, showAdvanced, footer, onChange, overwriteValues, setFormHook, header }: {
    data: StorageParamItemType[];
    footer?: JSX.Element;
    header?: JSX.Element;
    showAdvanced?: boolean;
    style?: CSSProperties;
    onChange?: (data: ParametersType) => void;
    overwriteValues?: ParametersType;
    setFormHook?: (form: FormInstance) => void;
}) {
    const { t } = useTranslation()
    const [form] = Form.useForm();

    const [formValuesResult, setFormValuesResult] = useState<ParametersType>({});

    if (showAdvanced === undefined) showAdvanced = false;
    useEffect(() => {
        setFormHook && setFormHook(form);
        if (overwriteValues) form.setFieldsValue(overwriteValues);
    }, [])

    useEffect(() => {
        onChange && onChange(formValuesResult)
    }, [formValuesResult])


    return (
        <Form
            form={form}
            onValuesChange={() => {
                setFormValuesResult(form.getFieldsValue(form.getTouchedFields()));
            }}>
            {header && header}
            {
                (() => {
                    const formItems: JSX.Element[] = []

                    for (const dataItem of data) {
                        //过滤
                        const filterState = (dataItem.filters && formValuesResult) ? filter(dataItem.filters, formValuesResult) : undefined;

                        formItems.push(
                            <FormItem
                                requiredSymbol={false}
                                label={<div className="singe-line" title={t(dataItem.label)}>{dataItem.required && '*'}{t(dataItem.label)}</div>}
                                title={dataItem.description}
                                field={dataItem.name}
                                triggerPropName={dataItem.type === 'boolean' ? 'checked' : 'value'}
                                initialValue={dataItem.default}
                                rules={[{ required: dataItem.required }]}
                                hidden={dataItem.hide !== undefined ? dataItem.hide : (filterState !== undefined ? (!filterState) : (dataItem.advanced && !showAdvanced))}
                                style={{ ...style }}>
                                {InputFormItemContent_module({ data: dataItem, formValuesResult: formValuesResult })}
                            </FormItem>
                        )
                    }

                    return formItems.filter(item => item && item)
                })()
            }
            {footer && footer}
        </Form>
    )
}

export { InputForm_module, paramsType2FormItems, InputFormItemContent_module }