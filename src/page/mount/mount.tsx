import {
  Alert,
  Button,
  Grid,
  Message,
  Space,
  Table,
  TableColumnProps,
  Typography,
} from '@arco-design/web-react'
import { useEffect, useState } from 'react'
import { useMountList, useMountStore } from '../../stores'
import { rcloneInfo } from '../../services/rclone'
import { logger } from '../../services'
import {
  delMountStorage,
  getMountStorage,
  isMounted,
  mountStorage,
  reupMount,
  unmountStorage,
} from '../../controller/storage/mount/mount'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { osInfo, roConfig } from '../../services/ConfigService'
import { NoData_module } from '../other/noData'
import {
  getWinFspInstallState,
  installWinFsp,
  openUrlInBrowser,
  openWinFspInstaller,
  showPathInExplorer,
} from '../../utils'
import { IconEye, IconQuestionCircle } from '@arco-design/web-react/icon'
import { exit } from '../../controller/main'
const Row = Grid.Row
const Col = Grid.Col

function Mount_page() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mountList = useMountList()
  const refreshMounts = useMountStore((state) => state.refreshMounts)
  const [winFspInstallState, setWinFspInstallState] = useState<boolean>()
  const [winFspInstalling, setWinFspInstalling] = useState<boolean>()

  const columns: TableColumnProps[] = [
    {
      title: t('mount_path'),
      dataIndex: 'mountPath_',
      ellipsis: true,
    },
    {
      title: t('storage_name'),
      dataIndex: 'storageName',
      width: '10rem',
      ellipsis: true,
      render: text => {
        return <Typography.Ellipsis>{text}</Typography.Ellipsis>
      },
    },
    {
      title: t('mount_status'),
      dataIndex: 'mounted',
      width: '5.5rem',
    },
    {
      title: t('actions'),
      dataIndex: 'actions',
      align: 'right',
      width: '14.3rem',
    },
  ]

  const getWinFspState = async () => {
    const state = await getWinFspInstallState()
    logger.debug('WinFsp install state', 'Mount', { state })

    setWinFspInstallState(state)
  }

  useEffect(() => {
    // Initial load of mounts
    refreshMounts()
    
    if (
      osInfo.osType === 'windows' &&
      rcloneInfo.endpoint.isLocal &&
      winFspInstallState === undefined
    ) {
      getWinFspState()
    }
  }, [])

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
            <Button
              onClick={() => {
                reupMount()
              }}
            >
              {t('refresh')}
            </Button>
          </Space>
        </Col>
        <Col flex={'4rem'} style={{ textAlign: 'right' }}>
          <Button
            title={t('help')}
            icon={<IconQuestionCircle />}
            onClick={() => {
              openUrlInBrowser(roConfig.url.docs + '/docs/storage-mount')
            }}
          />
        </Col>
      </Row>

      <div style={{ height: 'calc(100% - 3rem)' }}>
        <br />
        {winFspInstallState !== undefined && !winFspInstallState && (
          <>
            <Alert
              type="warning"
              content={t('winfsp_not_installed')}
              action={
                <>
                  <Button
                    type="primary"
                    onClick={async () => {
                      setWinFspInstalling(true)
                      if (await installWinFsp()) {
                        await exit(true)
                      } else {
                        Message.error(t('install_failed'))
                        await openWinFspInstaller()
                      }
                      await getWinFspState()
                      setWinFspInstalling(false)
                    }}
                    loading={winFspInstalling}
                  >
                    {t('install')}
                  </Button>
                </>
              }
            />
            <br />
          </>
        )}
        {osInfo.osType === 'windows' && (
          <Alert
            type="info"
            content={t('network_share_tip')}
            style={{ marginBottom: '0.5rem' }}
            closable
          />
        )}
        <Table
          style={{ height: '100%' }}
          noDataElement={<NoData_module />}
          columns={columns}
          pagination={false}
          data={mountList.map(item => {
            const mounted = isMounted(item.mountPath)
            return {
              key: item.mountPath, // 添加唯一 key 避免 React 警告
              storageName: item.storageName,
              mountPath: item.mountPath,
              mountPath_: (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Typography.Ellipsis className="singe-line" showTooltip>
                    {item.mountPath}
                  </Typography.Ellipsis>
                  {rcloneInfo.endpoint.isLocal && osInfo.osType === 'windows' && mounted && (
                    <Button
                      title={t('show_path_in_explorer')}
                      onClick={async () => {
                        await showPathInExplorer(item.mountPath, true)
                      }}
                      type="text"
                      icon={<IconEye />}
                    ></Button>
                  )}
                </div>
              ),
              mounted: mounted ? t('mounted') : t('unmounted'),
              actions: (
                <Space>
                  {mounted ? (
                    <>
                      <Button
                        onClick={async () => {
                          const success = await unmountStorage(item.mountPath)
                          if (success) {
                            Message.success(t('unmount_successfully') || '卸载成功')
                          }
                        }}
                        status="danger"
                      >
                        {t('unmount')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={async () => {
                          await delMountStorage(item.mountPath)
                        }}
                        status="danger"
                      >
                        {t('delete')}
                      </Button>
                      <Button
                        onClick={() => {
                          navigate('./add?edit=true&mountPath=' + item.mountPath)
                        }}
                      >
                        {t('edit')}
                      </Button>
                      <Button
                        onClick={async () => {
                          // 获取完整的挂载配置
                          const mountConfig = getMountStorage(item.mountPath)
                          if (!mountConfig) {
                            Message.error(t('mount_config_not_found'))
                            return
                          }
                          const success = await mountStorage(mountConfig)
                          if (success) {
                            Message.success(t('mount_storage_successfully'))
                          }
                        }}
                        type="primary"
                      >
                        {t('mount')}
                      </Button>
                    </>
                  )}
                </Space>
              ),
            }
          })}
        />
      </div>
    </div>
  )
}
export { Mount_page }
