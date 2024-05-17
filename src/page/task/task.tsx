import React, { useReducer } from 'react'
import { DevTips_module } from '../other/devTips'
import { Button, Grid, Link, Modal, Space, Table, TableColumnProps, Typography } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import { nmConfig, roConfig } from '../../services/config'
import { useNavigate } from 'react-router-dom'
import { delTask, taskScheduler } from '../../controller/task/task'
import { NoData_module } from '../other/noData'
import { IconQuestionCircle } from '@arco-design/web-react/icon'
import { openUrlInBrowser } from '../../utils/utils'
import { showLog } from '../other/modal'

const Row = Grid.Row;
const Col = Grid.Col;


function Task_page() {
  const { t } = useTranslation()
  const navigate = useNavigate();
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
  const [modal, contextHolder] = Modal.useModal();

  const columns: TableColumnProps[] = [
    {
      title: t('task_name'),
      dataIndex: 'name',
      width: '20%'
    },
    {
      title: t('state'),
      dataIndex: 'state',
      width: '5rem'
    }, {
      title: t('cycle'),
      dataIndex: 'cycle',
      width: '5rem'
    }
    , {
      title: t('run_info'),
      dataIndex: 'runInfo',
    },
    {
      title: t('actions'),
      dataIndex: 'actions',
      align: 'right',
      width: '6rem'
    }
  ];
  console.log(nmConfig.task);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {contextHolder}
      <Row style={{ width: '100%', height: '2rem' }}>
        <Col flex={'auto'}>
          <Space>
            <Button type='primary' onClick={() => { navigate('/task/add') }}>{t('add')}</Button>
            <Button onClick={() => { forceUpdate() }}>{t('refresh')}</Button>
          </Space>
        </Col>
        <Col flex={'4rem'} style={{ textAlign: 'right' }}>
          <Button title={t('help')} icon={<IconQuestionCircle />} onClick={() => { openUrlInBrowser(roConfig.url.docs + '/docs/task') }} />
        </Col>
      </Row>
      <div style={{ height: "calc(100% - 3rem)", marginTop: "1rem" }}>
        <Table columns={columns} noDataElement={<NoData_module />} data={nmConfig.task.map((taskItem) => {
          return {
            ...taskItem,
            state: taskItem.enable ? t('enabled') : t('disabled'),
            cycle: t('task_run_mode_' + taskItem.run.mode),
            runInfo: <Link style={{ width: '100%', height: '100%', display: 'block' }}
              onClick={() => { showLog(modal, taskItem.runInfo?.msg || t('none')) }}>
              <Typography.Ellipsis>{(taskItem.runInfo?.msg || t('none')).split('\n').pop()}</Typography.Ellipsis>
            </Link>,
            actions: <Space>
              <Button onClick={() => { delTask(taskItem.name); forceUpdate() }}>{t('delete')}</Button>
              <Button onClick={() => {
                taskScheduler.executeTask(taskItem)
                setTimeout(() => {
                  forceUpdate()
                }, 200)
              }}>{t('execute')}</Button>
            </Space>
          }
        })} />
      </div>
    </div>
  )
}

export { Task_page }