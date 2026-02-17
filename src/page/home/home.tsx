import React, { useEffect, useReducer } from 'react'

import { Alert, Button, Card, Descriptions, Grid, Link, Modal, Notification, Space, Typography } from "@arco-design/web-react"
import { rcloneInfo } from '../../services/rclone'
import { hooks } from '../../services/hook';
import { checkUpdate } from '../../controller/update/update';
import * as shell from '@tauri-apps/plugin-shell';
import { formatETA, formatSize } from '../../utils/utils';
import { useTranslation } from 'react-i18next';
import { nmConfig } from '../../services/config';
import { IconCloud, IconList, IconStorage, IconSwap } from '@arco-design/web-react/icon';
import { filterHideStorage } from '../../controller/storage/storage';
const Row = Grid.Row;
const Col = Grid.Col;

let checkedUpdate: boolean = false;

//checkedUpdate = true;

function Home_page() {
  const { t } = useTranslation()
  const [, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
  const [modal, contextHolder] = Modal.useModal();
  const [notification, noticeContextHolder] = Notification.useNotification();
  const storageList=filterHideStorage(rcloneInfo.storageList)

  useEffect(() => {
    hooks.upStats = forceUpdate;
    console.log(nmConfig.notice);

    if (nmConfig.notice && !nmConfig.notice.displayed && nmConfig.notice.data.content) {
      notification.info!({
        ...(nmConfig.notice.data.title && { title: nmConfig.notice.data.title }),
        content: nmConfig.notice.data.content,
        ...{ duration: nmConfig.notice.manual_close ? 1000*60*60*24*365 : 3000 },
      })
      nmConfig.notice.displayed = true
    }

    if (!checkedUpdate) {
      checkUpdate(async (info,localVersions) => {
        modal.confirm!({
          title: t('update_available'),
          content: <>
            {`${t('current_version')}:${localVersions} , ${t('latest_version')}:${info.name}`}
            <br />
            {t('goto_the_website_get_latest_version_ask')}
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
      {contextHolder}{noticeContextHolder}
      <Space direction='vertical' style={{ width: '100%' }}>
        {/* <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>欢迎使用,统一管理和挂载云存储设施。</h1> */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <h1 style={{ fontSize: '2.0rem', fontWeight: 'bold', marginBottom: '1.0rem', marginTop: '0.8rem' }}>NetMount</h1>
          <span style={{ color: 'var(--color-text-2)', fontSize: '1.1rem' }}>{t('netmount_slogan')}</span>
        </div>
        {/*<Row >
                    <Col flex={'auto'}style={{ paddingLeft: '0rem', paddingRight: '0rem' }} >
                        <Card style={{padding:'1.5rem',textAlign:'center'}} bordered={false}>
                            <span style={{fontSize:'4.5rem',fontFamily:'emoji'}}>🧐</span>
                            <p style={{fontSize:'1rem',fontWeight:'bold'}}>初次使用，请点击下方按钮进行配置</p>
                        </Card>
                    </Col>
            </Row> */}
        {/*         <Card title='状态概览' size='small'>
          运行时间：{formatETA(rcloneInfo.stats.elapsedTime)}
        </Card> */}

        <div style={{ height: '1.5rem' }} />
        {storageList && !(storageList.length > 0) &&
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Alert style={{ maxWidth: '20rem', marginBottom: '1.0rem' }} type='info' content={
              <Row >
                <Col flex={'auto'} >
                  <Typography.Ellipsis>{t('please_add_storage_tip')}</Typography.Ellipsis>
                </Col>
                <Col flex={'4rem'} style={{ textAlign: 'right' }}>
                  <Link type='text' onClick={() => { hooks.navigate('/storage/manage/add') }}> {t('add')} </Link>
                </Col>
              </Row>
            } />
          </div>
        }
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Space style={{ height: '100%' }}>
            <Card style={{ width: '10rem', height: '6rem' }} hoverable >
              <strong ><IconCloud /> {t('storage')}</strong>({filterHideStorage(storageList).length})<br />
              <div style={{ paddingTop: '1.3rem', width: '100%', textAlign: 'center' }}>
                <Space>
                  <Button type='text' onClick={() => { hooks.navigate('/storage/manage/add') }}> {t('add')} </Button>
                  <Button type='text' onClick={() => { hooks.navigate('/storage/manage') }}> {t('manage')} </Button>
                </Space>
              </div>
            </Card>
            <Card style={{ width: '10rem', height: '6rem' }} hoverable>
              <strong ><IconStorage /> {t('mount')}</strong>({rcloneInfo.mountList.length})
              <div style={{ paddingTop: '1.3rem', width: '100%', textAlign: 'center' }}>
                <Space>
                  <Button type='text' onClick={() => { hooks.navigate('/mount/add') }} > {t('add')} </Button>
                  <Button type='text' onClick={() => { hooks.navigate('/mount') }} >  {t('manage')} </Button>
                </Space>
              </div>
            </Card>
            <Card style={{ width: '10rem', height: '6rem' }} hoverable>
              <strong ><IconList /> {t('task')}</strong>({nmConfig.task.length})
              <div style={{ paddingTop: '1.3rem', width: '100%', textAlign: 'center' }}>
                <Space>
                  <Button type='text' onClick={() => { hooks.navigate('/task/add') }} >{t('add')} </Button>
                  <Button type='text' onClick={() => { hooks.navigate('/task') }}> {t('manage')}  </Button>
                </Space>
              </div>
            </Card>
          </Space>
        </div>
        <br /><br />
        {/*         <Card>
          存储和挂载概览
          <br />
          存储数：
          <br />
          挂载数：{nmConfig.mount.lists.length}
          <br />
          已挂载：{rcloneInfo.mountList.length}
        </Card> */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Card hoverable style={{ maxWidth: '40rem', width: '100%', marginLeft: '1rem', marginRight: '1rem', marginTop: '1rem' }}>



            <Row >
              <Col flex={'1'} >
                <IconSwap style={{ transform: 'rotate(90deg)' }} /> {t('transmission_overview')}
              </Col>
              <Col flex={'1'} style={{ textAlign: 'right' }}>
                <Button type='text' onClick={() => { hooks.navigate('/transmit') }} >{t('view_more')}</Button>
              </Col>
            </Row>




            <Descriptions style={{ marginTop: '0.8rem' }} colon=' :' data={[
              {
                label: t('speed'),
                value: `${formatSize(rcloneInfo.stats.realSpeed!)}/s`
              },

              {
                label: t('size'),
                value: `${formatSize(rcloneInfo.stats.bytes)}/${formatSize(rcloneInfo.stats.totalBytes)}`
              },

              ...(rcloneInfo.stats.transferTime > 0 ? [
                {
                  label: t('used_time'),
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
        </div>
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