import { Button, Popconfirm, Space } from "@arco-design/web-react"
import { useTranslation } from 'react-i18next';
import { delStorage, reupStorage } from "../../controller/storage/storage"
import { rcloneInfo } from "../../services/rclone"
import { useEffect, useReducer, useState } from "react";
import { hooks } from "../../services/hook";
import { useNavigate } from "react-router-dom";

import { Table, TableColumnProps } from '@arco-design/web-react';
import { NoData_module } from "../other/noData";
import { searchStorage } from "../../controller/storage/listAll";


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
            align: 'right'
        }
    ]

    return (
        <div style={{ width: "100%", height: "100%", }}>
            <div style={{ width: "100%", height: "2rem", }}>
                <Space>
                    <Button onClick={() => { navigate('./add') }} type='primary'>{t('add')}</Button>
                    <Button onClick={reupStorage} >{t('refresh')}</Button>
                </Space>

            </div>
            <div style={{ height: "calc(100% - 2rem)" }}>
                <br />
                <Table style={{ height: "100%" }} noDataElement={<NoData_module />} columns={columns} pagination={false} data={
                    rcloneInfo.storageList.map((item) => {
                        return {
                            ...item,
                            type: searchStorage(item.type).name,
                            actions: <Space>
                                <Popconfirm
                                    focusLock
                                    title={t('confirm_delete_question')}
                                    onOk={() => {
                                        delStorage(item.name)
                                    }}
                                >
                                    <Button status='danger' type='secondary'>{t('delete')}</Button>
                                </Popconfirm>

                                <Button onClick={() => navigate('./add?edit=true&name=' + item.name + '&type=' + item.type)}>{t('edit')}</Button>
                                <Button onClick={() => navigate('/storage/explorer?name=' + item.name)} >{t('explorer')}</Button>
                                <Button onClick={() => navigate('/mount/add?name=' + item.name)} type='primary'>{t('mount')}</Button>
                            </Space>

                        }
                    })} />
            </div>
        </div>
    )
}









export { Storage_page }