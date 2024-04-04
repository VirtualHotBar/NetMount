import { NMConfig } from "../type/config"

let nmConfig: NMConfig = {
    mount: {
        lists: [],
    },
    task: {

    }
}

const setNmConfig = (config: NMConfig) => {
    nmConfig = config
}

export { nmConfig ,setNmConfig}