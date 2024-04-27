import { DefaultParams } from "../../../../type/rclone/storage/defaults"
import { FtpParamsAdvanced, FtpParamsStandard } from "../../../../type/rclone/storage/parameters/ftp"

const standard: FtpParamsStandard = {
    host: "",
    user: "",
    port: 21,
    pass: "",
    tls: false,
    explicit_tls: false,
}

const advanced: FtpParamsAdvanced = {
    concurrency: 4,
    no_check_certificate: false,
    disable_epsv: false,
    disable_mlsd: false,
    disable_utf8: false,
    writing_mdtm: false,
    force_list_hidden: false,
    idle_timeout: "1m",
    close_timeout: "1m",
    tls_cache_size: 16,
    disable_tls13: false,
    shut_timeout: "1m",
    ask_password: false,
    socks_proxy: "",
    encoding: "Slash,Del,Ctl,RightSpace,Dot", // rclone的编码设置根据主要的FTP服务器进行选择，如ProFTPd, PureFTPd, VsFTPd等
    description: "",
}

const ftpDefaults: DefaultParams = {
    "name":"New_Storage",
    "standard": standard,
    "advanced": advanced,
    "required": ['host','port']
}

  
  export {ftpDefaults}