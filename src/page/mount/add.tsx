import { Button, Checkbox, Collapse, Form, FormInstance, Input, Notification, Radio, Select, Space, Switch } from '@arco-design/web-react'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom';
import { ParametersType } from '../../type/defaults';
import { formatPath, getProperties, getURLSearchParam, getWinFspInstallState, showPathInExplorer } from '../../utils/utils';
import { defaultMountConfig, defaultVfsConfig, vfsCacheModeParam } from '../../controller/storage/mount/parameters/defaults';
import { rcloneInfo } from '../../services/rclone';
import { addMountStorage, editMountStorage, getAvailableDriveLetter, getMountStorage, mountStorage } from '../../controller/storage/mount/mount';
import { osInfo } from '../../services/config';
import { homeDir } from '@tauri-apps/api/path';
import { InputForm_module, paramsType2FormItems } from '../other/InputForm';
import { filterHideStorage } from '../../controller/storage/storage';
import { MountOptions, VfsOptions } from '../../type/rclone/storage/mount/parameters';
import { searchStorageInfo } from '../../controller/storage/allList';

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
    const [parameters, setParameters] = useState<{ vfsOpt: VfsOptions, mountOpt: MountOptions }>({ mountOpt: defaultMountConfig, vfsOpt: defaultVfsConfig })
    const [vfsOptFormHook, setVfsOptFormHook] = useState<FormInstance>();//表单实例
    const [mountOptFormHook, setMountOptFormHook] = useState<FormInstance>();//表单实例

    const RadioGroup = Radio.Group;
    const storageList = filterHideStorage(rcloneInfo.storageList)
    const isEditMode = (getURLSearchParam('edit') === 'true')
    const isWindows = rcloneInfo.version.os.toLowerCase().includes('windows');

    const isMountPathCustom = mountPath !== '*' && !mountPath.startsWith('~/Desktop/');
    const mountPathuIsDriveLetter = isWindows && (mountPath === '*' || mountPath.endsWith(':') || mountPath.endsWith(':/'));

    const checkWinFspState = async () => {
        if (osInfo.osType === "windows" && rcloneInfo.endpoint.isLocal) {
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

    const editMode = () => {
        let mountPathTemp = getURLSearchParam('mountPath')
        const mount = getMountStorage(mountPathTemp)
        if (mount) {
            setStorageName(mount.storageName)
            setMountPath(mount.mountPath)
            setAutoMount(mount.autoMount)
            setParameters(mount.parameters as { vfsOpt: VfsOptions, mountOpt: MountOptions })
        }
    }

    useEffect(() => {
        setMountPath(mountPath.replace(/\\/g, '/').replace(/\/+/g, '/'))
        /*  if (mountPathuIsDriveLetter) {
             mountOptFormHook && mountOptFormHook.setFieldsValue({ VolumeName: storageName })
         } */
    }, [mountPath])

    useEffect(() => {
        checkWinFspState()

        if (storageList.length === 0) {
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
            setStorageName(storageList[0].name)
        }

        if (isEditMode) {
            editMode()
        }
    }, [])

    useEffect(() => {
        if (!isEditMode) {
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
        }

    }, [storageName])

    useEffect(() => {
        vfsOptFormHook && vfsOptFormHook.setFieldsValue(parameters.vfsOpt);
        mountOptFormHook && mountOptFormHook.setFieldsValue(parameters.mountOpt)
    }, [vfsOptFormHook, mountOptFormHook])


    return (
        <div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', marginLeft: '1.8rem' }}>{!isEditMode ?  t('add_mount'):t('edit_mount') }</h2>
            <Form>
                <FormItem label={t('storage')}>
                    <Select /* bordered={false} */ value={storageName} placeholder={t('please_select')} onChange={(value) =>
                        setStorageName(value)
                    }>
                        {
                            storageList.map((item) => {
                                return (
                                    <Select.Option key={item.name} value={item.name}>{item.name}({t(searchStorageInfo(item.type).label)})</Select.Option>
                                )
                            })
                        }
                    </Select>
                </FormItem>

                <FormItem label={t('mount_path')} hidden={isEditMode}>
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

                <FormItem label={t('VolumeName') + '(' + t('optional') + ')'} hidden={!mountPathuIsDriveLetter}>
                    <Input /* bordered={false} */ value={parameters.mountOpt.VolumeName} placeholder={t('please_input')} onChange={(value) =>
                        setParameters({ ...parameters, mountOpt: { ...parameters.mountOpt, VolumeName: value } })
                    } />
                </FormItem>

                {!showAllOptions &&
                    <FormItem label={t('mount_options')}>
                        <Space>
                            <Checkbox checked={parameters.vfsOpt.ReadOnly} onChange={(checked) => {
                                vfsOptFormHook?.setFieldValue('ReadOnly', checked)
                            }} >{t('read_only')}</Checkbox>
                            {mountPathuIsDriveLetter && <Checkbox checked={!parameters.mountOpt.NetworkMode} onChange={(checked) => {
                                mountOptFormHook?.setFieldValue('NetworkMode', !checked)
                            }} >{t('simulate_hard_drive')}</Checkbox>}
                        </Space>
                    </FormItem>
                }

                {
                    <div style={{ display: showAllOptions ? 'block' : 'none' }}>
                        <InputForm_module data={paramsType2FormItems(defaultMountConfig)} onChange={(data) => {
                            setParameters({ ...parameters, mountOpt: { ...parameters.mountOpt, ...data } })
                        }} overwriteValues={parameters.mountOpt} setFormHook={(form) => {
                            //form.setFieldsValue(parameters.mountOpt)
                            setMountOptFormHook(form)
                        }} />
                        <InputForm_module data={[vfsCacheModeParam, ...paramsType2FormItems(defaultVfsConfig, undefined, ['CacheMode'])]} onChange={(data) => {
                            setParameters({ ...parameters, vfsOpt: { ...parameters.vfsOpt, ...data } })
                        }} overwriteValues={{ ...parameters.vfsOpt, CacheMode: 'full' }} setFormHook={(form) => {
                            //form.setFieldsValue(parameters.vfsOpt);
                            setVfsOptFormHook(form)
                        }} />
                    </div>
                }

                {/* 按钮 */}
                <div style={{ width: '100%', textAlign: 'right' }}>
                    <Space>
                        <Checkbox checked={autoMount} onChange={(checked) => { setAutoMount(checked) }} >{t('auto_mount')}</Checkbox>
                        {!showAllOptions && <Button onClick={() => { setShowAllOptions(!showAllOptions) }} type='text'>{t('show_all_options')}</Button>}
                        <Button onClick={() => { navigate('/mount') }} >{t('step_back')}</Button>
                        <Button disabled={!storageName || !mountPath} onClick={async () => {
                            if (!isEditMode && getMountStorage(mountPath)) {
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
                            if (isEditMode) {
                                console.log(parameters);

                                await editMountStorage({ storageName: storageName!, mountPath: mountPathTemp, parameters: parameters, autoMount: autoMount })
                            } else {
                                await addMountStorage(storageName!, mountPathTemp, parameters, autoMount)
                            }

                            if (isEditMode) {
                                Notification.success({
                                    title: t('success'),
                                    content: t('save_successfully'),
                                })
                            } else if (await mountStorage(getMountStorage(mountPathTemp)!)) {
                                Notification.success({
                                    title: t('success'),
                                    content: t('mount_storage_successfully'),
                                })
                                if (isWindows && rcloneInfo.endpoint.isLocal) {
                                    showPathInExplorer(mountPathTemp, true)
                                }
                            }
                            navigate('/mount')
                        }} type='primary'>
                            {isEditMode ? t('save') : t('mount')}
                        </Button>
                    </Space>
                </div>
            </Form>
        </div>
    )
}
