import { nmConfig, osInfo, runtimeEnv } from '../services/ConfigService'
import { formatPath } from './format'

function netmountDataDir(): string {
  return formatPath(runtimeEnv.path.homeDir + '/.netmount/', osInfo.platform === 'windows')
}

function defaultCacheDir(): string {
  return formatPath(runtimeEnv.path.homeDir + '/.cache/netmount', osInfo.platform === 'windows')
}

function rcloneConfigFile(): string {
  return formatPath(netmountDataDir() + '/rclone.conf', osInfo.platform === 'windows')
}

function netmountLogDir(): string {
  // 使用用户配置的日志目录，如果未配置则使用默认值
  if (nmConfig.settings.path.logDir) {
    return formatPath(nmConfig.settings.path.logDir, osInfo.platform === 'windows')
  }
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

/**
 * 获取默认传输（临时）目录
 * 使用用户配置的传输目录，如果未配置则使用缓存目录下的 rclone-temp 子目录
 */
function defaultTransferDir(): string {
  if (nmConfig.settings.path.transferDir) {
    return formatPath(nmConfig.settings.path.transferDir, osInfo.platform === 'windows')
  }
  const cacheBase = nmConfig.settings.path.cacheDir || defaultCacheDir()
  return formatPath(cacheBase + '/rclone-temp/', osInfo.platform === 'windows')
}

export {
  defaultCacheDir,
  defaultTransferDir,
  netmountDataDir,
  netmountLogDir,
  rcloneConfigFile,
  rcloneLogFile,
  openlistDataDir,
  openlistLogFile,
  sidecarLogFile,
}
