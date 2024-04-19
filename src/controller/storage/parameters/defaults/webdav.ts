
import { DefaultParams, ParamsSelectType } from "../../../../type/rclone/storage/defaults";

interface WebdavParamsStandard {
    // 标准选项
    url: string;
    vendor?: ParamsSelectType;
    user?: string;
    pass?: string;
    bearer_token?: string;
}


interface WebdavParamsAdvanced {
    // 高级选项
    bearer_token_command?: string;
    encoding?: string;
    headers?: Array<{ key: string, value: string }>; // 也可以使用 Map<string, string> 类型
    pacer_min_sleep?: string; // 使用 Duration 类型，但此处为了简化表示，我们暂时将其作为字符串
    nextcloud_chunk_size?: string; // 使用 SizeSuffix 类型，此处同样简化为字符串
    owncloud_exclude_shares?: boolean;
    description?: string;
}

const standard: WebdavParamsStandard = {
    url: "",
    vendor: {
        select: "other",
        values: ["other", "fastmail", "nextcloud", "owncloud", "sharepoint", "sharepoint-ntlm", "rclone"]
    },
    user: "",
    pass: "",
}

const advanced: WebdavParamsAdvanced = {
    bearer_token_command: "",
    encoding: "",
    headers: [],
    pacer_min_sleep: "",
    nextcloud_chunk_size: "",
    owncloud_exclude_shares: false,
    description: "",
}

const webdavDefaults: DefaultParams = {
    "name":"Webdav",
    "standard": standard,
    "advanced": advanced,
    "required": ["url"]
}

export { webdavDefaults }