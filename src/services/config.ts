import { NMConfig, OSInfo } from "../type/config"

const roConfig = {
    url:{
        website:'https://www.netmount.cn/',
        
    },
    options: {
        task: {
            runMode: {
                defIndex: 0,
                select: ['start', 'time', 'interval', 'disposable']
            },
            taskType: {
                defIndex: 3,
                select: ['copy', 'move', 'delete', 'sync', 'bisync']
            },
            dateMultiplier: {
                defIndex: 0,
                select: [{ name: 'day', value: 1 }, { name: 'week', value: 7 }, { name: 'month', value: 30 }]
            },
            intervalMultiplier: {
                defIndex: 0,
                select: [{ name: 'hour', value: 60 * 60 }, { name: 'minute', value: 60 }, { name: 'second', value: 1 }]
            },
        },
        setting: {
            themeMode: {
                defIndex: 0,
                select: ['auto', 'light', 'dark']
            }
        }
    }
}

let nmConfig: NMConfig = {
    mount: {
        lists: [],
    },
    task: [],
    api: {
        url: 'https://api.hotpe.top/test/NetMount',
    },
    settings: {
        themeMode: roConfig.options.setting.themeMode.select[roConfig.options.setting.themeMode.defIndex]
    }
}

const setNmConfig = (config: NMConfig) => {
    nmConfig = config
}


let osInfo: OSInfo = {
    arch: 'unknown',
    osType: 'unknown',
    platform: 'unknown',
    tempDir: '',
    osVersion: ''
}

const setOsInfo = (osinfo: OSInfo) => {
    osInfo = osinfo
}




export { nmConfig, setNmConfig, osInfo, setOsInfo, roConfig }