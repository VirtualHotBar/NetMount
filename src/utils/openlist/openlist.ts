import { getRuntime } from '../../runtime/port'
import { openlistDataDir } from './paths'
import { openlistInfo } from '../../services/openlist'
import { createStorage } from '../../services/storage/StorageCreationService'
import { nmConfig } from '../../services/ConfigService'
import { rclone_api_post } from '../rclone/request'
import { mergeObjects } from '../index'
import { openlist_api_get, openlist_api_post } from './request'
import { logger } from '../../services/LoggerService'
import { getOpenlistToken, setOpenlistPass } from './openlistAuth'

type OpenlistConfig = typeof openlistInfo.openlistConfig
type OpenlistConfigPartial = Partial<OpenlistConfig>

function joinDir(baseDir: string, child: string): string {
  if (!baseDir) return child
  const normalizedBase = baseDir.endsWith('/') ? baseDir : `${baseDir}/`
  const normalizedChild = child.startsWith('/') ? child.slice(1) : child
  return `${normalizedBase}${normalizedChild}`
}

function isAbsolutePath(path: string): boolean {
  if (!path) return false
  // unix abs: /foo, windows drive: C:/foo or C:\foo, UNC: \\server\share or //server/share
  return (
    path.startsWith('/') ||
    path.startsWith('\\\\') ||
    path.startsWith('//') ||
    (path.length > 1 && path[1] === ':')
  )
}

type OpenlistUser = {
  id: number
  username: string
  base_path?: string
  role?: number
  permission?: number
  disabled?: boolean
  sso_id?: string
}

const WEB_DAV_READ = 256
const WEB_DAV_MANAGE = 512

async function ensureOpenlistWebdavPermissions(username: string): Promise<void> {
  try {
    const res = await openlist_api_get('/api/admin/user/list')
    const resData = res.data as { content?: OpenlistUser[] } | undefined
    const list = resData?.content || []
    const user = list.find(u => u?.username === username)
    if (!user) {
      logger.warn('ensureOpenlistWebdavPermissions: user not found', 'OpenlistUtils', { username })
      return
    }

    const current = typeof user.permission === 'number' ? user.permission : 0
    const required = WEB_DAV_READ | WEB_DAV_MANAGE
    if ((current & required) === required) {
      return
    }

    const nextPermission = current | required
    const updateBody: OpenlistUser & { permission: number } = {
      id: user.id,
      username: user.username,
      base_path: user.base_path ?? '/',
      role: user.role ?? 0,
      permission: nextPermission,
      disabled: user.disabled ?? false,
      sso_id: user.sso_id ?? '',
    }

    const updateRes = await openlist_api_post('/api/admin/user/update', updateBody)
    if (updateRes.code !== 200) {
      logger.warn('ensureOpenlistWebdavPermissions: update failed', 'OpenlistUtils', { updateRes })
      return
    }

    logger.info('OpenList WebDAV permissions enabled', 'OpenlistUtils', { username, permission: nextPermission })
  } catch (e) {
    logger.warn('ensureOpenlistWebdavPermissions: failed', 'OpenlistUtils', { error: e })
  }
}

async function modifyOpenlistConfig(
  rewriteData: OpenlistConfigPartial = openlistInfo.openlistConfig
) {
  const dataDir = openlistDataDir()
  const configPath = joinDir(dataDir, 'config.json')

  // 确保数据目录及子目录存在
  try {
    await getRuntime().fs.makeDir(dataDir)
    await getRuntime().fs.makeDir(joinDir(dataDir, 'data'))
    await getRuntime().fs.makeDir(joinDir(dataDir, 'log'))
    await getRuntime().fs.makeDir(joinDir(dataDir, 'bleve'))
  } catch (e) {
    // 目录可能已存在
  }

  let oldOpenlistConfig: Record<string, unknown> = {}
  try {
    oldOpenlistConfig = (await getRuntime().fs.readJsonFile(configPath)) as Record<
      string,
      unknown
    >
  } catch (e) {
    logger.info('OpenList config file not found or corrupted, using empty config', 'OpenlistUtils', { error: e })
  }

  // 合并配置 - 使用类型安全的合并方式
  const newOpenlistConfig: OpenlistConfig = mergeObjects(
    oldOpenlistConfig as OpenlistConfig,
    rewriteData
  )

  // 将绝对路径转换为相对路径（基于数据目录）
  const toRelativePath = (absolutePath: string) => {
    if (!absolutePath) return absolutePath
    // 如果已经是相对路径，直接返回
    if (!isAbsolutePath(absolutePath)) {
      return absolutePath
    }
    // 将路径标准化为使用正斜杠
    const normalizedPath = absolutePath.replace(/\\/g, '/')
    let normalizedDataDir = dataDir.replace(/\\/g, '/')
    // 确保数据目录以斜杠结尾，避免错误匹配
    if (!normalizedDataDir.endsWith('/')) {
      normalizedDataDir += '/'
    }
    // 如果路径以数据目录开头，转换为相对路径
    if (normalizedPath.startsWith(normalizedDataDir)) {
      const relativePath = normalizedPath.substring(normalizedDataDir.length)
      return relativePath.startsWith('/') ? relativePath.substring(1) : relativePath
    }
    return absolutePath
  }

  // 转换数据库路径为相对路径
  if (newOpenlistConfig.database?.db_file) {
    newOpenlistConfig.database.db_file = toRelativePath(newOpenlistConfig.database.db_file)
  }

  // 转换日志路径为相对路径
  if (newOpenlistConfig.log?.name) {
    newOpenlistConfig.log.name = toRelativePath(newOpenlistConfig.log.name)
  }

  // 转换 bleve 目录路径为相对路径
  if (newOpenlistConfig.bleve_dir) {
    newOpenlistConfig.bleve_dir = toRelativePath(newOpenlistConfig.bleve_dir)
  }

  // 转换 temp_dir 为相对路径
  if (newOpenlistConfig.temp_dir) {
    newOpenlistConfig.temp_dir = toRelativePath(newOpenlistConfig.temp_dir)
  }

  await getRuntime().fs.writeJsonFile(configPath, newOpenlistConfig)
}

async function addOpenlistInRclone() {
  const webdavUrl = openlistInfo.endpoint.url + '/dav'
  const username = nmConfig.framework.openlist.user
  const password = nmConfig.framework.openlist.password
  const storageName = openlistInfo.markInRclone

  logger.info('OpenList WebDAV Configuration', 'OpenlistUtils', {
    storageName,
    webdavUrl,
    username
  })
  logger.info('Note: WebDAV password is the same as Web UI login password', 'OpenlistUtils')

  // 可选：探测 WebDAV 端点以提供诊断信息
  try {
    const probeRes = await fetch(webdavUrl, {
      method: 'OPTIONS',
      headers: {
        Authorization: 'Basic ' + btoa(username + ':' + password),
      },
    })
    logger.info('WebDAV probe HTTP status', 'OpenlistUtils', { status: probeRes.status })
    if (probeRes.status === 401) {
      logger.warn('WebDAV returned 401 - Please check if user has WebDAV Read/Management permissions enabled', 'OpenlistUtils')
    } else if (probeRes.status === 403) {
      logger.warn('WebDAV returned 403 - Please check if user has necessary file permissions', 'OpenlistUtils')
    } else if (probeRes.ok || probeRes.status === 207) {
      logger.info('WebDAV endpoint appears to be accessible', 'OpenlistUtils')
    }
  } catch (probeError) {
    logger.warn('WebDAV probe failed (this is normal if server is still starting)', 'OpenlistUtils', { error: probeError })
  }
  logger.info('WebDAV configuration complete', 'OpenlistUtils')

  // 先删除可能存在的旧配置（避免端口不一致问题）
  logger.info('Deleting old rclone storage config if exists...', 'OpenlistUtils')
  try {
    await rclone_api_post('/config/delete', { name: storageName }, true)
    logger.info('Old storage config deleted (or did not exist)', 'OpenlistUtils')
  } catch (e) {
    // 配置可能不存在，忽略错误
    logger.info('No old config to delete or delete failed', 'OpenlistUtils', { error: e })
  }

  // 短暂延迟确保删除生效
  await new Promise(resolve => setTimeout(resolve, 500))

  logger.info('Creating new rclone storage with updated WebDAV URL...', 'OpenlistUtils')
  // 使用 opt.obscure = true 告诉 rclone 密码是明文需要混淆
  await createStorage(
    storageName,
    'webdav',
    {
      url: webdavUrl,
      vendor: 'other',
      user: username,
      pass: password,
    },
    {},
    { obscure: true }
  )
}

export {
  getOpenlistToken,
  modifyOpenlistConfig,
  setOpenlistPass,
  addOpenlistInRclone,
  ensureOpenlistWebdavPermissions,
}
