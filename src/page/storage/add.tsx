import { Button, Checkbox, Form, FormInstance, Grid, Input, InputNumber, InputTag, Link, Message, Notification, Select, Space, Switch, Typography } from "@arco-design/web-react";
import { useTranslation } from "react-i18next";
import { CSSProperties, useEffect, useState } from "react";
import { createStorage } from "../../controller/storage/create";
import { useNavigate, useParams } from "react-router-dom";
import { getProperties, getURLSearchParam, openUrlInBrowser } from "../../utils/utils";
import { getStorageParams } from "../../controller/storage/storage";
import { rcloneInfo } from "../../services/rclone";
import { IconQuestionCircle } from "@arco-design/web-react/icon";
import { roConfig } from "../../services/config";
import { searchStorageInfo, storageInfoList } from "../../controller/storage/allList";
import { ParametersType } from "../../type/defaults";
import { StorageParamsType } from "../../type/controller/storage/info";
import { InputForm_module } from "../other/InputForm";
const FormItem = Form.Item;
const Row = Grid.Row;
const Col = Grid.Col;



function AddStorage_page() {
    const { t } = useTranslation()
    const navigate = useNavigate();

    const [storageTypeName, setStorageTypeName] = useState<string>()
    const [step, setStep] = useState<'selectType' | 'setParams'>('selectType')//选择类型，填写参数
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [storageName, setStorageName] = useState('')//存储名称
    const isEditMode = (getURLSearchParam('edit') == 'true')
    const [formHook, setFormHook] = useState<FormInstance>();//表单结果

    const [storageParams, setStorageParams] = useState<ParametersType>()//编辑模式下，覆盖默认参数

    //let parameters: ParametersType = {};

    /*     const setParams = (key: string, value: any) => {
            parameters[key] = value;
        }; */

    const editMode = async () => {
        const name = getURLSearchParam('name')
        setStorageTypeName(searchStorageInfo(getURLSearchParam('type')).label)
        setStorageName(name)
        setStorageParams(await getStorageParams(name))

        setStep('setParams')
    }

    useEffect(() => {
        if (isEditMode) {
            editMode()
        }
    }, [])

    let content: JSX.Element

    switch (step) {
        case 'selectType':
            content = (<div style={{ width: '100%' }}>
                <Form autoComplete='off'>
                    <FormItem label={t('storage_type')}>
                        <Select
                            placeholder={t('please_select')}
                            style={{ width: '15rem' }}
                            value={storageTypeName && searchStorageInfo(storageTypeName).label}
                            onChange={(value) => {
                                setStorageTypeName(value)
                                const storageInfo = searchStorageInfo(value)
                                setStorageName(storageInfo.defaultParams.name)
                            }}
                        >
                            {storageInfoList.map((storageItem, index) => (
                                <Select.Option key={index} value={storageItem.label}>
                                    {t(storageItem.label)}
                                </Select.Option>
                            ))}
                        </Select>
                    </FormItem>


                    {/* 存储介绍 */}
                    {storageTypeName ? <FormItem label={t('storage_introduce')}>
                        <Typography.Text>{t(searchStorageInfo(storageTypeName).description!)}</Typography.Text>
                    </FormItem> : ''}

                    <br />

                    {/* 按钮 */}
                    <div style={{ width: '100%', textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => { navigate('/storage/manage') }} >{t('step_back')}</Button>
                            <Button onClick={() => { setStep('setParams') }} disabled={!storageTypeName} type='primary'>{t('step_next')}</Button>
                        </Space>
                    </div>
                </Form>
            </div>)
            break;
        case 'setParams':
            content = (<div style={{ width: '100%' }}>
                <InputForm_module data={searchStorageInfo(storageTypeName).defaultParams.parameters} showAdvanced={showAdvanced} overwriteValues={storageParams} setFormHook={(hook) => { setFormHook(hook) }} />
                <br />

                <Row style={{ width: '100%' }}>
                    <Col flex={'4rem'}>
                        <Button onClick={() => {
                            const storageInfo = searchStorageInfo(storageTypeName)
                            openUrlInBrowser(roConfig.url.docs + '/docs/storage-mgr/' +
                                (storageInfo.displayType || storageInfo.type).toLocaleLowerCase().split(' ').join('-')
                            )
                        }}
                            type='text' icon={<IconQuestionCircle />}>{t('help_for_this_storage')}({storageTypeName}) </Button>
                    </Col>
                    <Col flex={'auto'} style={{ textAlign: 'right' }}>
                        <Space>
                            {
                                //高级选项
                                !showAdvanced &&
                                <Button onClick={() => setShowAdvanced(true)} type='text'>{t('show_advanced_options')} </Button>
                            }
                            <Button onClick={() => { getURLSearchParam('edit') ? navigate('/storage/manage') : setStep('selectType') }}>{t('step_back')}</Button>
                            <Button onClick={async () => {
                                if (!formHook) return;
                                try {
                                    await formHook.validate()
                                } catch (error) {
                                    getProperties(formHook.getFieldsError()).forEach((err) => {

                                        Message.error(t(err.key) + t(err.value.message.replace(err.key, '')))
                                    })
                                    return
                                }


                                if (!isEditMode) {
                                    for (const storage of rcloneInfo.storageList) {
                                        if (storage.name === storageName) {
                                            Message.error(t('storage_name_already_exists'))
                                            return
                                        }
                                    }
                                }

                                const parameters: ParametersType = formHook.getFieldsValue(formHook.getTouchedFields())

                                if (await createStorage(storageName, searchStorageInfo(storageTypeName).type, parameters)) {
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

                            }
                            } type='primary'>{t('save')}</Button>
                        </Space>
                    </Col>
                </Row>
            </div>)
    }

    return (
        <div className=" w-full h-full">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', marginLeft: '1.8rem' }}>{t('add_storage')}</h2>
            {content}
        </div>)
}



export { AddStorage_page }