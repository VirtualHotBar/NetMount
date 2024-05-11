import { Child, Command } from "@tauri-apps/api/shell";

interface AlistInfo {
    markInRclone:string;
    endpoint:{
        url: string,
        isLocal: true,
        auth: {
            user: string;
            password: string;
            token: string;
        };
    };
    alistConfig: {//https://alist.nn.ci/zh/config/configuration.html
        force?: boolean;
        scheme?: {
            http_port?: number;
        };
    };
    version:{
        version: string;
    }
    process: {
        command?: Command,
        child?: Child,
        log?: string
    },
}

export  { AlistInfo };