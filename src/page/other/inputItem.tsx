import { CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Form, Input, InputNumber, InputTag, Link, Message, Notification, Select, Space, Switch, Typography } from "@arco-design/web-react";
import { rcloneInfo } from "../../services/rclone";

const FormItem = Form.Item;

interface InputItemProps {
    data: { key: any, value: any };
    setParams: (key: any, value: any) => void;
}

function InputItem_module(props: InputItemProps) {
    const { t } = useTranslation()

    let valueType: 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function' | 'array' = typeof props.data.value;

    if (valueType === 'string' && (props.data.value === 'true' || props.data.value === 'false')) {
        valueType = 'boolean';
    } else if (props.data.value == '[]' || (valueType === 'object' && props.data.value instanceof Array)) {
        valueType = 'array';
    }

    const setParams = (value: any) => {
        console.log(value);

        if (valueType == 'array' && props.data.key == 'headers') {
            props.setParams(props.data.key, value.join(','))
        } else {
            props.setParams(props.data.key, value)
        }
    }

    if (valueType == 'object' && props.data.value.select) {
        setParams(props.data.value.select)
    } else {
        setParams(props.data.value)
    }

    const style: CSSProperties = {
        width: '85%'
    }

    return <FormItem label={<div className="singe-line">{t(props.data.key)}</div>} title={props.data.key}>

        {/* 输入框，string */
            valueType === 'string' &&
            <>{props.data.key.includes('pass') ?//密码
                <Input.Password style={style} allowClear key={props.data.key} defaultValue={props.data.value} onChange={(value) => setParams(value)} placeholder={t('please_input')} />
                : props.data.key === 'remote' ?//选择存储（remote:）
                    <Select
                        defaultValue={props.data.value}
                        placeholder={t('please_select')}
                        onChange={(value) => setParams(value)}
                        style={style}
                    >
                        {rcloneInfo.storageList.map((item) => (
                            <Select.Option key={item.name} value={item.name+':'}>
                                {item.name}
                            </Select.Option>
                        ))}
                    </Select> 
                    : <Input style={style} allowClear key={props.data.key} defaultValue={props.data.value} onChange={(value) => setParams(value)} placeholder={t('please_input')} />
            }</>
        }

        {valueType === 'object' && props.data.value.select != null &&/* 选择器 */
            <Select
                style={style}
                defaultValue={props.data.value.select}
                onChange={(value) => {
                    console.log(value);
                    setParams(value)
                }}
            >
                {props.data.value.values.map((item: string, index: number) => (
                    <Select.Option key={index} value={item}>{t(item)}</Select.Option>
                ))}
            </Select>
        }

        {valueType === 'number' &&/* 数字输入框 */
            <InputNumber
                mode='button'
                defaultValue={props.data.value}
                onChange={(value) => setParams(value)}
                style={style}
            />}

        {valueType === 'boolean' &&/* 开关 */
            <Switch defaultChecked={props.data.value} onChange={(value) => setParams(value)} />
        }

        {valueType === 'array' && (
            <InputTag
                defaultValue={props.data.value}
                allowClear
                tokenSeparators={[',']}
                placeholder={t('Input_and_press_enter')}
                onChange={(value) => {
                    setParams(value);
                }}
                style={style}
            />
        )}

        <br />

    </FormItem>
}

export { InputItem_module }