import { osInfo, roConfig } from "../../services/config";
import { formatPath } from "../utils";

const openlistDataDir = () => {
    return formatPath(roConfig.env.path.homeDir + '/.netmount/openlist/', osInfo.osType === "windows")
}

const addParams = (): string[] => {
    const params: string[] = []
    params.push('--data', openlistDataDir())
    return params
}

export { addParams, openlistDataDir }
