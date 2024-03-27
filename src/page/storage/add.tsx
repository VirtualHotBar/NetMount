import { Button, Checkbox, Form, Input, InputNumber, InputTag, Link, Message, Notification, Select, Space, Switch, Typography } from "@arco-design/web-react";
import { DefaultParams, ParametersType } from "../../type/rclone/storage/defaults";
import { useTranslation } from "react-i18next";
import { searchStorage, storageListAll } from "../../controller/storage/listAll";
import { CSSProperties, useEffect, useState } from "react";
import { checkParams, createStorage } from "../../controller/storage/create";
import { useNavigate, useParams } from "react-router-dom";
import { getProperties, getURLSearchParam } from "../../utils/rclone/utils";
import { getStorageParams } from "../../controller/storage/storage";
const FormItem = Form.Item;



function AddStorage_page() {
    const { t } = useTranslation()
    const navigate = useNavigate();

    const [selectStorage, setSelectStorage] = useState<string>()
    const [defaultParams, setDefaultParams] = useState<DefaultParams>()
    const [step, setStep] = useState(0)//0:选择类型，1:填写参数
    const [showAdvanced, setShowAdvanced] = useState(false)

    const [storageName, setStorageName] = useState('')//存储名称

    let parameters: ParametersType = {};

    const setParams = (key: string, value: any) => {
        parameters[key] = value;
    };

    const editMode = async () => {
        const type = getURLSearchParam('type')
        const name = getURLSearchParam('name')
        const storage = await getStorageParams(name)

        setSelectStorage(type)
        setStorageName(name)

        let defaultParamsEdit = searchStorage(type).defaultParams


        const overwriteParams = (params: ParametersType) => {
            getProperties(params).forEach((paramsItem) => {
                if (storage[paramsItem.key]) {
                    const valueType = typeof params[paramsItem.key]
                    if (valueType === 'object' && !(params[paramsItem.key] instanceof Array)) {
                        if (params[paramsItem.key].values.includes(storage[paramsItem.key])) {
                            params[paramsItem.key].select = storage[paramsItem.key]
                        }
                    } else {
                        params[paramsItem.key] = storage[paramsItem.key];
                    }
                }
            })
        }

        overwriteParams(defaultParamsEdit.standard)
        overwriteParams(defaultParamsEdit.advanced)

        setDefaultParams(defaultParamsEdit)

        setStep(1)
    }

    useEffect(() => {
        if (getURLSearchParam('edit')) {
            editMode()
        }
    }, [])


    return <>
        {step == 0 ?/* 选择类型 */
            <div className=" w-full h-full">
                <Form autoComplete='off'>
                    <FormItem label={t('storage_type')}>
                        <Select
                            placeholder={t('please_select')}
                            style={{ width: 154 }}
                            value={selectStorage}
                            onChange={(value) => {
                                setSelectStorage(value)
                                setDefaultParams(searchStorage(value).defaultParams)
                                setStorageName(searchStorage(value).defaultParams.name)
                            }}
                        >
                            {storageListAll.map((storageItem, index) => (
                                <Select.Option key={index} value={storageItem.type}>
                                    {storageItem.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </FormItem>


                    {/* 存储介绍 */}
                    {selectStorage ? <FormItem label={t('storage_introduce')}>{
                        storageListAll.map((storageItem) => {
                            if (storageItem.type == selectStorage) {
                                return t(storageItem.introduce ? storageItem.introduce : '')
                            }
                        })
                    }
                    </FormItem> : ''}

                    <br />


                    {/* 按钮 */}
                    <div style={{ width: '100%', textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => { navigate('/storage/manage') }} >{t('step_back')}</Button>
                            <Button onClick={() => { setStep(1) }} disabled={!selectStorage} type='primary'>{t('step_next')}</Button>
                        </Space>
                    </div>
                </Form>
            </div>
            : step == 1 ?/* 填写参数 */
                <div className=" w-full h-full">
                    <Form autoComplete='off'>
                        <InputItem data={{ key: 'StorageName', value: storageName }} setParams={(key: any, value: any) => { key && setStorageName(value) }} />

                        {
                            getProperties(defaultParams!.standard).map((paramsItem) => {
                                return (
                                    <InputItem key={paramsItem.key} data={paramsItem} setParams={setParams} />
                                )
                            })
                        }



                        <div style={{ display: showAdvanced ? 'block' : 'none' }}>

                            {//高级选项
                                getProperties(defaultParams!.advanced).map((paramsItem) => {
                                    return (
                                        <InputItem key={paramsItem.key} data={paramsItem} setParams={setParams} />
                                    )
                                })}

                        </div>
                    </Form>
                    <br />
                    <div style={{ width: '100%', textAlign: 'right' }}>
                        <Space>
                            {
                                //高级选项
                                !showAdvanced &&
                                <Button onClick={() => setShowAdvanced(true)} type='text'>{t('show_advanced_options')} </Button>
                            }
                            <Button onClick={() => { getURLSearchParam('edit') ? navigate('/storage/manage') : setStep(0) }}>{t('step_back')}</Button>
                            <Button onClick={async () => {
                                console.log(storageName, parameters);

                                const { isOk, msg } = checkParams(storageName, parameters, searchStorage(selectStorage).defaultParams, t)
                                if (isOk) {
                                    if (await createStorage(storageName, selectStorage!, parameters)) {
                                        Notification.success({
                                            title: t('success'),
                                            content: t('Storage_added_successfully'),
                                        })
                                        navigate('/storage/manage')
                                    } else {
                                        Notification.error({
                                            title: t('error'),
                                            content: t('Storage_added_failed'),
                                        })
                                    }
                                } else {
                                    Message.error(msg)
                                }
                            }} type='primary'>{t('save')}</Button>
                        </Space>
                    </div>
                </div>
                : ''
        }</>
}


interface InputItemProps {
    data: { key: any, value: any };
    setParams: (key: any, value: any) => void;
}

function InputItem(props: InputItemProps) {
    const { t } = useTranslation()

    let valueType: 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function' | 'array' = typeof props.data.value;

    if (valueType === 'string' && (props.data.value === 'true' || props.data.value === 'false')) {
        valueType = 'boolean';
    } else if (props.data.value=='[]'||(valueType === 'object' && props.data.value instanceof Array)) {
        valueType = 'array';
    }

    const setParams = (value: any) => {
        console.log(value);
        
        if (valueType == 'array') {
            props.setParams(props.data.key, value.join(','))
        }else{
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

    return <FormItem label={t(props.data.key)}>

        {
            valueType === 'string' &&/* 输入框，string */
            <>{props.data.key != 'pass' ?
                <Input style={style} allowClear key={props.data.key} defaultValue={props.data.value} onChange={(value) => setParams(value)} placeholder={t('please_input')} /> :
                <Input.Password style={style} allowClear key={props.data.key} defaultValue={props.data.value} onChange={(value) => setParams(value)} placeholder={t('please_input')} />
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

export { AddStorage_page }