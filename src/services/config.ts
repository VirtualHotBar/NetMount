import { invoke } from "@tauri-apps/api"
import { NMConfig, OSInfo } from "../type/config"
import { randomString } from "../utils/utils"

const roConfig = {
    url: {
        website: 'https://www.netmount.cn',
        docs: 'https://api.hotpe.top/API/NetMount/GoLink?id=docs&path=',
        rclone: 'https://github.com/rclone/rclone',
        alist: 'https://github.com/alist-org/alist',
        to: (id: string, path: string = '') => { return 'https://api.hotpe.top/API/NetMount/GoLink?id=' + id + '&path=' + path },
        vhbBlog: 'https://blog.hotpe.top'

    },
    env: {
        path: {
            homeDir: '~'
        }
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
            }, language: {
                defIndex: 0,
                select: [
                    { name: '简体中文', value: 'cn', langCode: 'zh-cn' },
                    { name: 'English', value: 'en', langCode: 'en-us' },
                    /*                     { name: '繁體中文(臺灣)', value: 'cht', langCode: 'zh-tw' },
                                        { name: '繁體中文(香港)', value: 'cht', langCode: 'zh-hk' },
                                        { name: 'Русский язык', value: 'ru', langCode: 'ru-RU' }, */
                ]
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
        url: 'https://api.hotpe.top/API/NetMount',
    },
    settings: {
        themeMode: roConfig.options.setting.themeMode.select[roConfig.options.setting.themeMode.defIndex],
        startHide: false,
    },
    framework: {
        rclone: {
            user: process.env.NODE_ENV != 'development' ? randomString(32) : '',
            password: process.env.NODE_ENV != 'development' ? randomString(128) : '',
        },
        alist: {
            user: 'admin',
            password: randomString(16),//process.env.NODE_ENV === 'development' ? 'admin' : randomString(32),!!!!!密码长度为32时rclone会报错
        }
    }
}

const setNmConfig = (config: NMConfig) => {
    nmConfig = config
}

const readNmConfig = async () => {
    await invoke('read_config_file').then(configData => {
        setNmConfig({ ...nmConfig, ...(configData as NMConfig) })
    }).catch(err => {
        console.log(err);
    })
}
const saveNmConfig = async () => {
    await invoke('write_config_file', {
        configData: nmConfig
    });
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




export { nmConfig, setNmConfig, osInfo, setOsInfo, roConfig, readNmConfig, saveNmConfig }