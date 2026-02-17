import { osInfo, roConfig } from '../services/config'
import { formatPath } from './utils'

function netmountDataDir(): string {
  return formatPath(roConfig.env.path.homeDir + '/.netmount/', osInfo.osType === 'windows')
}

function netmountLogDir(): string {
  return formatPath(netmountDataDir() + '/log/', osInfo.osType === 'windows')
}

function rcloneLogFile(): string {
  return formatPath(netmountLogDir() + '/rclone.log', osInfo.osType === 'windows')
}

function openlistLogFile(): string {
  return formatPath(netmountDataDir() + '/openlist/log/log.log', osInfo.osType === 'windows')
}

function sidecarLogFile(name: string): string {
  const safe = (name || 'sidecar').replace(/[^\w.-]+/g, '_')
  return formatPath(netmountLogDir() + `/sidecar-${safe}.log`, osInfo.osType === 'windows')
}

export { netmountDataDir, netmountLogDir, rcloneLogFile, openlistLogFile, sidecarLogFile }
