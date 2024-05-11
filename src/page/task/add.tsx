import { Button, Divider, Form, Grid, Input, InputNumber, Notification, Select, Space, Tooltip } from '@arco-design/web-react';
import React, { useReducer, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { nmConfig, roConfig, saveNmConfig } from '../../services/config';
import { TaskListItem } from '../../type/config';
import { rcloneInfo } from '../../services/rclone';
import { IconQuestionCircle } from '@arco-design/web-react/icon';
import { filterHideStorage, formatPathRclone } from '../../controller/storage/storage';
import { useNavigate } from 'react-router-dom';
import { saveTask } from '../../controller/task/task';
import { formatPath } from '../../utils/utils';
const Row = Grid.Row;
const Col = Grid.Col;


// 定义状态和 action 类型
type TaskInfoState = TaskListItem;

type Action =
    | { type: 'setName'; payload: string }
    | { type: 'setRunTypeMode'; payload: string }
    | { type: 'setTaskType'; payload: string }
    | { type: 'setSourceStorageName'; payload: string }
    | { type: 'setSourcePath'; payload: string }
    | { type: 'setTargetStorageName'; payload: string }
    | { type: 'setTargetPath'; payload: string }
    | { type: 'setIntervalDays'; payload: number }
    | { type: 'setRunTime'; payload: { h: number, m: number, s: number } };

// 定义 reducer 函数
const reducer = (state: TaskInfoState, action: Action): TaskInfoState => {
    switch (action.type) {
        case 'setName':
            return { ...state, name: action.payload };
        case 'setRunTypeMode':
            return { ...state, run: { ...state.run, mode: action.payload } };
        case 'setTaskType':
            return { ...state, taskType: action.payload };
        case 'setSourceStorageName':
            return { ...state, source: { ...state.source, storageName: action.payload } };
        case 'setSourcePath':
            return { ...state, source: { ...state.source, path: formatPath(action.payload) } };
        case 'setTargetStorageName':
            return { ...state, target: { ...state.target, storageName: action.payload } };
        case 'setTargetPath':
            return { ...state, target: { ...state.target, path: formatPath(action.payload) } };
        case 'setIntervalDays':
            return { ...state, run: { ...state.run, time: { ...state.run.time, intervalDays: action.payload } } };
        case 'setRunTime':
            return { ...state, run: { ...state.run, time: { ...state.run.time, ...action.payload } } };
        default:
            throw new Error('Invalid action');
    }
};

function AddTask_page() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const storageList=filterHideStorage(rcloneInfo.storageList)
    const [taskInfo, dispatch] = useReducer(reducer, {
        name: 'task_' + (nmConfig.task ? nmConfig.task.length + 1 : 1),
        taskType: roConfig.options.task.taskType.select[roConfig.options.task.taskType.defIndex],
        source: {
            storageName:
                storageList && storageList.length > 0
                    ? storageList[0].name
                    : '',
            path: '/',
        },
        target: {
            storageName:
                storageList && storageList.length > 0
                    ? (storageList.length > 1
                        ? storageList[1].name
                        : storageList[0].name)
                    : '',
            path: '/',
        },
        run: {
            mode: roConfig.options.task.runMode.select[roConfig.options.task.runMode.defIndex], time: {
                intervalDays: 1,
                h: 10,
                m: 30,
                s: 0,
            }
        },
        runInfo: {

        },
        enable: true,
    });

    const [timeMultiplier, setTimeMultiplier] = useState({
        ...roConfig.options.task.dateMultiplier.select[roConfig.options.task.dateMultiplier.defIndex],
        multiplicand: 1
    })

    useEffect(() => {
        if (taskInfo.run.mode === 'time') {
            setTimeMultiplier({ ...roConfig.options.task.dateMultiplier.select[roConfig.options.task.dateMultiplier.defIndex], multiplicand: 1 })
        } else if (taskInfo.run.mode === 'interval') {
            setTimeMultiplier({ ...roConfig.options.task.intervalMultiplier.select[roConfig.options.task.intervalMultiplier.defIndex], multiplicand: 1 })
        }
    }, [taskInfo.run.mode])


    return (
        <div style={{ width: '100%', height: '100%' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', marginLeft: '1.8rem' }}>{t('add_task')}</h2>
            <Form style={{ paddingRight: '10%' }}>
                <Form.Item label={t('task_name')}>
                    <Input
                        value={taskInfo.name}
                        onChange={(value) => dispatch({ type: 'setName', payload: value })}
                        placeholder={t('please_input')}
                    />
                </Form.Item>
                <Form.Item label={t('task_run_mode')}>
                    <Select
                        onChange={(value) => dispatch({ type: 'setRunTypeMode', payload: value })}
                        value={taskInfo.run.mode}
                    >
                        {roConfig.options.task.runMode.select.map((item) => (
                            <Select.Option value={item}>{t(`task_run_mode_${item}_opt`)}</Select.Option>
                        ))}
                    </Select>
                </Form.Item>
                {taskInfo.run.mode != 'start' && taskInfo.run.mode !== 'disposable' &&
                    <>
                        <Form.Item label={t('interval')}>
                            <Row>
                                <Col flex={'6rem'}>
                                    <Select value={timeMultiplier.value} onChange={(value) => {
                                        setTimeMultiplier({ ...(taskInfo.run.mode === 'time' ? roConfig.options.task.dateMultiplier.select.find(item => item.value === value)! : roConfig.options.task.intervalMultiplier.select.find(item => item.value === value)!), multiplicand: timeMultiplier.multiplicand });
                                    }}>
                                        {(taskInfo.run.mode === 'time' ? roConfig.options.task.dateMultiplier.select : roConfig.options.task.intervalMultiplier.select).map((item) => (
                                            <Select.Option value={item.value}>{t(item.name)}(*{item.value})</Select.Option>
                                        ))}
                                    </Select>
                                </Col>
                                <Col flex={'auto'}>
                                    <InputNumber mode='button' min={1} max={10000} value={timeMultiplier.multiplicand} precision={0}
                                        onChange={
                                            (value) => {
                                                setTimeMultiplier({ ...timeMultiplier, multiplicand: value });
                                            }
                                        } />
                                </Col>
                            </Row>
                        </Form.Item>

                        {
                            taskInfo.run.mode === 'time' && <>
                                <Form.Item label={t('time')}>
                                    <Row gutter={10}>
                                        <Col flex={'1'}>
                                            <InputNumber
                                                min={0} max={23} precision={0}
                                                value={taskInfo.run.time.h}
                                                suffix={t('hour')}
                                                onChange={(value) => dispatch({ type: 'setRunTime', payload: { ...taskInfo.run.time, h: value } })}
                                            />
                                        </Col>
                                        <Col flex={'1'}>
                                            <InputNumber
                                                min={0} max={59} precision={0}
                                                value={taskInfo.run.time.m}
                                                suffix={t('minute')}
                                                onChange={(value) => dispatch({ type: 'setRunTime', payload: { ...taskInfo.run.time, m: value } })}
                                            />
                                        </Col>
                                        <Col flex={'1'}>
                                            <InputNumber
                                                min={0} max={59} precision={0}
                                                value={taskInfo.run.time.s}
                                                suffix={t('second')}
                                                onChange={(value) => dispatch({ type: 'setRunTime', payload: { ...taskInfo.run.time, s: value } })}
                                            />
                                        </Col>
                                    </Row>
                                </Form.Item>
                            </>
                        }
                    </>
                }

                <Form.Item label={t('task_type')}>
                    <Select
                        onChange={(value) => dispatch({ type: 'setTaskType', payload: value })}
                        value={taskInfo.taskType}
                    >
                        {roConfig.options.task.taskType.select.map((item) => (
                            <Select.Option value={item}>{t(`${item}`)}</Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item label={t('source_path')}>
                    <Row>
                        <Col flex={'7rem'}>
                            <Select
                                value={taskInfo.source.storageName}
                                placeholder={t('please_select')}
                                onChange={(value) => dispatch({ type: 'setSourceStorageName', payload: value })}
                            >
                                {storageList.map((item) => (
                                    <Select.Option key={item.name} value={item.name}>
                                        {item.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col flex={'auto'}>
                            <Input
                                value={taskInfo.source.path}
                                onChange={(value) => dispatch({ type: 'setSourcePath', payload: value })}
                                disabled={!taskInfo.source.storageName}
                            />
                        </Col>
                        <Col flex={'2rem'}>
                            <Tooltip content={t('explain_for_task_path_format')}>
                                <Button icon={<IconQuestionCircle />} />
                            </Tooltip>
                        </Col>
                    </Row>
                </Form.Item>

                {taskInfo.taskType !== 'delete' && (
                    <Form.Item label={t('target_path')}>
                        <Row>
                            <Col flex={'7rem'}>
                                <Select
                                    value={taskInfo.target.storageName}
                                    placeholder={t('please_select')}
                                    onChange={(value) => dispatch({ type: 'setTargetStorageName', payload: value })}
                                >
                                    {storageList.map((item) => (
                                        <Select.Option key={item.name} value={item.name}>
                                            {item.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col flex={'auto'}>
                                <Input
                                    value={taskInfo.target.path}
                                    onChange={(value) => dispatch({ type: 'setTargetPath', payload: value })}
                                    disabled={!taskInfo.target.storageName}
                                />
                            </Col>
                            <Col flex={'2rem'}>
                                <Tooltip content={t('explain_for_task_path_format')}>
                                    <Button icon={<IconQuestionCircle />} />
                                </Tooltip>
                            </Col>
                        </Row>
                    </Form.Item>
                )}
            </Form>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <Space>
                    <Button onClick={() => {
                        navigate('/task/')
                    }}>{t('step_back')}</Button>
                    <Button type='primary' onClick={async () => {
                        if (taskInfo.run.mode === 'time') {
                            taskInfo.run.time.intervalDays = timeMultiplier.multiplicand * timeMultiplier.value;
                        } else if (taskInfo.run.mode === 'interval') {
                            taskInfo.run.interval = timeMultiplier.multiplicand * timeMultiplier.value;
                        }
                        if (nmConfig.task && nmConfig.task.forEach(item => item.name == taskInfo.name)! || !taskInfo.name) {
                            Notification.error({
                                title: t('error'),
                                content: t('the_task_name_is_illegal'),
                            })
                        } else if (!taskInfo.source.storageName || !taskInfo.source.path || (taskInfo.taskType !== 'delete' && (!taskInfo.target.storageName || !taskInfo.target.path))) {
                            Notification.error({
                                title: t('error'),
                                content: t('the_path_is_illegal'),
                            })
                        } else if (taskInfo.taskType !== 'delete' && taskInfo.source.path === taskInfo.target.path && taskInfo.source.storageName === taskInfo.target.storageName) {
                            Notification.error({
                                title: t('error'),
                                content: t('same_source_and_target'),
                            })
                        } else {
                            if (saveTask(taskInfo)) {

                                Notification.success({
                                    title: t('success'),
                                    content: t('task_added_successfully'),
                                })
                                navigate('/task/')
                            }
                        }
                    }}>{t('add')}</Button>
                </Space>
            </div>
        </div>
    );
}



export { AddTask_page };