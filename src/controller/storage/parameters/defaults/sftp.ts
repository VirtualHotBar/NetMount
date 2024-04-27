import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface SFTPParamsStandard {
    host: string;
    user?: string;
    port?: number;
    pass?: string;
    key_pem?: string;
    key_file?: string;
    key_file_pass?: string;
    pubkey_file?: string;
    key_use_agent?: boolean;
    use_insecure_cipher?: boolean;
    disable_hashcheck?: boolean;
    ssh?: string;
}

interface SFTPParamsAdvanced {
    known_hosts_file?: string;
    ask_password?: boolean;
    path_override?: string;
    set_modtime?: boolean;
    shell_type?: string;
    md5sum_command?: string;
    sha1sum_command?: string;
    skip_links?: boolean;
    subsystem?: string;
    server_command?: string;
    use_fstat?: boolean;
    disable_concurrent_reads?: boolean;
    disable_concurrent_writes?: boolean;
    idle_timeout?: string; // 假设 Duration 可以被表示为 string
    chunk_size?: string; // 假设 SizeSuffix 可以被表示为 string
    concurrency?: number;
    set_env?: string; // SpaceSepList 可以被表示为 string
    ciphers?: string; // SpaceSepList 可以被表示为 string
    key_exchange?: string; // SpaceSepList 可以被表示为 string
    macs?: string; // SpaceSepList 可以被表示为 string
    host_key_algorithms?: string; // SpaceSepList 可以被表示为 string
    socks_proxy?: string;
    copy_is_hardlink?: boolean;
    description?: string;
}

const standard: SFTPParamsStandard = {
    host: "",
    user: "",
    port: 22,
    key_use_agent: false,
    use_insecure_cipher: false,
    disable_hashcheck: false
};

const advanced: SFTPParamsAdvanced = {
    known_hosts_file: '',
    ask_password: false,
    path_override: '',
    set_modtime: true,
    shell_type: '',
    md5sum_command: '',
    sha1sum_command: '',
    skip_links: false,
    subsystem: "sftp",
    server_command: '',
    use_fstat: false,
    disable_concurrent_reads: false,
    disable_concurrent_writes: false,
    idle_timeout: "1m0s",
    chunk_size: "32Ki",
    concurrency: 64,
    set_env: '',
    ciphers: '',
    key_exchange: '',
    macs: '',
    host_key_algorithms: '',
    socks_proxy: '',
    copy_is_hardlink: false,
    description: ''
};


const sftpDefaults: DefaultParams = {
    "name": "SFTP",
    "standard": standard,
    "advanced": advanced,
    "required": ['host']
};

export{sftpDefaults}