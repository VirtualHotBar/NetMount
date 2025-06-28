import { Child, Command } from "@tauri-apps/plugin-shell";
import { formatPath, randomString } from "../utils/utils";
import { AlistInfo } from "../type/openlist/openlistInfo";
import { nmConfig, osInfo } from "./config";


let openlistInfo: AlistInfo = {
    markInRclone: '.netmount-openlist.',
    endpoint: {
        url: '',
        isLocal: true,
        auth: {
            //user: 'admin',
            //password: randomString(16) ,//process.env.NODE_ENV === 'development' ? 'admin' : randomString(32),!!!!!密码长度为32时rclone会报错
            token: ''
        }
    },
    openlistConfig: {// 修改默认openlist的配置
        force: true,
        scheme: {
            http_port: 9751//随机
        },
        temp_dir: 'data\\temp'
    },
    version: {
        version: ''
    },
    process: {}
}

export { openlistInfo };

