interface FtpParameters {
    // 标准选项
    host: string;
    user?: string;
    port?: number;
    pass?: string;
    tls?: boolean;
    explicit_tls?: boolean;
    
    // 高级选项
    concurrency?: number;
    no_check_certificate?: boolean;
    disable_epsv?: boolean;
    disable_mlsd?: boolean;
    disable_utf8?: boolean;
    writing_mdtm?: boolean;
    force_list_hidden?: boolean;
    idle_timeout?: string; // Duration 类型，此处简化为字符串
    close_timeout?: string; // Duration 类型，此处简化为字符串
    tls_cache_size?: number;
    disable_tls13?: boolean;
    shut_timeout?: string; // Duration 类型，此处简化为字符串
    ask_password?: boolean;
    socks_proxy?: string;
    encoding?: string; // 在 TypeScript 中，可能需要定义一个枚举类型来表示支持的编码格式
    description?: string;
}

export {FtpParameters}