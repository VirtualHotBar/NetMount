import { Button, Grid, Input, Modal, Popconfirm, Space, Tag, Tooltip } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import { delStorage, filterHideStorage, renameStorage } from '../../services/storage/StorageManager'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStorageStore } from '../../stores'

import { Table, TableColumnProps } from '@arco-design/web-react'
import { NoData_module } from '../other/noData'
import { searchStorageInfo } from '../../controller/storage/allList'
import { IconQuestionCircle } from '@arco-design/web-react/icon'
import { openUrlInBrowser } from '../../utils'
import { roConfig } from '../../services/ConfigService'

const Row = Grid.Row
const Col = Grid.Col

function Storage_page() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { storageList, refreshStorage } = useStorageStore()
  const [renameModalVisible, setRenameModalVisible] = useState(false)
  const [renamingStorage, setRenamingStorage] = useState<string>('')
  const [newStorageName, setNewStorageName] = useState<string>('')

  useEffect(() => {
    refreshStorage()
  }, [])

  const handleRefresh = () => {
    refreshStorage()
  }

  const handleRename = async () => {
    if (!newStorageName.trim()) {
      return
    }
    const success = await renameStorage(renamingStorage, newStorageName.trim())
    if (success) {
      setRenameModalVisible(false)
      refreshStorage()
    }
  }

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
      align: 'right',
    },
  ]

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Row style={{ width: '100%', height: '2rem' }}>
        <Col flex={'auto'}>
          <Space>
            <Button
              onClick={() => {
                navigate('./add')
              }}
              type="primary"
            >
              {t('add')}
            </Button>
            <Button onClick={handleRefresh}>{t('refresh')}</Button>
          </Space>
        </Col>
        <Col flex={'4rem'} style={{ textAlign: 'right' }}>
          <Button
            title={t('help')}
            icon={<IconQuestionCircle />}
            onClick={() => {
              openUrlInBrowser(roConfig.url.docs + '/docs/storage-mgr')
            }}
          />
        </Col>
      </Row>
      <div style={{ height: 'calc(100% - 3rem)' }}>
        <br />
        <Table
          style={{ height: '100%' }}
          noDataElement={<NoData_module />}
          columns={columns}
          pagination={false}
          rowKey="name"
          data={filterHideStorage(storageList).map(item => {
            const isNotWork =
              item.framework === 'openlist' && item.other?.openlist?.status !== 'work'
            const hasTokenError = item.space && item.space.total === -3
            return {
              ...item,
              name: (
                <>
                  {item.name}
                  {isNotWork ? (
                    <Tooltip
                      content={item.other?.openlist?.status}
                      color="#FF6060"
                      style={{ marginRight: '10rem' }}
                    >
                      {' '}
                      <Tag color="RED">{t('not_work')}</Tag>
                    </Tooltip>
                  ) : hasTokenError ? (
                    <Tooltip
                      content={t('token_expired_tip')}
                      color="#FF6060"
                      style={{ marginRight: '10rem' }}
                    >
                      {' '}
                      <Tag color="ORANGE">{t('token_expired')}</Tag>
                    </Tooltip>
                  ) : (
                    ''
                  )}
                </>
              ),
              type: t(searchStorageInfo(item.type).label),
              actions: (
                <Space>
                  <Popconfirm
                    focusLock
                    title={t('confirm_delete_question')}
                    onOk={() => {
                      delStorage(item.name)
                    }}
                  >
                    <Button status="danger" type="secondary">
                      {t('delete')}
                    </Button>
                  </Popconfirm>

                  <Button
                    onClick={() => {
                      setRenamingStorage(item.name)
                      setNewStorageName(item.name)
                      setRenameModalVisible(true)
                    }}
                  >
                    {t('rename')}
                  </Button>

                  <Button
                    onClick={() =>
                      navigate('./add?edit=true&name=' + item.name + '&type=' + item.type)
                    }
                  >
                    {t('edit')}
                  </Button>
                  <Button onClick={() => navigate('/storage/explorer?name=' + item.name)}>
                    {t('explorer')}
                  </Button>
                  <Button onClick={() => navigate('/mount/add?name=' + item.name)} type="primary">
                    {t('mount')}
                  </Button>
                </Space>
              ),
            }
          })}
        />
      </div>

      <Modal
        title={t('rename_storage')}
        visible={renameModalVisible}
        onOk={handleRename}
        onCancel={() => setRenameModalVisible(false)}
        okText={t('save')}
        cancelText={t('step_back')}
      >
        <Input
          value={newStorageName}
          onChange={value => setNewStorageName(value)}
          placeholder={t('please_input')}
        />
      </Modal>
    </div>
  )
}

export { Storage_page }
