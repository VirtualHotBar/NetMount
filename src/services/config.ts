import { NMConfig, OSInfo } from "../type/config"

let nmConfig: NMConfig = {
    mount: {
        lists: [],
    },
    task: [],
    api: {
        url: 'https://api.hotpe.top/test/NetMount',
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

const roConfig = {
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
        }
    }
}


export { nmConfig, setNmConfig, osInfo, setOsInfo, roConfig }