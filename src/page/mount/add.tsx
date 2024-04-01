import { Button, Checkbox, Collapse, Form, Input, Notification, Select, Space, Switch } from '@arco-design/web-react'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom';
import { ParametersType } from '../../type/rclone/storage/defaults';
import { getProperties, getURLSearchParam } from '../../utils/rclone/utils';
import { defaultMountConfig, defaultVfsConfig } from '../../controller/storage/mount/parameters/defaults';
import { InputItem_module } from '../other/inputItem';
import { rcloneInfo } from '../../services/rclone';
import { mountStorage } from '../../controller/storage/mount/mount';


const FormItem = Form.Item;

const CollapseItem = Collapse.Item;

export default function AddMount_page() {
    const { t } = useTranslation()
    const navigate = useNavigate();
    const [storageName, setStorageName] = useState<string>()
    const [showAllOptions, setShowAllOptions] = useState(false)
    const [mountPath, setMountPath] = useState<string>('')
    //const [autoMountPath, setAutoMountPath] = useState(true)//自动分配盘符

    const isWindows = rcloneInfo.version.os.toLowerCase().includes('windows');


    let parameters: ParametersType = { mountOpt: {}, vfsOpt: {} }

    const setMountParams = (key: string, value: any) => {
        parameters.mountOpt[key] = value;
    };

    const setVfsParams = (key: string, value: any) => {
        parameters.vfsOpt[key] = value;
    };

    useEffect(() => {
            if (getURLSearchParam('name')) {
                setStorageName(getURLSearchParam('name'))
            }else if(!storageName && rcloneInfo.storageList.length > 0){
                setStorageName(rcloneInfo.storageList[0].name)
            }


        if (isWindows) {
            setMountPath('*')
        } else {
            setMountPath('/netmount/' + storageName)
        }
    }, [])

    return (
        <div>
            <Form>
                <FormItem label={t('storage')}>
                    <Select /* bordered={false} */ value={storageName} placeholder={t('please_select')} onChange={(value) =>
                        setStorageName(value)
                    }>
                        {
                            rcloneInfo.storageList.map((item) => {
                                return (
                                    <Select.Option key={item.name} value={item.name}>{item.name}({item.type})</Select.Option>
                                )
                            })
                        }
                    </Select>
                </FormItem>

                <FormItem label={t('mount_path')}>
                    {
                        isWindows ?
                            <>
                                {mountPath != '*' && <Input value={mountPath} onChange={(value) => setMountPath(value)} style={{ width: '12rem' }} placeholder={t('please_input')} />}
                                <Checkbox checked={mountPath == '*'} onChange={(checked) => { checked ? setMountPath('*') : setMountPath('Z:') }} >{t('auto_drive_letter')}</Checkbox>
                            </> : <>
                                <Input value={mountPath} onChange={(value) => setMountPath(value)} placeholder={t('please_input')} />
                            </>
                    }
                </FormItem>

                {!showAllOptions &&
                    <FormItem label={t('mount_options')}>
                        {isWindows && <Checkbox defaultChecked={!defaultMountConfig.NetworkMode} onChange={(checked) => { setMountParams('NetworkMode', !checked) }} >{t('simulate_hard_drive')}</Checkbox>}
                        <Checkbox defaultChecked={defaultVfsConfig.ReadOnly} onChange={(checked) => { setVfsParams('ReadOnly', checked) }} >{t('read_only')}</Checkbox>
                    </FormItem>
                }

                {
                    <div style={{ display: showAllOptions ? 'block' : 'none' }}>
                        {
                            getProperties(defaultMountConfig).map((item) => {
                                return (
                                    <InputItem_module key={item.key} data={item} setParams={setMountParams} />
                                )
                            })
                        }
                        {
                            getProperties(defaultVfsConfig).map((item) => {
                                return (
                                    <InputItem_module key={item.key} data={item} setParams={setVfsParams} />
                                )
                            })
                        }
                    </div>
                }

                {/* 按钮 */}
                <div style={{ width: '100%', textAlign: 'right' }}>
                    <Space>
                        {!showAllOptions && <Button onClick={() => { setShowAllOptions(!showAllOptions) }} type='text'>{t('show_all_options')}</Button>}
                        <Button onClick={() => { navigate('/mount') }} >{t('step_back')}</Button>
                        <Button disabled={!storageName || !mountPath} onClick={async () => {
                            console.log(parameters);
                            if(await mountStorage(storageName!, mountPath, parameters)){
                                Notification.success({
                                    title: t('success'),
                                    content: t('mount_storage_successfully'),
                                })
                                navigate('/mount')
                            }
                            
                        }} type='primary'>{t('mount')}</Button>
                    </Space>
                </div>
            </Form>
        </div>
    )
}
