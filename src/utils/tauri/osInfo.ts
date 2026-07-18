import { setOsInfo } from '../../services/ConfigService'
import { getRuntime } from '../../runtime/port'
import type { OSInfo } from '../../type/config'

async function getOsInfo() {
  // The runtime port returns plain strings (decoupled from @tauri-apps Arch/
  // OsType/Platform enums); at runtime these are produced by os.arch()/type()/
  // platform() so they are valid OSInfo values.
  setOsInfo((await getRuntime().osInfo.info()) as OSInfo)
}

export { getOsInfo }
