import * as os from "@tauri-apps/plugin-os";
import { OSInfo } from "../../type/config";
import { setOsInfo } from "../../services/config";

async function getOsInfo() {
    setOsInfo({
        arch: await os.arch(),
        osType: await os.type(),
        platform: await os.platform(),
        // TODO: wtf
        tempDir: "/tmp",
        osVersion: await os.version(),
    })
}

export { getOsInfo }