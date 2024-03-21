import { startUpdateCont } from "./stats/continue"
import { reupStorage } from "./storage/storage"

async function init(setStartStr:Function){
    setStartStr('ddd')
    startUpdateCont()
    await reupStorage()
}

function main() {

}

export {init, main}