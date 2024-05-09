import { Button, Checkbox, Collapse, Form, Input, Notification, Select, Space, Switch } from '@arco-design/web-react'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom';
import { ParametersType } from '../../type/defaults';
import { getProperties, getURLSearchParam, getWinFspInstallState } from '../../utils/utils';
import { defaultMountConfig, defaultVfsConfig } from '../../controller/storage/mount/parameters/defaults';
import { rcloneInfo } from '../../services/rclone';
import { addMountStorage, getAvailableDriveLetter, getMountStorage, mountStorage } from '../../controller/storage/mount/mount';
import { osInfo } from '../../services/config';
import { homeDir } from '@tauri-apps/api/path';

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

    const isWindows = rcloneInfo.version.os.toLowerCase().includes('windows');

    let parameters: ParametersType = { mountOpt: {}, vfsOpt: {} }

    const setMountParams = (key: string, value: any) => {
        parameters.mountOpt[key] = value;
    };

    const setVfsParams = (key: string, value: any) => {
        parameters.vfsOpt[key] = value;
    };

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
        } else {

        }
    }

    useEffect(() => {
        checkWinFspState()
    }, [])

    useEffect(() => {
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
            setMountPath('*')
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
                        {/*{
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
                        } */}
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
                            } else if (!isWindows && mountPath.startsWith('~/')) {
                                let homeDirStr = await homeDir()
                                if (!homeDirStr.endsWith('/')) {
                                    homeDirStr = homeDirStr + '/'
                                }
                                mountPathTemp = mountPath.replace('~/', homeDirStr)
                            }

                            await addMountStorage(storageName!, mountPathTemp, parameters, autoMount)

                            if (await mountStorage(getMountStorage(mountPathTemp)!)) {
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
