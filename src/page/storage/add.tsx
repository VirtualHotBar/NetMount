import { Button, Checkbox, Input, InputNumber, InputTag, Link, Message, Select } from "@arco-design/web-react";
import { webdavDefaults } from "../../controller/storage/parameters/defaults/webdav";
import { DefaultParams, ParametersType } from "../../type/rclone/storage/defaults";
import { useTranslation } from "react-i18next";
import { searchStorage, storageListAll } from "../../controller/storage/listAll";
import { useEffect, useState } from "react";
import { checkParams, createStorage } from "../../controller/storage/create";
import { useNavigate, useParams } from "react-router-dom";
import { getURLSearchParam } from "../../utils/rclone/utils";
import { getStorageParams } from "../../controller/storage/storage";

function getProperties(obj: Record<string, any>) {

    let result: Array<{ key: any, value: any }> = []

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            result.push({ key: key, value: obj[key] })
        }
    }

    return result
}


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

        console.log(defaultParamsEdit);

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
                {t('storage_type')}: <Select
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
                <br />

                {/* 存储介绍 */}
                {selectStorage ? <>{t('storage_introduce')}:{
                    storageListAll.map((storageItem) => {
                        if (storageItem.type == selectStorage) {
                            return t(storageItem.introduce ? storageItem.introduce : '')
                        }
                    })
                }
                </> : ''}

                <br />


                {/* 按钮 */}
                <Button onClick={() => { setStep(1) }} disabled={!selectStorage}>{t('step_next')}</Button>
            </div>
            : step == 1 ?/* 填写参数 */

                <div className=" w-full h-full">
                    <InputItem data={{ key: 'StorageName', value: storageName }} setParams={(key: any, value: any) => { key && setStorageName(value) }} />

                    {
                        getProperties(defaultParams!.standard).map((paramsItem) => {
                            return (
                                <InputItem key={paramsItem.key} data={paramsItem} setParams={setParams} />
                            )
                        })
                    }

                    {
                        //高级选项
                        !showAdvanced &&
                        <Link onClick={() => setShowAdvanced(true)} >{t('show_advanced_options')} </Link>
                    }

                    <div style={{ display: showAdvanced ? 'block' : 'none' }}>
                        {//高级选项
                            getProperties(defaultParams!.advanced).map((paramsItem) => {
                                return (
                                    <InputItem key={paramsItem.key} data={paramsItem} setParams={setParams} />
                                )
                            })}
                    </div>

                    <Button onClick={() => setStep(0)}>{t('step_back')}</Button>
                    <Button onClick={async () => {
                        console.log(storageName, parameters);

                        const { isOk, msg } = checkParams(storageName, parameters, searchStorage(selectStorage).defaultParams, t)
                        if (isOk) {
                            if (await createStorage(storageName, selectStorage!, parameters)) {
                                Message.success(t('Storage_added_successfully'))
                                navigate('/storage/manage')
                            } else {
                                Message.error(t('Storage_added_failed'))
                            }
                        } else {
                            Message.error(msg)
                        }
                    }}>{t('save')}</Button>
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
    }


    else if (valueType === 'object' && Array.isArray(props.data.value)) {
        valueType = 'array';
    }

    const setParams = (value: any) => {
        props.setParams(props.data.key, value)
    }

    setParams(props.data.value)

    return <>
        {
            t(props.data.key)
        }:

        {
            valueType === 'string' &&/* 输入框，string */
            <Input style={{ width: 350 }} allowClear key={props.data.key} defaultValue={props.data.value} onChange={(value) => setParams(value)} placeholder={t('please_input')} />
        }

        {valueType === 'object' && props.data.value.select != null &&/* 选择器 */
            <Select
                style={{ width: 154 }}
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
                style={{ width: 160, margin: '10px 24px 10px 0' }}
            />}

        {valueType === 'boolean' &&/* 复选框 */
            <Checkbox defaultValue={props.data.value} onChange={(checked) => setParams(checked)}></Checkbox>
        }

        {valueType === 'array' &&/* 数组 */
            <InputTag
                defaultValue={props.data.value}
                allowClear
                tokenSeparators={[',', '[', ']', '[]']}//分词
                placeholder={t('Input_and_press_enter')}
                onChange={(value) => setParams(value)}
                style={{ width: 350 }}
            />
        }

        <br />
    </>
}

export { AddStorage_page }