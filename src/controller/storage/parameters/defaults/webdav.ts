import { DefaultParams } from "../../../../type/rclone/storage/defaults";
import { WebdavParamsAdvanced, WebdavParamsStandard } from "../../../../type/rclone/storage/parameters/webdav";

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