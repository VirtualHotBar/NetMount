import { Child, Command } from "@tauri-apps/plugin-shell";

interface AlistInfo {
    markInRclone:string;
    endpoint:{
        url: string,
        isLocal: true,
        auth: {
            //user: string;
            //password: string;
            token: string;
        };
    };
    openlistConfig: {//https://docs.openlist.team/zh/config/configuration.html
        force?: boolean;
        scheme?: {
            http_port?: number;
        };
        temp_dir?: string;
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