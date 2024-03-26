import React, { CSSProperties, useEffect, useReducer, useState } from 'react'
import { Button, Input, Link, List, Select, Spin, Tabs, Typography } from '@arco-design/web-react';
import { rcloneInfo } from '../../services/rclone';
import { useTranslation } from 'react-i18next';
import { getFileList } from '../../controller/storage/storage';
import { FileInfo } from '../../type/rclone/rcloneInfo';
const TabPane = Tabs.TabPane;
const tipsStyle: CSSProperties = {
    textAlign: 'center',
    marginTop: '6rem',
};

function Explorer_page() {
    return (
        <>
            <Tabs defaultActiveTab='1'>
                <TabPane key='1' title='Tab 1'>
                    <ExplorerItem />
                </TabPane>
            </Tabs>
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

function ExplorerItem() {
    const { t } = useTranslation()
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
    const [storageName, setStorageName] = useState<string>()
    const [path, setPath] = useState<string>()
    const [pathTemp, setPathTemp] = useState<string>('')

    const [fileList, setFileInfo] = useState<Array<FileInfo>>()

    const [loading, setLoading] = useState(false)


    async function fileInfo() {
        setLoading(true)
        const l = await getFileList(storageName!, path!)
        setLoading(false)
        setFileInfo(l)
    }

    // 创建一个自定义函数用于更新路径，确保路径始终符合规范
    const updatePath = (newPath: string) => {
        const sanitizedPath = sanitizePath(newPath);
        setPath(sanitizedPath);
        setPathTemp(sanitizedPath)
    };

    useEffect(() => {
        console.log(storageName);

        if (storageName && path) {
            /*             if (path == '' || path == void 0) {
                            updatePath('/')
                            setPathTemp('/')
                        } */
            fileInfo();
        }
    }, [path]);

    useEffect(() => {
        if (storageName && !path) {
            updatePath('/')
            setPathTemp('/')
        }
    }, [storageName])

    return (
        <>
            <Input.Group compact>
                <Select defaultValue={storageName} style={{ width: '9rem' }} placeholder={t('please_select')} onChange={(value) =>
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
                <Input style={{ width: 'calc(100% - 9rem)' }} disabled={!storageName} value={pathTemp} normalize={() => { return path! }} onChange={(value) => { setPathTemp(value) }} onPressEnter={() => { updatePath(pathTemp) }} />
            </Input.Group>
            {storageName && !loading ?
                <List>{
                    fileList ?
                        fileList.map((item) => {
                            return <FileItem fileInfo={item} setPath={updatePath} />
                        })
                        : ''
                }
                </List> :
                !storageName && <Typography.Paragraph style={tipsStyle}>{t('please_select_storage')}</Typography.Paragraph>
            }
            {
                loading && <Spin size={40} />
            }
        </>
    )
}

interface FileItemProps {
    fileInfo: FileInfo,
    setPath: (path: string) => void;
}

function FileItem(props: FileItemProps) {
    return (
        <List.Item key={1} actions={[<span >Edit</span>,
        <span>Delete</span>,]}>
            
            <Link hoverable={false}  onClick={() => {props.fileInfo.IsDir && props.setPath(props.fileInfo.Path) }}>{props.fileInfo.Name}</Link>
        </List.Item>
    )
}

export { Explorer_page }