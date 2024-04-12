import React, { useEffect, useState } from 'react'
import { rcloneInfo, rcloneStatsHistory } from '../../services/rclone'
import { hooks } from '../../services/hook'
import { RcloneTransferItem } from '../../type/rclone/stats'
import { Card, Descriptions, List, Progress, Space, Statistic, Grid, Typography } from '@arco-design/web-react'
import { formatETA, formatSize } from '../../utils/utils'
import { Area } from '@ant-design/charts'
import { NoData_module } from '../other/noData'
import { useTranslation } from 'react-i18next'
const Row = Grid.Row;
const Col = Grid.Col;

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
    <div style={{margin:'0'}}>
      <Card style={{}}
        title={t('overview')}
        bordered={false}
      >
        <Space direction='vertical' style={{ width: '100%' }}>

          {rcloneInfo.stats.bytes > 0 && <Progress percent={~~(rcloneInfo.stats.bytes / rcloneInfo.stats.totalBytes * 100)} />}
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
            ...(Number(rcloneInfo.stats.totalTransfers) > 0 ? [
              {
                label: t('transferred'),
                value: rcloneInfo.stats.totalTransfers
              }
            ] : []),

          ]} />


        </Space>
      </Card>
      {/* <Area data={rcloneStatsHistory} xField='elapsedTime' yField='speed' height={200} /> */}

      <Card style={{}}
        title={t('transferring')}
        bordered={false}
      >

        <List noDataElement={ <NoData_module />}>
          {
            transmitList.map((item, index) => {
              return <List.Item key={index}>
                <Row >
                  <Col flex={'5rem'}>

                    <Progress type={'circle'} percent={item.percentage} style={{ marginTop: '0.5rem' }} />
                  </Col>
                  <Col flex={'auto'}>
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
                          value: item.srcFs
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
                            value: item.dstFs
                          }
                        ] : []),
                      ]} />
                  </Col>
                </Row>
              </List.Item>
            })
          }
        </List>

      </Card>
    </div>
  )
}

export { Transmit_page }