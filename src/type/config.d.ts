import { Arch, OsType, Platform } from "@tauri-apps/plugin-os"
import { ParametersType } from "./defaults"
import { Notice } from "./controller/update"

interface NMConfig {
    mount: {
        lists: MountListItem[]
    },
    task: TaskListItem[],
    api: {
        url: string
    },
    settings: {
        themeMode: 'dark' | 'light' | 'auto' | string,
        startHide: boolean,
        closeToTray: boolean,
        language?: string,
        path: {
            cacheDir?:string
        }
    },
    notice?: Notice,
    framework: {
        rclone: {
            user: string,
            password: string,
        },
        openlist: {
            user: string,
            password: string,
        }
    }
}


interface MountListItem {
    storageName: string,
    mountPath: string,
    parameters:  { vfsOpt: VfsOptions, mountOpt: MountOptions },//挂载配置
    autoMount: boolean,//软件启动自动挂载
}

interface TaskListItem {
    name: string,
    taskType: 'copy' | 'move' | 'delete' | 'sync' | 'bisync' | string,
    source: {
        storageName: string,
        path: string,
    },
    target: {
        storageName: string,
        path: string,
    },
    parameters?: ParametersType,
    enable: boolean
    run: {
        runId?: number,//任务id,setTimeout或setInterval的返回值
        mode: 'time' | 'interval' | 'start' | 'disposable' | string,//start：软件启动时执行，time:定时执行，interval:间隔执行 , disposable:一次性执行(执行后删除任务)
        time: {
            intervalDays: number,//间隔天数
            h: number,//小时
            m: number,//分钟
            s: number,//秒
        },
        interval?: number,//周期执行，单位ms
    },
    runInfo: {
        error?: boolean
        msg?: string,
    }
}

interface OSInfo {
    arch: Arch | 'unknown',
    osType: OsType | 'unknown',
    platform: Platform | 'unknown',
    tempDir: string,
    osVersion: string
}

export { NMConfig, MountListItem, TaskListItem, OSInfo }
