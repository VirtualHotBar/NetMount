import React, { useEffect, useReducer, useState } from 'react'

import { Button, Card, Descriptions, Grid, Modal, Space, Typography } from "@arco-design/web-react"
import { Test } from "../../controller/test"
import { rcloneInfo } from '../../services/rclone'
import { hooks } from '../../services/hook';
import { checkUpdate } from '../../controller/update/update';
import { getVersion } from '@tauri-apps/api/app';
import { shell } from '@tauri-apps/api';
import { formatETA, formatSize } from '../../utils/utils';
import { useTranslation } from 'react-i18next';
import { nmConfig } from '../../services/config';
const Row = Grid.Row;
const Col = Grid.Col;

let checkedUpdate: boolean = false;

function Home_page() {
    const { t } = useTranslation()
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
    const [modal, contextHolder] = Modal.useModal();

    useEffect(() => {
        hooks.upStats = forceUpdate;

        if (!checkedUpdate) {
            checkUpdate(async (info) => {
                modal.confirm!({
                    title: '发现新版本',
                    content: <>
                        {`当前版本为${await getVersion()},最新版本为${info.name}`}
                        <br />
                        是否前往官网获取最新版？
                    </>,
                    onOk: () => {
                        shell.open(info.website!)
                    },
                })
            })
            checkedUpdate = true;
        }

    }, [])

    return (
        <div>
            {contextHolder}
            <Space direction='vertical' style={{ width: '100%' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>欢迎使用,统一管理和挂载云存储设施。</h2>
                {/*<Row >
                    <Col flex={'auto'}style={{ paddingLeft: '0rem', paddingRight: '0rem' }} >
                        <Card style={{padding:'1.5rem',textAlign:'center'}} bordered={false}>
                            <span style={{fontSize:'4.5rem',fontFamily:'emoji'}}>🧐</span>
                            <p style={{fontSize:'1rem',fontWeight:'bold'}}>初次使用，请点击下方按钮进行配置</p>
                        </Card>
                    </Col>
            </Row> */}
                <Card>
                    状态概览
                    <br />
                    运行时间：{formatETA(rcloneInfo.stats.elapsedTime)}
                </Card>
                <Card>
                  存储和挂载概览
                  <br />
                  存储数：{rcloneInfo.storageList.length}
                  <br />
                  挂载数：{nmConfig.mount.lists.length}
                  <br />
                  已挂载：{rcloneInfo.mountList.length}
                </Card>
                <Card>
                  传输概览
                <Descriptions colon=' :' data={[
            {
              label:t('speed'),
              value: `${formatSize(rcloneInfo.stats.realSpeed!)}/s`
            },

            {
              label: t('size'),
              value: `${formatSize(rcloneInfo.stats.bytes)}/${formatSize(rcloneInfo.stats.totalBytes)}`
            },

            ...(rcloneInfo.stats.transferTime > 0 ? [
              {
                label:t('used_time'),
                value: formatETA(rcloneInfo.stats.transferTime)
              }
            ] : []),
            ...(Number(rcloneInfo.stats.eta) > 0 ? [
              {
                label: t('eta'),
                value: formatETA(rcloneInfo.stats.eta!)
              }
            ] : []),
            ...(rcloneInfo.stats.transferring && Number(rcloneInfo.stats.transferring.length) > 0 ? [
              {
                label: t('transferring'),
                value: rcloneInfo.stats.transferring.length
              }
            ] : []),
            ...(Number(rcloneInfo.stats.totalTransfers) > 0 ? [
              {
                label: t('transferred'),
                value: rcloneInfo.stats.totalTransfers
              }
            ] : []),

          ]} />
                </Card>

            </Space>
        </div>

    )
}

/* 软件名称:NetMount
软件功能:挂载云存储到本地

主菜单（位于左边）:首页(待实现)，存储(添加存储，编辑存储，浏览和管理存储内文件)，挂载存储(挂载为本地路径或盘符)，传输（当前在传输的文件信息、速度、剩余时间等），任务(定时或间隔，可执行存储的文件同步、文件复制、文件删除、挂载等)

软件整体布局为左：主菜单，右：对应页面

现在就还有软件首页没有写了，请你为我的软件设计一个首页 */

export { Home_page }