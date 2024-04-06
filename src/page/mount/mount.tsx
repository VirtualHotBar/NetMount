import { Button, Space, Table, TableColumnProps } from '@arco-design/web-react'
import React, { useEffect, useReducer } from 'react'
import { rcloneInfo } from '../../services/rclone'
import { delMountStorage, isMounted, mountStorage, reupMount, unmountStorage } from '../../controller/storage/mount/mount'
import { useTranslation } from 'react-i18next'
import { hooks } from '../../services/hook'
import { useNavigate } from 'react-router-dom'
import { nmConfig } from '../../services/config'
import { NoData_module } from '../other/noData'

function Mount_page() {
  const { t } = useTranslation()
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
  const navigate = useNavigate();

  const columns: TableColumnProps[] = [
    {
      title: t('storage_name'),
      dataIndex: 'storageName',
    },
    {
      title: t('mount_path'),
      dataIndex: 'mountPath',
    },
    {
      title: t('mount_status'),
      dataIndex: 'mounted',
    },
    {
      title: t('actions'),
      dataIndex: 'actions',
      align: 'right'
    }
  ]

  useEffect(() => {
    hooks.upMount = forceUpdate
  }, [ignored])

  return (
    <div style={{ width: "100%", height: "100%", }}>
      <div style={{ width: "100%", height: "2rem", }}>
        <Space>
          <Button onClick={() => { navigate('./add') }} type='primary'>{t('add')}</Button>
          <Button onClick={() => { reupMount() }}>{t('refresh')}</Button>
        </Space>
      </div>
      <div style={{ height: "calc(100% - 2rem)" }}>
        <br />
        <Table style={{ height: "100%" }} noDataElement={ <NoData_module />} columns={columns} pagination={false} data={
          nmConfig.mount.lists.map((item) => {
            const mounted = isMounted(item.mountPath)
            return {
              ...item,
              mounted: mounted ? t('mounted') : t('unmounted'),
              actions: <Space>
                {
                  mounted ? <>
                  <Button onClick={() => { unmountStorage(item.mountPath) }} status='danger' >{t('unmount')}</Button>
                  </> :
                   <>
                   <Button onClick={() => { delMountStorage(item.mountPath) }} status='danger' >{t('delete')}</Button>
                   <Button onClick={() => { mountStorage(item) }} type='primary' >{t('mount')}</Button></>
                }

              </Space>

            }
          })} />
      </div>
    </div>
  )
}
export { Mount_page }