import React, { useEffect, useState } from 'react'
import { rcloneInfo } from '../../services/rclone'
import { hooks } from '../../services/hook'
import { RcloneTransferItem } from '../../type/rclone/stats'
import { Progress } from '@arco-design/web-react'
import { formatETA, formatSize } from '../../utils/rclone/utils'

function Transmit_page() {
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
    <div>
      已完成数：{rcloneInfo.stats.totalTransfers}
      <br />
      正在传输：{rcloneInfo.stats.transferring?.length}
      <br />
      总大小：{formatSize(rcloneInfo.stats.bytes)}
      /
      {formatSize(rcloneInfo.stats.totalBytes)}
      <br />
      进度：{~~(
         rcloneInfo.stats.bytes/rcloneInfo.stats.totalBytes *100
      )}%
      <br />
      总速度：{formatSize(rcloneInfo.stats.speed)}/s

      <br />
      总用时：{formatETA(rcloneInfo.stats.transferTime)}
      <br />
      剩余时间：{formatETA(rcloneInfo.stats.eta!)}
      <br /><br />

      {
        transmitList.map((item, index) => {
          return <div key={index}>

            {item.srcFs}{item.name}

            {item.dstFs}
            <br />
            进度:<Progress percent={item.percentage} size='mini' />
            <br />
            速度: {formatSize(item.speed)}/s
            <br />
            平均速度: {formatSize(item.speedAvg)}/s
            <br />
            剩余时间: {formatETA(item.eta!)}
            <br />
            大小: {formatSize(item.size)}/{formatSize(item.bytes)}

          </div>
        })
      }</div>
  )
}

export { Transmit_page }