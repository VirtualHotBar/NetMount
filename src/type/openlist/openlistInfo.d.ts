import { Child, Command } from "@tauri-apps/plugin-shell";

interface OpenlistInfo {
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
        site_url?: string;
        cdn?: string;
        jwt_secret?: string;
        token_expires_in?: number;
        database?: {
            type?: string;
            host?: string;
            port?: number;
            user?: string;
            password?: string;
            name?: string;
            db_file?: string;
            table_prefix?: string;
            ssl_mode?: string;
        };
        scheme?: {
            http_port?: number;
            https_port?: number;
            cert_file?: string;
            key_file?: string;
        };
        temp_dir?: string;
        bleve_dir?: string;
        log?: {
            enable?: boolean;
            name?: string;
            max_size?: number;
            max_backups?: number;
            max_age?: number;
            compress?: boolean;
        };
        tasks?: {
            download?: {
                workers?: number;
                max_retry?: number;
                expire_seconds?: number;
            };
            transfer?: {
                workers?: number;
                max_retry?: number;
                expire_seconds?: number;
            };
            upload?: {
                workers?: number;
                max_retry?: number;
                expire_seconds?: number;
            };
            copy?: {
                workers?: number;
                max_retry?: number;
                expire_seconds?: number;
            };
        };
        cors?: {
            allow_origins?: string[];
            allow_methods?: string[];
            allow_headers?: string[];
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

export  { OpenlistInfo };