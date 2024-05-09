import { CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Form, FormInstance, FormItemProps, Grid, Input, InputNumber, InputTag, Link, Message, Notification, Select, Space, Switch, Tooltip, Typography } from "@arco-design/web-react";
import { rcloneInfo } from "../../services/rclone";
import { FilterType, StorageParamItemType } from "../../type/controller/storage/info";
import { ParametersType } from "../../type/defaults";
import { t } from "i18next";
import { IconQuestionCircle } from "@arco-design/web-react/icon";
const Row = Grid.Row;
const Col = Grid.Col;
const FormItem = Form.Item;

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
    const separatorIndex = value.indexOf(':')

    const formatPath = (path: string) => {
        path = path.replace(/\\/g, '/');
        path = path.replace(/\/+/g, '/');

        if (path.substring(0, 1) != '/') {
            path = '/' + path;
        }

        return path
    }

    let storage = value.substring(0, separatorIndex)
    let path = formatPath(value.substring(separatorIndex + 1))

    const change = () => {
        storage && onChange && onChange(storage + ':' + path);
    }
    return <>
        <Row>
            <Col flex={'7rem'}>
                <Select
                    value={storage}
                    placeholder={t('please_select')}
                    onChange={(value) => {
                        storage = value;
                        change()
                    }}
                >
                    {rcloneInfo.storageList.map((item) => (
                        <Select.Option key={item.name} value={item.name}>
                            {item.name}
                        </Select.Option>
                    ))}
                </Select>
            </Col>
            <Col flex={'auto'}>
                <Input
                    value={path}
                    onChange={(value) => {
                        path = formatPath(value);
                        change()
                    }}
                    disabled={!storage}
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

function InputForm_module({ data, style, showAdvanced, footer, onChange, overwriteValues, setFormHook }: {
    data: StorageParamItemType[];
    footer?: JSX.Element;
    showAdvanced?: boolean;
    style?: CSSProperties;
    onChange?: (data: ParametersType) => void;
    overwriteValues?: ParametersType;
    setFormHook?: (form: FormInstance) => void;
}) {
    //console.log(data);

    const { t } = useTranslation()
    const [form] = Form.useForm();

    const [formValuesResult, setFormValuesResult] = useState<ParametersType>({});

    if (showAdvanced === undefined) showAdvanced = false;
    useEffect(() => {
        setFormHook && setFormHook(form);
        if (overwriteValues) form.setFieldsValue(overwriteValues);
    }, [])

    useEffect(() => {
        console.log(formValuesResult);
        onChange && onChange(formValuesResult)
    }, [formValuesResult])


    return (
        <Form
            form={form}

            onValuesChange={() => {
                setFormValuesResult(form.getFieldsValue(form.getTouchedFields()));
            }}>
            {
                (() => {
                    const formItems: JSX.Element[] = []

                    for (const dataItem of data) {
                        //过滤
                        const filterState = (dataItem.filters && formValuesResult) ? filter(dataItem.filters, formValuesResult) : undefined;

                        formItems.push(
                            <FormItem
                                requiredSymbol={false}
                                label={<div className="singe-line">{dataItem.required && '*'}{t(dataItem.label)}</div>}
                                title={dataItem.description}
                                field={dataItem.name}
                                triggerPropName={dataItem.type === 'boolean' ? 'checked' : 'value'}
                                initialValue={dataItem.default}
                                rules={[{ required: dataItem.required }]}
                                hidden={filterState !== undefined ? (!filterState) : (dataItem.advanced && !showAdvanced)}
                                style={{ ...style }}>
                                {InputFormItemContent_module({ data: dataItem, formValuesResult: formValuesResult })}
                            </FormItem>
                        )
                    }

                    return formItems.filter(item => item && item)
                })()
            }
            {
                footer && <FormItem wrapperCol={{ offset: 5 }}>
                    {footer}
                </FormItem>
            }
        </Form>
    )
}

export { InputForm_module }