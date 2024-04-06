import { ParametersType } from "./rclone/storage/defaults"

interface NMConfig {
    mount: {
        lists: MountListItem[]
    },
    task: TaskListItem
}

interface MountListItem {
    storageName: string,
    mountPath: string,
    parameters: ParametersType,//挂载配置
    autoMount: boolean,//软件启动自动挂载
}

interface TaskListItem {
    [key: string]: {
        taskType: 'copy' | 'move'| 'delete'| 'sync',
        source: string,
        target?: string,
        parameters?: ParametersType,
        autoRun: {
            enable: boolean,
            type: 'time' | 'interval'|'start',//start：软件启动时执行，time:定时执行，interval:周期执行
            time?: {
                intervalDay: number,//间隔天数
                h: number,//小时
                m: number,//分钟
                s: number,//秒
            },
            interval?: number,
        },
        exeId?:number,//任务id,setTimeout或setInterval的返回值
    }
}
export { NMConfig, MountListItem,TaskListItem}