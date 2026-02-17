import { osInfo, roConfig } from '../services/config'
import { formatPath } from './utils'

function netmountDataDir(): string {
  return formatPath(roConfig.env.path.homeDir + '/.netmount/', osInfo.platform === 'windows')
}

function defaultCacheDir(): string {
  return formatPath(roConfig.env.path.homeDir + '/.cache/netmount', osInfo.platform === 'windows')
}

function rcloneConfigFile(): string {
  return formatPath(netmountDataDir() + '/rclone.conf', osInfo.platform === 'windows')
}

function netmountLogDir(): string {
  return formatPath(netmountDataDir() + '/log/', osInfo.platform === 'windows')
}

function rcloneLogFile(): string {
  return formatPath(netmountLogDir() + '/rclone.log', osInfo.platform === 'windows')
}

function openlistLogFile(): string {
  return formatPath(openlistDataDir() + '/log/log.log', osInfo.platform === 'windows')
}

function openlistDataDir(): string {
  return formatPath(netmountDataDir() + '/openlist/', osInfo.platform === 'windows')
}

function sidecarLogFile(name: string): string {
  const safe = (name || 'sidecar').replace(/[^\w.-]+/g, '_')
  return formatPath(netmountLogDir() + `/sidecar-${safe}.log`, osInfo.platform === 'windows')
}

export { defaultCacheDir, netmountDataDir, netmountLogDir, rcloneConfigFile, rcloneLogFile, openlistDataDir, openlistLogFile, sidecarLogFile }
