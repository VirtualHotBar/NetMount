import * as os from "@tauri-apps/plugin-os";
import { setOsInfo } from "../../services/config";
import { invoke } from "@tauri-apps/api/core";

async function getOsInfo() {
    setOsInfo({
        arch: await os.arch(),
        osType: await os.type(),
        platform: await os.platform(),
        tempDir: await invoke("get_temp_dir"),
        osVersion: await os.version(),
    })
}

export { getOsInfo }