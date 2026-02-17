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

// OpenList 存储项接口
interface OpenlistStorageItem {
    id: number;
    mount_path: string;
    driver: string;
    order: number;
    status: 'work' | string;
    addition: string | Record<string, unknown>;
    remark: string;
    modified: string;
    disabled: boolean;
    enable_sign: boolean;
    order_by: string;
    order_direction: string;
    extract_folder: string;
    web_proxy: boolean;
    webdav_policy: string;
    down_proxy_url: string;
}

// OpenList 存储列表响应
interface OpenlistStorageListResponse {
    code: number;
    message: string;
    data: {
        content: OpenlistStorageItem[];
        total: number;
    };
}

// OpenList 存储详情响应
interface OpenlistStorageGetResponse {
    code: number;
    message: string;
    data: OpenlistStorageItem;
}

export { OpenlistInfo, OpenlistStorageItem, OpenlistStorageListResponse, OpenlistStorageGetResponse };