import { Button, Space, Table } from '@arco-design/web-react'
import React, { useEffect, useReducer } from 'react'
import { rcloneInfo } from '../../services/rclone'
import { reupMount, unmountStorage } from '../../controller/storage/mount/mount'
import { useTranslation } from 'react-i18next'
import { hooks } from '../../services/hook'
import { useNavigate } from 'react-router-dom'

function Mount_page() {
  const { t } = useTranslation()
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
  const navigate = useNavigate();

  const columns = [
    {
      title: '存储',
      dataIndex: 'storageName',
    },
    {
      title: 'mountPath',
      dataIndex: 'mountPath',
    },
    {
      title: 'mountedTime',
      dataIndex: 'time',
    },
    {
      title: 'Actions',
      dataIndex: 'actions'
    }
  ]

  useEffect(() => {
    hooks.upMount = forceUpdate
  }, [ignored])

  return (
    <div style={{ width: "100%", height: "100%", }}>
      <div style={{ width: "100%", height: "2rem", }}>
        <Space>
          <Button onClick={() => {navigate('./add') }} type='primary'>{t('add')}</Button>
          <Button onClick={reupMount} type='primary'>{t('refresh')}</Button>
        </Space>

      </div>
      <div style={{ height: "calc(100% - 2rem)" }}>
        <br />
        <Table style={{ height: "100%" }} columns={columns} pagination={false} data={
          rcloneInfo.mountList.map((item) => {
            return {
              ...item, 
              time: item.mountedTime.toLocaleString(),
              actions: <Space>
                <Button onClick={() => {unmountStorage(item.mountPath)}} status='danger' >{t('delete')}</Button>
              </Space>

            }
          })} />
      </div>
    </div>
  )
}
export { Mount_page }