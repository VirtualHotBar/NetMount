import { Button, Checkbox, Form, Input, InputNumber, InputTag, Link, Message, Notification, Select, Space, Switch, Typography } from "@arco-design/web-react";
import { DefaultParams, ParametersType } from "../../type/rclone/storage/defaults";
import { useTranslation } from "react-i18next";
import { searchStorage, storageListAll } from "../../controller/storage/listAll";
import { CSSProperties, useEffect, useState } from "react";
import { checkParams, createStorage } from "../../controller/storage/create";
import { useNavigate, useParams } from "react-router-dom";
import { getProperties, getURLSearchParam } from "../../utils/utils";
import { getStorageParams } from "../../controller/storage/storage";
import { InputItem_module } from "../other/inputItem";
import { rcloneInfo } from "../../services/rclone";
const FormItem = Form.Item;



function AddStorage_page() {
    const { t } = useTranslation()
    const navigate = useNavigate();

    //const [selectStorage, setSelectStorage] = useState<string>()
    const [storageTypeName, setStorageTypeName] = useState<string>()
    const [defaultParams, setDefaultParams] = useState<DefaultParams>()
    const [step, setStep] = useState(0)//0:选择类型，1:填写参数
    const [showAdvanced, setShowAdvanced] = useState(false)

    const [storageName, setStorageName] = useState('')//存储名称
    const [isEditMode, setIsEditMode] = useState(false)
    let parameters: ParametersType = {};

    const setParams = (key: string, value: any) => {
        parameters[key] = value;
    };

    const editMode = async () => {
        const type = getURLSearchParam('type')
        const name = getURLSearchParam('name')
        const storage = await getStorageParams(name)

        //setSelectStorage(type)
        setStorageTypeName(searchStorage(type).name)
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
        setIsEditMode(Boolean(getURLSearchParam('edit')))
        if (isEditMode) {
            editMode()
        }
    }, [])


    return <>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', marginLeft: '1.8rem' }}>{t('add_storage')}</h2>
        {step == 0 ?/* 选择类型 */
            <div className=" w-full h-full">
                <Form autoComplete='off'>
                    <FormItem label={t('storage_type')}>
                        <Select
                            placeholder={t('please_select')}
                            style={{ width: '15rem' }}
                            value={storageTypeName && searchStorage(storageTypeName).name}
                            onChange={(value) => {
                                setStorageTypeName(value)
                                const storageInfo = searchStorage(value)
                                //setSelectStorage(storageInfo.type)
                                setDefaultParams(storageInfo.defaultParams)
                                setStorageName(storageInfo.defaultParams.name)
                            }}
                        >
                            {storageListAll.map((storageItem, index) => (
                                <Select.Option key={index} value={storageItem.name}>
                                    {t(storageItem.name)}
                                </Select.Option>
                            ))}
                        </Select>
                    </FormItem>


                    {/* 存储介绍 */}
                    {storageTypeName ? <FormItem label={t('storage_introduce')}>
                        <Typography.Text>{t(searchStorage(storageTypeName).introduce!)}</Typography.Text>
                    </FormItem> : ''}

                    <br />


                    {/* 按钮 */}
                    <div style={{ width: '100%', textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => { navigate('/storage/manage') }} >{t('step_back')}</Button>
                            <Button onClick={() => { setStep(1) }} disabled={!storageTypeName} type='primary'>{t('step_next')}</Button>
                        </Space>
                    </div>
                </Form>
            </div>
            : step == 1 ?/* 填写参数 */
                <div className=" w-full h-full">
                    <Form autoComplete='off'>
                        <InputItem_module data={{ key: 'StorageName', value: storageName }} setParams={(key: any, value: any) => { key && setStorageName(value) }} />

                        {
                            getProperties(defaultParams!.standard).map((paramsItem) => {
                                return (
                                    <InputItem_module key={paramsItem.key} data={paramsItem} setParams={setParams} />
                                )
                            })
                        }



                        <div style={{ display: showAdvanced ? 'block' : 'none' }}>

                            {//高级选项
                                getProperties(defaultParams!.advanced).map((paramsItem) => {
                                    return (
                                        <InputItem_module key={paramsItem.key} data={paramsItem} setParams={setParams} />
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
                                if (!isEditMode) {
                                    for (const storage of rcloneInfo.storageList) {
                                        if (storage.name === storageName) {
                                            Message.error(t('storage_name_already_exists'))
                                            return
                                        }
                                    }
                                }



                                const { isOk, msg } = checkParams(storageName, parameters, searchStorage(storageTypeName).defaultParams, t)
                                if (isOk) {
                                    if (await createStorage(storageName, searchStorage(storageTypeName).type, parameters)) {
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
                            }
                            } type='primary'>{t('save')}</Button>
                        </Space>
                    </div>
                </div>
                : ''
        }</>
}



export { AddStorage_page }