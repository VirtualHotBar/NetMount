import React, { useReducer } from 'react'
import { DevTips_module } from '../other/devTips'
import { Button, Space, Table, TableColumnProps } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import { nmConfig } from '../../services/config'
import { useNavigate } from 'react-router-dom'
import { delTask } from '../../controller/task/task'
import { NoData_module } from '../other/noData'

function Task_page() {
  const { t } = useTranslation()
  const navigate = useNavigate();
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件

  const columns: TableColumnProps[] = [
    {
      title: t('task_name'),
      dataIndex: 'name',
    },
    {
      title: t('state'),
      dataIndex: 'state',
    }, {
      title: t('cycle'),
      dataIndex: 'cycle',
    }
    , {
      title: t('run_info'),
      dataIndex: 'runInfo',
    },
    {
      title: t('actions'),
      dataIndex: 'actions',
    }
  ];
  console.log(nmConfig.task);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ width: '100%', height: '2rem' }}>
        <Space>
          <Button type='primary' onClick={() => { navigate('/task/add') }}>{t('add')}</Button>
          <Button onClick={() => { forceUpdate() }}>{t('refresh')}</Button>
        </Space>
      </div>
      <div style={{ height: "calc(100% - 3rem)", marginTop: "1rem" }}>
        <Table columns={columns} noDataElement={ <NoData_module />} data={nmConfig.task.map((taskItem) => {
          return {
            ...taskItem,
            state: taskItem.enable ? t('enabled') : t('disabled'),
            cycle: t('task_run_mode_' + taskItem.run.mode),
            runInfo:taskItem.runInfo?.mag,
            actions: <>
              <Button onClick={()=>{delTask(taskItem.name);forceUpdate()}}>{t('delete')}</Button>
            </>
          }
        })} />
      </div>
    </div>
  )
}

export { Task_page }