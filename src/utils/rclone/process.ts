import { invoke } from '@tauri-apps/api/core'
import { Child } from '@tauri-apps/plugin-shell'
import { rcloneInfo } from '../../services/rclone'
import { rclone_api_noop, rclone_api_post } from './request'
import { formatPath, getAvailablePorts } from '../index'
import { openlistInfo } from '../../services/openlist'
import { deleteStorage } from '../../services/storage/StorageService'
import { nmConfig, osInfo } from '../../services/ConfigService'
import { logger } from '../../services/LoggerService'
import { LOCALHOST_URLS } from '../../constants'
import { netmountLogDir, rcloneConfigFile, rcloneLogFile } from '../netmountPaths'
import { restartSidecar, startSidecarAndWait, stopSidecarGracefully } from '../sidecarService'
import { parseExtraCliArgs } from '../cliArgs'
import type { NMConfig } from '../../type/config'

/**
 * 构建代理URL
 * 根据代理配置生成 rclone --http-proxy 参数值
 * 支持 HTTP 和 SOCKS5 代理，格式：protocol://[user:pass@]host:port
 */
function buildProxyUrl(proxy: NonNullable<NMConfig['settings']['proxy']>): string | undefined {
  if (proxy.type === 'no_proxy' || !proxy.host || !proxy.port) {
    return undefined
  }

  const protocol = proxy.type === 'socks5' ? 'socks5' : 'http'
  let auth = ''
  if (proxy.username) {
    auth = encodeURIComponent(proxy.username)
    if (proxy.password) {
      auth += ':' + encodeURIComponent(proxy.password)
    }
    auth += '@'
  }

  return `${protocol}://${auth}${proxy.host}:${proxy.port}`
}

async function startRclone() {
  if (rcloneInfo.process.child) {
    await stopRclone()
  }

  //设置缓存目录和临时目录（分离以避免临时文件污染缓存）
  const cacheBase = nmConfig.settings.path.cacheDir
  rcloneInfo.localArgs.path.tempDir = formatPath(
    cacheBase + '/rclone/',
    osInfo.osType === 'windows'
  )
  const rcloneTempDir = formatPath(
    cacheBase + '/rclone-temp/',
    osInfo.osType === 'windows'
  )

  // 确保缓存和临时目录存在
  try {
    await invoke('fs_make_dir', { path: rcloneInfo.localArgs.path.tempDir })
    await invoke('fs_make_dir', { path: rcloneTempDir })
  } catch {
    // ignore - rclone will create it if needed
  }

  //自动分配端口
  rcloneInfo.endpoint.localhost.port = (await getAvailablePorts(2))[1]!

  rcloneInfo.endpoint.url = `${LOCALHOST_URLS.RCLONE}:${rcloneInfo.endpoint.localhost.port.toString()}`

  // 确保日志目录存在（用于"设置-组件-日志"查看）
  const logDir = netmountLogDir()
  const logFile = rcloneLogFile()
  try {
    await invoke('fs_make_dir', { path: logDir })
  } catch {
    // ignore
  }
  rcloneInfo.process.logFile = logFile

  const args: string[] = [
    'rcd',
    `--rc-addr=:${rcloneInfo.endpoint.localhost.port.toString()}`,
    `--rc-user=${nmConfig.framework.rclone.user}`,
    `--rc-pass=${nmConfig.framework.rclone.password}`,
    '--rc-allow-origin=' + window.location.origin || '*',
    `--config=${rcloneConfigFile()}`,
    '--cache-dir=' + rcloneInfo.localArgs.path.tempDir,
    '--temp-dir=' + rcloneTempDir,
    `--log-file=${logFile}`,
    '--log-level=INFO',
  ]

  if (nmConfig.framework.rclone.user === '') {
    args.push('--rc-no-auth')
  }

  // 应用代理配置
  const proxy = nmConfig.settings.proxy
  if (proxy && proxy.type !== 'no_proxy') {
    const proxyUrl = buildProxyUrl(proxy)
    if (proxyUrl) {
      args.push(`--http-proxy=${proxyUrl}`)
      logger.info('Rclone proxy configured', 'Rclone', { type: proxy.type, host: proxy.host })
    }
  }

  args.push(...parseExtraCliArgs(nmConfig.framework.rclone.extraArgs))

  // 使用 Rust 端启动 sidecar，确保由主进程创建
  const pid = await startSidecarAndWait({
    binary: 'binaries/rclone',
    name: 'rclone',
    args,
    readyCheck: rclone_api_noop,
    initialDelayMs: 1000,
  })
  rcloneInfo.process.child = { pid } as Child
  logger.info('rclone spawned from Rust', 'Rclone', { pid })
}

async function stopRclone() {
  await deleteStorage(openlistInfo.markInRclone)
  await stopSidecarGracefully({
    binary: 'binaries/rclone',
    name: 'rclone',
    graceful: async () => {
      await rclone_api_post('/core/quit')
    },
  })
  rcloneInfo.process.child = undefined
}

async function restartRclone() {
  await restartSidecar(stopRclone, startRclone)
}

export { startRclone, stopRclone, restartRclone }
