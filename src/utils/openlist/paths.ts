import { openlistDataDir } from "../netmountPaths";

const addParams = (): string[] => {
    const params: string[] = []
    params.push('--data', openlistDataDir())
    return params
}

export { addParams, openlistDataDir }
