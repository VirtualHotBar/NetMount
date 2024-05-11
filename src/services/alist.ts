import { Child, Command } from "@tauri-apps/api/shell";
import { randomString } from "../utils/utils";
import { AlistInfo } from "../type/alist/alistInfo";


let alistInfo: AlistInfo = {
    markInRclone:'.netmount-alist.',
    endpoint: {
        url: '',
        isLocal: true,
        auth: {
            user: 'admin',
            password: process.env.NODE_ENV === 'development' ? 'admin' : randomString(32),
            token: ''
        }
    },
    alistConfig: {// 修改默认alist的配置
        force: true,
        scheme: {
            http_port: 5573//rcloneInfo.endpoint.localhost.port+1
        }
    },
    version: {
        version: ''
    },
    process: {}
}

export { alistInfo };

