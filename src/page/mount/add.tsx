import { Button, Checkbox, Collapse, Form, FormInstance, Input, Notification, Radio, Select, Space, Switch } from '@arco-design/web-react'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom';
import { ParametersType } from '../../type/defaults';
import { formatPath, getProperties, getURLSearchParam, getWinFspInstallState, showPathInExplorer } from '../../utils/utils';
import { defaultMountConfig, defaultVfsConfig } from '../../controller/storage/mount/parameters/defaults';
import { rcloneInfo } from '../../services/rclone';
import { addMountStorage, getAvailableDriveLetter, getMountStorage, mountStorage } from '../../controller/storage/mount/mount';
import { osInfo } from '../../services/config';
import { homeDir } from '@tauri-apps/api/path';
import { InputForm_module, paramsType2FormItems } from '../other/InputForm';

const FormItem = Form.Item;

const CollapseItem = Collapse.Item;

export default function AddMount_page() {
    const { t } = useTranslation()
    const navigate = useNavigate();
    const [storageName, setStorageName] = useState<string>()
    const [showAllOptions, setShowAllOptions] = useState(false)
    const [mountPath, setMountPath] = useState<string>('')
    const [autoMount, setAutoMount] = useState(true)
    //const [autoMountPath, setAutoMountPath] = useState(true)//自动分配盘符
    //const [notification, contextHolder] = Notification.useNotification();
    const [vfsOptFormHook, setVfsOptFormHook] = useState<FormInstance>();//表单实例
    const [mountOptFormHook, setMountOptFormHook] = useState<FormInstance>();//表单实例
    const RadioGroup = Radio.Group;

    const isWindows = rcloneInfo.version.os.toLowerCase().includes('windows');

    let parameters: ParametersType = { mountOpt: {}, vfsOpt: {} }



    const checkWinFspState = async () => {
        if (osInfo.osType === 'Windows_NT' && rcloneInfo.endpoint.isLocal) {
            const winFspInstallState = await getWinFspInstallState();
            if (!winFspInstallState) {
                navigate('/mount')
                Notification.warning({
                    id: 'winfsp_not_installed',
                    title: t('warning'),
                    content: t('winfsp_not_installed'),
                })
            }
        }
    }

    useEffect(() => {
        setMountPath(mountPath.replace(/\\/g, '/').replace(/\/+/g, '/'))
    }, [mountPath])

    useEffect(() => {
        checkWinFspState()

        if (rcloneInfo.storageList.length === 0) {
            navigate('/mount')
            Notification.warning({
                id: 'no_storage',
                title: t('warning'),
                content: t('not_add_storage'),
            })
            return
        } else if (getURLSearchParam('name')) {
            setStorageName(getURLSearchParam('name'))
        } else if (!storageName) {
            setStorageName(rcloneInfo.storageList[0].name)
        }
    }, [])

    useEffect(() => {
        //默认挂载路径
        if (isWindows) {
            //setMountPath('*')
            setMountPath('~/Desktop/' + storageName)
        } else {
            if (storageName) {
                if (rcloneInfo.version.os.toLowerCase().includes('darwin')) {
                    setMountPath('~/Desktop/' + storageName)
                } else {
                    setMountPath('/mnt/' + storageName)
                }
            }
        }
    }, [storageName])

    const isMountPathCustom = mountPath !== '*' && !mountPath.startsWith('~/Desktop/');


    return (
        <div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', marginLeft: '1.8rem' }}>{t('add_mount')}</h2>
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

                    {isMountPathCustom && (
                        <>
                            <Input
                                value={mountPath}
                                onChange={(value) => setMountPath(value)}
                                placeholder={t('please_input')}
                            />
                            <br />
                            <br />
                        </>
                    )}
                    <RadioGroup
                        value={!isMountPathCustom ? mountPath : ''}
                        onChange={(value) => setMountPath(value)}
                    >
                        <Radio value={`~/Desktop/${storageName}`}>{t('desktop')}({t('recommend')})</Radio>
                        {isWindows && (
                            <Radio value="*">{t('auto_drive_letter')}</Radio>
                        )}
                        <Radio value="">{t('custom')}</Radio>
                    </RadioGroup>

                </FormItem>

                {!showAllOptions &&
                    <FormItem label={t('mount_options')}>
                        <Space>
                        <Checkbox defaultChecked={defaultVfsConfig.ReadOnly} onChange={(checked) => {
                            vfsOptFormHook?.setFieldValue('ReadOnly', checked)
                        }} >{t('read_only')}</Checkbox>
                        {(mountPath === '*' || mountPath.endsWith(':') || mountPath.endsWith(':/')) && isWindows && <Checkbox defaultChecked={!defaultMountConfig.NetworkMode} onChange={(checked) => {
                            mountOptFormHook?.setFieldValue('NetworkMode', !checked)
                        }} >{t('simulate_hard_drive')}</Checkbox>}
                        </Space>
                    </FormItem>
                }

                {
                    <div style={{ display: showAllOptions ? 'block' : 'none' }}>
                        <InputForm_module data={paramsType2FormItems(defaultMountConfig)} onChange={(data) => { parameters.mountOpt = data }} overwriteValues={defaultMountConfig} setFormHook={(form) => { setMountOptFormHook(form) }} />
                        <InputForm_module data={paramsType2FormItems(defaultVfsConfig)} onChange={(data) => { parameters.vfsOpt = data }} overwriteValues={defaultVfsConfig} setFormHook={(form) => { setVfsOptFormHook(form) }} />
                    </div>
                }

                {/* 按钮 */}
                <div style={{ width: '100%', textAlign: 'right' }}>
                    <Space>
                        <Checkbox defaultChecked={autoMount} onChange={(checked) => { setAutoMount(checked) }} >{t('auto_mount')}</Checkbox>
                        {!showAllOptions && <Button onClick={() => { setShowAllOptions(!showAllOptions) }} type='text'>{t('show_all_options')}</Button>}
                        <Button onClick={() => { navigate('/mount') }} >{t('step_back')}</Button>
                        <Button disabled={!storageName || !mountPath} onClick={async () => {
                            if (getMountStorage(mountPath)) {
                                Notification.error({
                                    title: t('error'),
                                    content: t('mount_path_already_exists'),
                                })
                                return;
                            }

                            let mountPathTemp = mountPath
                            if (mountPath === "*") {
                                mountPathTemp = await getAvailableDriveLetter()
                            } else if (/* !isWindows &&  */mountPath.startsWith('~/')) {
                                let homeDirStr = await homeDir()
                                if (!homeDirStr.endsWith('/')) {
                                    homeDirStr = homeDirStr + '/'
                                }
                                mountPathTemp = mountPath.replace('~/', homeDirStr)
                            }

                            mountPathTemp = formatPath(mountPathTemp, isWindows)

                            await addMountStorage(storageName!, mountPathTemp, parameters, autoMount)

                            if (await mountStorage(getMountStorage(mountPathTemp)!)) {
                                Notification.success({
                                    title: t('success'),
                                    content: t('mount_storage_successfully'),
                                })
                                navigate('/mount')
                                if(isWindows&&rcloneInfo.endpoint.isLocal){
                                    showPathInExplorer(mountPathTemp,true)
                                }
                            }

                        }} type='primary'>{t('mount')}</Button>
                    </Space>
                </div>
            </Form>
        </div>
    )
}
