import { useEffect, useState } from 'react'
import { rcloneInfo } from '../../services/rclone'
import { hooks } from '../../services/hook'
import { RcloneTransferItem } from '../../type/rclone/stats'
import { Card, Descriptions, List, Progress, Space, Typography, Alert } from '@arco-design/web-react'
import { formatETA, formatSize } from '../../utils/utils'
// import { Area } from '@ant-design/charts'
import { NoData_module } from '../other/noData'
import { useTranslation } from 'react-i18next'
import { openlistInfo } from '../../services/openlist'
// const Row = Grid.Row;
// const Col = Grid.Col;

function Transmit_page() {
  const { t } = useTranslation()
  const [transmitList, setTransmitList] = useState<RcloneTransferItem[]>([])

  useEffect(() => {
    hooks.upStats = () => {
      if (rcloneInfo.stats.transferring) {
        setTransmitList(rcloneInfo.stats.transferring)
      } else {
        setTransmitList([])
      }
    }
    hooks.upStats()
  }, [])

  return (
    <div style={{ margin: '0' }}>
      <Card style={{}}
        title={t('overview')}
        bordered={false}
      >

        <Space direction='vertical' style={{ width: '100%' }}>
          {
            transmitList.length > 0 && rcloneInfo.stats.realSpeed === 0 && rcloneInfo.stats.speed === 0 &&
            <Alert
              style={{ margin: '0.1rem' }}
              type='info'
              content={t('unable_to_obtain_transmission_speed')}
            />
          }


          {rcloneInfo.stats.bytes > 0 && <Progress percent={~~(rcloneInfo.stats.bytes / rcloneInfo.stats.totalBytes * 100)} />}
          <Descriptions colon=' :' data={[
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
            ...(Number(rcloneInfo.stats.totalTransfers) > 0 ? [
              {
                label: t('transferred'),
                value: rcloneInfo.stats.totalTransfers
              }
            ] : []),

          ]} />


        </Space>
      </Card>
      {/* <Area data={rcloneStatsHistory} xField='elapsedTime' yField='speed' height={200} />  */}

      <Card style={{}}
        title={t('transferring')}
        bordered={false}
      >

        <List noDataElement={<NoData_module />}>
          {
            transmitList.map((item, index) => {
              return <List.Item key={index}>
                <div style={{ width: '100%', display: 'flex' }}>
                  <div style={{ width: '5rem' }}>
                    <Progress type={'circle'} percent={item.percentage} style={{ marginTop: '0.5rem' }} size='small' />
                  </div>
                  <div style={{ width: 'calc(100% - 5rem)', overflow: 'auto' }}>
                    <Typography.Ellipsis >{item.name}</Typography.Ellipsis>
                    <Descriptions
                      size='small'
                      labelStyle={{ textAlign: 'right' }}
                      colon=' :'
                      /* layout='inline-vertical' */
                      data={[
                        {
                          label: t('speed'),
                          value: `${formatSize(item.speed)}/s`
                        },
                        {
                          label: t('size'), value: `${formatSize(item.bytes)}/${formatSize(item.size)}`
                        },
                        {
                          label: t('source'),
                          value: (item.srcFs || '').replace(openlistInfo.markInRclone + ':', '')
                        },
                        {
                          label: t('speed_avg'),
                          value: `${formatSize(item.speedAvg)}/s`
                        },
                        ...(Number(item.eta) > 0 ? [
                          {
                            label: t('eta'),
                            value: formatETA(item.eta!)
                          }
                        ] : []),
                        ...(item.dstFs ? [
                          {
                            label: t('target'),
                            value: (item.dstFs || '').replace(openlistInfo.markInRclone + ':', '')
                          }
                        ] : []),
                      ]} />
                  </div>
                </div>
              </List.Item>
            })
          }
        </List>

      </Card>
    </div>
  )
}

export { Transmit_page }