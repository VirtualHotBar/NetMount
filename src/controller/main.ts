import { startUpdateCont } from "./stats/continue"
import { reupMount } from "./storage/mount/mount"
import { reupStorage } from "./storage/storage"

async function init(setStartStr:Function){
    setStartStr('ddd')
    startUpdateCont()
    await reupStorage()
    await reupMount()
}

function main() {

}

export {init, main}