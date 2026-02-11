import { Button, Card, Form, FormInstance, Grid, Input, Message, Notification, Radio, Select, Space, Typography } from "@arco-design/web-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { createStorage } from "../../controller/storage/create";
import { useNavigate } from "react-router-dom";
import { getProperties, getURLSearchParam, openUrlInBrowser } from "../../utils/utils";
import { getStorageParams, searchStorage } from "../../controller/storage/storage";
import { rcloneInfo } from "../../services/rclone";
import { IconQuestionCircle } from "@arco-design/web-react/icon";
import { nmConfig, roConfig } from "../../services/config";
import { searchStorageInfo, storageInfoList } from "../../controller/storage/allList";
import { ParametersType } from "../../type/defaults";
import { StorageInfoType } from "../../type/controller/storage/info";
import { InputForm_module } from "../other/InputForm";
const FormItem = Form.Item;
const { Col, Row } = Grid;
const RadioGroup = Radio.Group;
const InputSearch = Input.Search;

const filterDuplicates = (storageInfo: StorageInfoType[], t: (key: string) => string): StorageInfoType[] => {
    const newStorageList: StorageInfoType[] = [];
    const labels: string[] = [];
    for (let i = 0; i < storageInfo.length; i++) {
        const label = t(storageInfo[i].label);
        if (!labels.includes(label)) {

            labels.push(label);
            newStorageList.push(storageInfo[i]);
        }
    }
    return newStorageList
}

function AddStorage_page() {
    const { t } = useTranslation()
    const navigate = useNavigate();

    const [storageTypeName, setStorageTypeName] = useState<string>()
    const [step, setStep] = useState<'selectType' | 'setParams'>('selectType')//选择类型，填写参数
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [storageName, setStorageName] = useState('')//存储名称
    const isEditMode = (getURLSearchParam('edit') == 'true')
    const [formHook, setFormHook] = useState<FormInstance>();//表单实例
    const [searchStr, setSearchStr] = useState('')//搜索存储


    const [storageParams, setStorageParams] = useState<ParametersType>()//编辑模式下，覆盖默认参数

    //let parameters: ParametersType = {};

    /*     const setParams = (key: string, value: any) => {
            parameters[key] = value;
        }; */
    const storageInfo = searchStorageInfo(storageTypeName)
    console.log(storageInfo);

    const editMode = async () => {
        const name = getURLSearchParam('name')
        setStorageTypeName(searchStorageInfo(getURLSearchParam('type')).label)
        setStorageParams(await getStorageParams(name))
        setStorageName(name)
        setStep('setParams')
    }

    useEffect(() => {
        if (isEditMode) editMode();
    }, [])

    useEffect(() => {
        const storageInfo = searchStorageInfo(storageTypeName)
        setStorageName(storageInfo.defaultParams.name)
    }, [storageTypeName])

    if (storageInfo.framework === 'openlist') {
        formHook?.setFieldValue('mount_path', '/' + storageName)
    }

    let content: JSX.Element

    switch (step) {
        case 'selectType':
            content = (<div style={{ width: '100%' }}>

                <Form autoComplete='off'>
                    <FormItem style={{ width: '100%', }} label={t('storage_type')} >
                        <InputSearch value={searchStr} onChange={(value) => setSearchStr(value)} allowClear placeholder={t('enter_keyword_to_search')} style={{}} />

                        <Card style={{ height: '15rem', overflow: 'auto', /* marginTop: '1rem' */ }} hoverable>
                            <RadioGroup
                                value={storageTypeName}
                                onChange={(value) => setStorageTypeName(value)}>
                                {(showAdvanced ? storageInfoList : filterDuplicates(storageInfoList, t)).map((storageItem, index) => {
                                    //搜索
                                    if (searchStr && !(storageItem.label + storageItem.type + t(storageItem.label)).toLocaleLowerCase().includes(searchStr.toLocaleLowerCase())) return;

                                    return (
                                        <Radio
                                            value={storageItem.type}
                                            key={index}
                                            style={{ margin: 0 }}>
                                            {({ checked }) => {
                                                return (
                                                    <div
                                                        style={{
                                                            minWidth: '7rem',
                                                            marginBlock: '0.2rem',
                                                            padding: '4px',
                                                            border: '1px solid var(--color-border-2)',
                                                            borderRadius: '4px',
                                                            boxSizing: 'border-box',
                                                            ...(checked ? { backgroundColor: 'var(--color-primary-light-1)' } : {})
                                                        }}>
                                                        <div style={{ display: 'flex', color: 'var(--color-text-1)' }}>
                                                            {/* <img style={{ width: '1.2rem', height: '1.2rem' }} src={storageItem.framework === 'rclone' ?'/public/img/framework/rclone.png' : '/public/img/framework/openlist.svg'} /> */}
                                                            {t(storageItem.label)}
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        </Radio>
                                    )
                                })}

                            </RadioGroup>
                        </Card>
                        {!showAdvanced &&
                            <div style={{ width: '100%', textAlign: 'right' }}><Button onClick={() => setShowAdvanced(true)} type='text'>{t('show_all')} </Button></div>
                        }

                        {/*<Select
                            placeholder={t('please_select')}
                            style={{ width: '15rem' }}
                            value={storageTypeName && storageInfo.label}
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
                        </Select> */}
                    </FormItem>


                    {/* 存储介绍 */}
                    {storageTypeName ? <FormItem label={t('storage_introduce')}>
                        <Typography.Text>{t(storageInfo.description)}</Typography.Text>
                    </FormItem> : ''}

                    <br />

                    {/* 按钮 */}
                    <div style={{ width: '100%', textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => { navigate('/storage/manage') }} >{t('step_back')}</Button>
                            <Button onClick={() => { setStep('setParams'); setShowAdvanced(false) }} disabled={!storageTypeName} type='primary'>{t('step_next')}</Button>
                        </Space>
                    </div>
                </Form>
            </div >)
            break;
        case 'setParams':
            content = (<div style={{ width: '100%' }}>

                <InputForm_module
                    header={<FormItem label={'*' + t('storage_name')} hidden={isEditMode}>
                        <Input value={storageName} onChange={(value) => {
                            setStorageName(value)
                        }} />
                    </FormItem>} data={[...storageInfo.defaultParams.parameters/* ,...storageInfo.defaultParams.exParameters?.openlist?.additional||[] */]}
                    showAdvanced={showAdvanced} overwriteValues={storageParams} setFormHook={(hook) => { setFormHook(hook) }} />
                <br />

                <Row style={{ width: '100%' }}>
                    <Col flex={'4rem'}>
                        <Button onClick={() => {
                            openUrlInBrowser(
                                roConfig.url.to('docs-storage', '/' + (storageInfo.displayType || storageInfo.type).toLocaleLowerCase().split(' ').join('-') + '&framework=' + storageInfo.framework + '&lang=' + nmConfig.settings.language)
                            )
                        }}
                            type='text' icon={<IconQuestionCircle />}>{t('help_for_this_storage')}({t(storageInfo.label)}) </Button>
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
                                    if (searchStorage(storageName)?.name) {
                                        Message.error(t('storage_name_already_exists'))
                                        return
                                    }
                                }

                                if (!storageName) {
                                    Message.error(t('storage_name_cannot_be_empty'))
                                    return
                                }

                                const parameters: ParametersType = storageInfo.framework === 'rclone' ? formHook.getFieldsValue(formHook.getTouchedFields()) : formHook.getFieldsValue()
                                console.log(parameters);

                                //return

                                if (await createStorage(storageName, storageInfo.type, parameters)) {
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
                <br /><br />
            </div>)
    }

    return (
        <div className=" w-full h-full">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', marginLeft: '1.8rem' }}>{!isEditMode ? t('add_storage') : t('edit_storage')}</h2>
            {content}
        </div>)
}



export { AddStorage_page }