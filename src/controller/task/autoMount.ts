import { nmConfig } from "../../services/config";
import { mountStorage } from "../storage/mount/mount";

async function autoMount() {
    nmConfig.mount.lists.forEach(async (item) => {
        item.autoMount && await mountStorage(item)
    })
}

export{autoMount}
  