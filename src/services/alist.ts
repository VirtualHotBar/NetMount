import { Child, Command } from "@tauri-apps/api/shell";
import { randomString } from "../utils/utils";

interface AlistInfo {
    auth: {
        password: string;
        token: string;
    };
    alistConfig: {//https://alist.nn.ci/zh/config/configuration.html
        force?: boolean;
        scheme?: {
            http_port?: number;
        };
    }
    process: {
        command?: Command,
        child?: Child,
        log?: string
    },
}


let alistInfo: AlistInfo = {
    auth: {
        password: randomString(32),
        token: '',
    },
    alistConfig: {// 修改默认alist的配置
        force:true,
        scheme:{
            http_port:5573//rcloneInfo.endpoint.localhost.port+1
        }
    },
    process: {}
}

export { alistInfo };
export type { AlistInfo };
