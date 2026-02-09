import React, { CSSProperties, useEffect, useReducer, useState } from 'react'
import { BackTop, Badge, Button, Divider, Dropdown, Grid, Input, Link, List, Menu, Message, Modal, Notification, Popconfirm, Select, Space, Spin, Table, TableColumnProps, Tabs, Tooltip, Typography, Upload } from '@arco-design/web-react';
import { IconCopy, IconDelete, IconEdit, IconFolderAdd, IconLeft, IconMore, IconPaste, IconRefresh, IconScissor, IconUpCircle, IconUpload } from '@arco-design/web-react/icon';
import { rcloneInfo } from '../../services/rclone';
import { useTranslation } from 'react-i18next';
import { copyDir, copyFile, delDir, delFile, filterHideStorage, formatPathRclone, getFileList, mkDir, moveDir, moveFile, uploadFileRequest } from '../../controller/storage/storage';
import { FileInfo } from '../../type/rclone/rcloneInfo';
import { formatSize, getURLSearchParam, sleep } from '../../utils/utils';
import { RequestOptions } from '@arco-design/web-react/es/Upload';
import { NoData_module } from '../other/noData';
import { clipListItem } from '../../type/page/storage/explorer';
import { searchStorageInfo } from '../../controller/storage/allList';
const Row = Grid.Row;
const Col = Grid.Col;//
const TabPane = Tabs.TabPane;
const tipsStyle: CSSProperties = {
    textAlign: 'center',
    paddingTop: '6rem',
    fontSize: '1rem'
};

function Explorer_page() {
    return (
        <>
            {/*             <Tabs defaultActiveTab='1'>
                <TabPane key='1' title='Tab 1'>
                    <ExplorerItem />
                </TabPane>
            </Tabs> */}
            <ExplorerItem />
        </>
    )
}

// 规范路径
const sanitizePath = (newPath: string): string => {
    if (!newPath.startsWith('/')) {
        newPath = '/' + newPath;
    }

    // 确保路径不以 / 结尾，如果不是根路径
    if (newPath !== '/' && newPath.endsWith('/')) {
        newPath = newPath.slice(0, -1);
    }

    return newPath;
};

//取父目录
const getParentPath = (currentPath: string): string => {
    // 如果路径为空或者只有一个"/"，则无上级目录
    if (currentPath === '/' || currentPath === '') {
        return currentPath;
    }

    // 找到最后一个"/"出现的位置
    const lastSlashIndex = currentPath.lastIndexOf('/');

    // 返回截取到倒数第二个"/"之前的路径作为上级目录
    return currentPath.substring(0, lastSlashIndex);
};


function ExplorerItem() {
    const { t } = useTranslation()

    const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
    const [modal, contextHolder] = Modal.useModal();
    const [storageName, setStorageName] = useState<string>()
    const [path, setPath] = useState<string>()
    const [pathTemp, setPathTemp] = useState<string>('')
    //const [selectedRowKeys, setSelectedRowKeys] = useState<Array<string | number>>([]);

    const [fileList, setFileInfo] = useState<Array<FileInfo>>()

    const [loading, setLoading] = useState<boolean>()

    const [clipList, setClipList] = useState<Array<clipListItem>>([])


    const columns: TableColumnProps[] = [
        {
            title: t('name'),
            dataIndex: 'fileName',
            ellipsis: true,
        },
        {
            title: t('modified_time'),
            dataIndex: 'fileModTime',
            ellipsis: true,
            width: '10.5rem',
        },
        {
            title: t('size'),
            dataIndex: 'fileSize',
            ellipsis: true,
            width: '7rem',
        },
        {
            title: t('actions'),
            dataIndex: 'actions',
            align: 'right',
            width: '10rem',

        }
    ]



    //刷新文件列表
    async function fileInfo() {
        setLoading(true)
        try {
            const l = await getFileList(storageName!, path!)
            setFileInfo(l)
        } finally {
            setLoading(false)
        }
    }

    // 创建一个自定义函数用于更新路径，确保路径始终符合规范
    const updatePath = (newPath: string) => {
        const sanitizedPath = sanitizePath(newPath);
        setPath(sanitizedPath);
        setPathTemp(sanitizedPath)
    };

    //剪贴板去重
    const isClipHave = (storageName_: string, path: string): boolean => {
        return clipList.findIndex(v => v.storageName === storageName_ && v.path === path) !== -1;
    };
    const addCilp = (clip: clipListItem) => {
        if (isClipHave(clip.storageName, clip.path)) return;
        setClipList([...clipList, { isMove: clip.isMove, storageName: clip.storageName, path: clip.path, isDir: clip.isDir }])
    }

    useEffect(() => {
        //页面加载时，从URL中获取存储名称和路径
        if (getURLSearchParam('name')) {
            setStorageName(getURLSearchParam('name'))
            /*             if (getURLSearchParam('path')) {
                            setPath(getURLSearchParam('path'))
                        } */
        }


        if (!storageName && !getURLSearchParam('name') && rcloneInfo.storageList.length > 0) {
            for (const item of rcloneInfo.storageList) {
                if (item.hide) continue;
                setStorageName(item.name)
                break
            }
        }
    }, []);

    useEffect(() => {
        if (storageName && path) {
            fileInfo();
        }
    }, [path]);

    useEffect(() => {
        if (storageName && !path) {
            updatePath('/')
            setPathTemp('/')
        }

        if (storageName && path) {
            fileInfo();
        }
    }, [storageName])


    useEffect(() => {
    }, [clipList])

    function MakeDir() {
        let dirNameTemp = ''
        if (storageName && path) {
            modal.info!({
                title: t('create_directory'),
                icon: null,
                content: <Input placeholder={t('please_input')} defaultValue={dirNameTemp} onChange={(value) => dirNameTemp = value} />,
                onOk: async () => {
                    dirNameTemp ? await mkDir(storageName, path + '/' + dirNameTemp, fileInfo) : Message.error(t('dir_name_cannot_empty'))
                },
            })
        }
    }

    function UploadFile() {


        if (storageName && path) {
            modal.info!({
                title: t('upload_file'),
                icon: null,
                content: <>
                    <Upload drag customRequest={(option: RequestOptions) => { uploadFileRequest(option, storageName, path) }} ></Upload></>,
                onOk: fileInfo,
                onCancel: fileInfo
            })
        }
    }

    function fileRename(filePath: string, isDir: boolean) {
        console.log(getParentPath(filePath));

        let nameTemp = filePath.split('/').pop()!;
        modal.info!({
            title: t('rename'),
            icon: null,
            content: <Input placeholder={t('please_input')} defaultValue={nameTemp} onChange={(value) => nameTemp = value} />,
            onOk: async () => {
                if (nameTemp) {
                    isDir ? await moveDir(storageName!, filePath, storageName!, getParentPath(filePath), nameTemp) :
                        await moveFile(storageName!, filePath, storageName!, getParentPath(filePath), nameTemp);
                    fileInfo();
                } else {
                    Message.error(t('name_cannot_empty'))
                }
            },
        })
    }

    const openFile = (path: string) => {
        console.log(path);
        Message.info({ content: t('mount_the_storage_to_download_files'), id: 'openfile' })
    }

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <div style={{ width: "100%", height: "2rem", }}>
                {contextHolder}
                <Row >
                    <Col flex='2rem'>
                        <Button /* type='secondary' */ icon={<IconLeft />} onClick={() => { updatePath(getParentPath(path!)) }} disabled={!storageName} type='text' title={t('parent_directory')} />
                    </Col>
                    <Col flex='2rem'>
                        <Button /* type='secondary'  */ icon={<IconRefresh />} onClick={fileInfo} disabled={!storageName} type='text' title={t('refresh')} />
                    </Col>
                    <Col style={{ paddingLeft: '1rem', paddingRight: '0.2rem' }} flex='10rem'>
                        <Select  /* bordered={false} */ value={storageName} placeholder={t('please_select')} onChange={(value) => {
                            if (value !== storageName) {
                                setStorageName(value)
                                setPathTemp('/')
                                setPath('/')
                            }
                        }
                        }>
                            {filterHideStorage(rcloneInfo.storageList).map((item) => <Select.Option key={item.name} value={item.name} >{item.name}{/* ({searchStorageInfo(item.type).label}) */}</Select.Option>)}
                        </Select>
                    </Col>
                    <Col style={{ paddingLeft: '0.2rem', paddingRight: '1rem' }} flex='auto'>
                        <Input disabled={!storageName} value={pathTemp} normalize={() => { return path! }} onChange={(value) => { setPathTemp(value) }} onPressEnter={() => { updatePath(pathTemp) }} />
                    </Col>

                    <Col flex='2rem'>
                        <Button icon={<IconFolderAdd />} onClick={MakeDir} disabled={!storageName && !path} type='text' title={t('create_directory')} />
                    </Col>
                    <Col flex='2rem'>
                        <Button icon={<IconUpload />} onClick={UploadFile} disabled={!storageName && !path} type='text' title={t('upload_file')} />
                    </Col>
                    <Col flex='2rem' >
                        <Badge count={clipList.length} maxCount={9} title={t('clip_board')}>
                            <Dropdown disabled={clipList.length == 0} droplist={
                                <Menu>
                                    <Menu.Item onClick={() => {
                                        clipList.forEach((item) => {
                                            if (item.isMove) {
                                                if (item.isDir) {
                                                    moveDir(item.storageName, item.path, storageName!, path!);
                                                } else {
                                                    moveFile(item.storageName, item.path, storageName!, path!);
                                                }
                                            } else {
                                                if (item.isDir) {
                                                    copyDir(item.storageName, item.path, storageName!, path!);
                                                } else {
                                                    copyFile(item.storageName, item.path, storageName!, path!)
                                                }
                                            }
                                        })
                                        setClipList([])
                                        Notification.success({
                                            title: t('success'),
                                            content: t('transm_task_created'),
                                        })
                                    }} key='p' disabled={!storageName && !path}>{t('paste')}({clipList.length})</Menu.Item>
                                    <Menu.Item onClick={() => setClipList([])} key='q'>{t('empty_the_clipboard')}</Menu.Item>
                                </Menu>} position='bl'>
                                <Button icon={<IconPaste />} type='text' />
                            </Dropdown>
                        </Badge>
                    </Col>
                </Row>
            </div>

            <div style={{ height: 'calc(100% - 2rem)', marginTop: '1rem', overflow: 'auto' }}>
                {storageName ?
                    <>{
                        fileList ?
                            <Table columns={columns}
                                loading={loading}
                                pagination={false}
                                rowKey='path'
                                size='small'
                                noDataElement={<NoData_module />}
                                data={
                                    fileList.map((item) => {
                                        return {
                                            ...item, fileName: <div style={{ width: '100%' }}><Link style={{ width: '100%' }} onClick={() => { item.isDir ? updatePath(item.path) : openFile(item.path) }}><Typography.Ellipsis showTooltip>{item.name}</Typography.Ellipsis></Link></div>,
                                            fileSize: (item.size != -1 ? formatSize(item.size) : t('dir')),
                                            fileModTime: (new Date(item.modTime)).toLocaleString(),
                                            actions: <Space size={'mini'}>
                                                <Button onClick={() => { addCilp({ isMove: false, storageName: storageName!, path: item.path, isDir: item.isDir }) }} type='text' icon={<IconCopy />} title={t('copy')} />
                                                <Button onClick={() => { addCilp({ isMove: true, storageName: storageName!, path: item.path, isDir: item.isDir }) }} type='text' icon={<IconScissor />} title={t('cut')} />
                                                <Dropdown unmountOnExit={false} droplist={
                                                    <Menu>
                                                        <Menu.Item key='rename' style={{ color: 'var(primary-4)' }} onClick={() => fileRename(item.path, item.isDir)}><IconEdit /> {t('rename')}</Menu.Item>
                                                        <Menu.Item key='del' /* style={{ color: 'var(danger-4)' }} */>
                                                            <Popconfirm
                                                                focusLock
                                                                title={t('confirm_delete_question')}
                                                                onOk={() => {
                                                                    item.isDir ? delDir(storageName!, item.path, fileInfo) :
                                                                        delFile(storageName!, item.path, fileInfo)
                                                                }}
                                                            >
                                                                <IconDelete /> {t('delete')}
                                                            </Popconfirm></Menu.Item>
                                                    </Menu>} position='bl'>
                                                    <Button icon={<IconMore />} type='text' title={t('more')} />
                                                </Dropdown>
                                            </Space>
                                        }
                                    })} />
                            : <div style={{ textAlign: 'center', marginTop: '10rem', width: '100%' }}>
                                <div>{loading ? <Spin tip={t('filelist_loading')} /> : t('filelist_load_fail')}</div>
                            </div>
                    }
                    </> :
                    !storageName && <div style={tipsStyle}>
                        {t('please_select_storage')}
                    </div>
                }
            </div>
        </div>
    )
}



export { Explorer_page }