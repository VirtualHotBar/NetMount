import { os } from "@tauri-apps/api";
import { OSInfo } from "../../type/config";
import { setOsInfo } from "../../services/config";

async function getOsInfo() {
    setOsInfo({
        arch: await os.arch(),
        osType: await os.type(),
        platform: await os.platform(),
        tempDir: await os.tempdir(),
        osVersion: await os.version(),
    })
}

export { getOsInfo }