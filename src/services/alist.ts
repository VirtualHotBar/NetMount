import { Child, Command } from "@tauri-apps/api/shell";
import { randomString } from "../utils/utils";
import { AlistInfo } from "../type/alist/alistInfo";


let alistInfo: AlistInfo = {
    markInRclone:'.netmount-alist.',
    endpoint: {
        url: '',
        isLocal: true,
        auth: {
            //user: 'admin',
            //password: randomString(16) ,//process.env.NODE_ENV === 'development' ? 'admin' : randomString(32),!!!!!密码长度为32时rclone会报错
            token: ''
        }
    },
    alistConfig: {// 修改默认alist的配置
        force: true,
        scheme: {
            http_port: 9751//随机
        }
    },
    version: {
        version: ''
    },
    process: {}
}

export { alistInfo };

