import { Button, Space } from "@arco-design/web-react"
import { useTranslation } from 'react-i18next';
import { delStorage, reupStorage } from "../../controller/storage/storage"
import { rcloneInfo } from "../../services/rclone"
import { useEffect, useReducer, useState } from "react";
import { hooks } from "../../services/hook";
import { useNavigate } from "react-router-dom";

import { Table, TableColumnProps } from '@arco-design/web-react';


function Storage_page() {
    const { t } = useTranslation()
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
    const navigate = useNavigate();

    useEffect(() => {
        hooks.upStorage = forceUpdate
    }, [ignored])

    const columns: TableColumnProps[] = [
        {
            title: t('name'),
            dataIndex: 'name',

        },
        {
            title: t('type'),
            dataIndex: 'type',
        },
        {
            title: t('actions'),
            dataIndex: 'actions',
            align:'right'
        }
    ]

    return (
        <div style={{ width: "100%", height: "100%", }}>
            <div style={{ width: "100%", height: "2rem", }}>
                <Space>
                    <Button onClick={() => { navigate('./add') }} type='primary'>{t('add')}</Button>
                    <Button onClick={reupStorage} type='primary'>{t('refresh')}</Button>
                </Space>

            </div>
            <div style={{ height: "calc(100% - 2rem)" }}>
                <br />
                <Table style={{ height: "100%" }} columns={columns} pagination={false} data={
                    rcloneInfo.storageList.map((item) => {
                        return {
                            ...item, actions: <Space>
                                <Button onClick={() => delStorage(item.name)}  status='danger'>{t('delete')}</Button>
                                <Button onClick={() => navigate('./add?edit=true&name=' + item.name + '&type=' + item.type)} type='primary'>{t('edit')}</Button></Space>
                        }
                    })} />
            </div>
        </div>
    )
}
































export { Storage_page }