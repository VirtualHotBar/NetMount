import { Alert, Button, Grid, Message, Modal, Space, Table, TableColumnProps, Typography } from '@arco-design/web-react'
import React, { useEffect, useReducer, useState } from 'react'
import { rcloneInfo } from '../../services/rclone'
import { delMountStorage, isMounted, mountStorage, reupMount, unmountStorage } from '../../controller/storage/mount/mount'
import { useTranslation } from 'react-i18next'
import { hooks } from '../../services/hook'
import { useNavigate } from 'react-router-dom'
import { nmConfig, osInfo, roConfig } from '../../services/config'
import { NoData_module } from '../other/noData'
import { getWinFspInstallState, installWinFsp, openUrlInBrowser, showPathInExplorer } from '../../utils/utils'
import { IconEye, IconQuestionCircle } from '@arco-design/web-react/icon'
import { exit } from '../../controller/main'
import { restartRclone } from '../../utils/rclone/process'
const Row = Grid.Row;
const Col = Grid.Col;








function Mount_page() {
  const { t } = useTranslation()
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
  const navigate = useNavigate();
  const [winFspInstallState, setWinFspInstallState] = useState<boolean>();
  const [winFspInstalling, setWinFspInstalling] = useState<boolean>();

  const columns: TableColumnProps[] = [
    {
      title: t('mount_path'),
      dataIndex: 'mountPath_',
      ellipsis: true,

    },
    {
      title: t('storage_name'),
      dataIndex: 'storageName',
      width:'10rem',
      ellipsis: true,
      render: (text) => {
        return <Typography.Ellipsis>{text}</Typography.Ellipsis>
      },
    },
    {
      title: t('mount_status'),
      dataIndex: 'mounted',
      width:'5.5rem',
    },
    {
      title: t('actions'),
      dataIndex: 'actions',
      align: 'right',
      width:'14.3rem'
    }
  ]

  const getWinFspState = async () => {
    console.log(await getWinFspInstallState());

    setWinFspInstallState(await getWinFspInstallState())
  }

  useEffect(() => {
    hooks.upMount = forceUpdate
    if (osInfo.osType === 'Windows_NT' && rcloneInfo.endpoint.isLocal && winFspInstallState === undefined) {
      getWinFspState()
    }
  }, [ignored])

  return (
    <div style={{ width: "100%", height: "100%", }}>

      <Row style={{ width: "100%", height: "2rem", }}>
        <Col flex={'auto'}>
          <Space>
            <Button onClick={() => { navigate('./add') }} type='primary'>{t('add')}</Button>
            <Button onClick={() => { reupMount() }}>{t('refresh')}</Button>
          </Space>
        </Col>
        <Col flex={'4rem'} style={{ textAlign: 'right' }}>
          <Button title={t('help')} icon={<IconQuestionCircle />} onClick={() => { openUrlInBrowser(roConfig.url.docs + '/docs/storage-mount') }} />
        </Col>
      </Row>

      <div style={{ height: "calc(100% - 3rem)" }}>
        <br />
        {
          winFspInstallState !== undefined && !winFspInstallState && <>
            <Alert type='warning' content={t('winfsp_not_installed')} action={<>
              <Button type='primary' onClick={async () => {
                setWinFspInstalling(true)
                if (await installWinFsp()) {
                  //await restartRclone()
                  Modal.success({
                    title: t('install_success'),
                    simple: true,
                    maskClosable: false,
                    escToExit: false,
                    content: t('restartself_to_take_effect'),
                    onOk: () => {
                      exit(true);
                    },
                  });

                  /* Message.info(t('about_to_restart_self'))
                  setTimeout(() => {
                    exit(true)
                  }, 1500) */
                } else {
                  Message.error(t('install_failed'))
                }
                setWinFspInstalling(false)
                await getWinFspState()
              }} loading={winFspInstalling}>{t('install')}</Button>
            </>} />
            <br />
          </>
        }
        <Table style={{ height: "100%" }} noDataElement={<NoData_module />} columns={columns} pagination={false} data={
          nmConfig.mount.lists.map((item) => {
            const mounted = isMounted(item.mountPath)
            return {
              ...item,
              mountPath_: <div style={{ display: 'flex', alignItems:'center' }}><Typography.Ellipsis className='singe-line' showTooltip>{item.mountPath}</Typography.Ellipsis>{rcloneInfo.endpoint.isLocal&&osInfo.osType==='Windows_NT' &&mounted&&
              <Button title={t('show_path_in_explorer')} onClick={async () => {
                await showPathInExplorer(item.mountPath,true)
               }} type='text' icon={<IconEye />}></Button>}</div>,
              mounted: mounted ? t('mounted') : t('unmounted'),
              actions: <Space>
                {
                  mounted ? <>  
                    <Button onClick={() => { unmountStorage(item.mountPath) }} status='danger' >{t('unmount')}</Button>
                  </> :
                    <>
                      <Button onClick={() => { delMountStorage(item.mountPath) }} status='danger' >{t('delete')}</Button>
                      <Button onClick={() => {  navigate('./add?edit=true&mountPath='+item.mountPath) }} >{t('edit')}</Button>
                      <Button onClick={() => { mountStorage(item) }} type='primary' >{t('mount')}</Button>
                      </>
                }
              </Space>
            }
          })} />
      </div>
    </div>
  )
}
export { Mount_page }