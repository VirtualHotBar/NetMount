import { getRuntime } from '../../runtime/port'
import { logger } from '../../services/LoggerService'

/**
 * 下载文件
 * @param url - 文件 URL
 * @param path - 保存路径
 * @returns 文件是否成功下载
 */
export async function downloadFile(url: string, path: string): Promise<boolean> {
  await getRuntime().fs.downloadFile(url, path)
  return await getRuntime().fs.exists(path)
}

/**
 * 获取 WinFsp 安装状态
 * @returns WinFsp 是否已安装
 */
export async function getWinFspInstallState(): Promise<boolean> {
  return await getRuntime().system.getWinFspInstallState()
}

/**
 * 安装 WinFsp
 * @returns 安装是否成功
 */
export async function installWinFsp(): Promise<boolean> {
  try {
    await getRuntime().spawn.runCmd('msiexec', ['/i', 'binaries\\winfsp.msi', '/passive'])
    return true
  } catch {
    return false
  }
}

/**
 * 打开 WinFsp 安装程序
 * @returns 是否成功打开
 */
export async function openWinFspInstaller(): Promise<boolean> {
  const installerPath = 'binaries\\winfsp.msi'
  try {
    await getRuntime().spawn.openExternal(installerPath)
    return true
  } catch {
    try {
      await getRuntime().spawn.runCmd('explorer', [installerPath])
      return true
    } catch {
      return false
    }
  }
}

/**
 * 在浏览器中打开 URL
 * @param url - 要打开的 URL
 */
export async function openUrlInBrowser(url: string): Promise<void> {
  await getRuntime().spawn.openExternal(url)
}

/**
 * 在资源管理器中显示路径
 * @param path - 文件路径
 * @param isDir - 是否为目录
 * @returns 是否成功打开
 */
export async function showPathInExplorer(path: string, isDir?: boolean): Promise<boolean> {
  path = path.replace(/\//g, '\\')

  logger.debug(`Opening path in explorer: ${path}`, 'FileUtils')

  if (isDir === undefined) {
    isDir = path.endsWith('\\')
  }

  try {
    return await getRuntime().spawn.showPathInExplorer(path, isDir)
  } catch {
    return false
  }
}

// ============================================
// 路径处理工具函数
// ============================================

/**
 * 获取父目录路径
 * @param inputPath - 输入路径
 * @returns 父目录路径，如果是根目录则返回 '/'
 * 
 * @example
 * getParentPath('/folder/subfolder/file.txt') // '/folder/subfolder'
 * getParentPath('/folder/subfolder/') // '/folder'
 * getParentPath('/file.txt') // '/'
 * getParentPath('folder/subfolder') // 'folder'
 */
export function getParentPath(inputPath: string): string {
  // 标准化路径分隔符并移除末尾斜杠
  const sanitized = inputPath.replace(/\\/g, '/').replace(/\/$/, '')
  
  // 分割路径并过滤空部分
  const parts = sanitized.split('/').filter(p => p)
  
  // 移除最后一部分（文件或目录名）
  parts.pop()
  
  // 如果剩余部分为空，返回根目录
  if (parts.length === 0) {
    return '/'
  }
  
  // 重新组合路径
  return '/' + parts.join('/')
}

/**
 * 获取文件名或目录名
 * @param inputPath - 输入路径
 * @param includeExtension - 是否包含扩展名（默认true）
 * @returns 文件名或目录名
 * 
 * @example
 * getFileName('/folder/file.txt') // 'file.txt'
 * getFileName('/folder/file.txt', false) // 'file'
 * getFileName('/folder/subfolder/') // 'subfolder'
 */
export function getFileName(inputPath: string, includeExtension: boolean = true): string {
  // 标准化路径并移除末尾斜杠
  const sanitized = inputPath.replace(/\\/g, '/').replace(/\/$/, '')
  
  // 获取最后一部分
  const name = sanitized.split('/').pop() || ''
  
  if (!includeExtension) {
    const lastDotIndex = name.lastIndexOf('.')
    if (lastDotIndex > 0) { // 确保点不在开头（隐藏文件）
      return name.substring(0, lastDotIndex)
    }
  }
  
  return name
}

/**
 * 获取文件扩展名
 * @param inputPath - 输入路径
 * @returns 扩展名（包含点），如果没有则返回空字符串
 * 
 * @example
 * getFileExtension('file.txt') // '.txt'
 * getFileExtension('file.tar.gz') // '.gz'
 * getFileExtension('file') // ''
 */
export function getFileExtension(inputPath: string): string {
  const fileName = getFileName(inputPath)
  const lastDotIndex = fileName.lastIndexOf('.')
  
  if (lastDotIndex > 0) {
    return fileName.substring(lastDotIndex)
  }
  
  return ''
}

/**
 * 连接路径片段
 * @param paths - 路径片段
 * @returns 连接后的路径
 * 
 * @example
 * joinPath('folder', 'subfolder', 'file.txt') // 'folder/subfolder/file.txt'
 * joinPath('/folder/', '/subfolder/') // '/folder/subfolder'
 */
export function joinPath(...paths: string[]): string {
  const normalizedPaths = paths.map(path => {
    // 标准化分隔符并移除开头/末尾的斜杠
    return path.replace(/\\/g, '/').replace(/^\//, '').replace(/\/$/, '')
  }).filter(p => p) // 过滤空字符串
  
  if (normalizedPaths.length === 0) {
    return '/'
  }
  
  // 检查第一个路径是否以斜杠开头
  const startsWithSlash = paths[0]?.startsWith('/') || paths[0]?.startsWith('\\')
  const prefix = startsWithSlash ? '/' : ''
  
  return prefix + normalizedPaths.join('/')
}

/**
 * 标准化路径
 * @param inputPath - 输入路径
 * @returns 标准化后的路径
 * 
 * @example
 * normalizePath('\\folder\\subfolder\\') // '/folder/subfolder'
 * normalizePath('//folder//subfolder//') // '/folder/subfolder'
 */
export function normalizePath(inputPath: string): string {
  return inputPath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

/**
 * 检查路径是否为根目录
 * @param inputPath - 输入路径
 * @returns 是否为根目录
 */
export function isRootPath(inputPath: string): boolean {
  const normalized = normalizePath(inputPath)
  return normalized === '/' || normalized === ''
}

/**
 * 获取路径深度
 * @param inputPath - 输入路径
 * @returns 路径深度（根目录为0）
 * 
 * @example
 * getPathDepth('/') // 0
 * getPathDepth('/folder') // 1
 * getPathDepth('/folder/subfolder') // 2
 */
export function getPathDepth(inputPath: string): number {
  const normalized = normalizePath(inputPath)
  if (normalized === '/') return 0
  return normalized.split('/').filter(p => p).length
}

/**
 * 检查目录是否存在
 * @param path - 目录路径
 * @returns 目录是否存在
 */
export async function fs_exist_dir(path: string): Promise<boolean> {
  return await getRuntime().fs.existDir(path)
}

/**
 * 创建目录
 * @param path - 目录路径
 * @returns 是否成功创建
 */
export async function fs_make_dir(path: string): Promise<boolean> {
  try {
    await getRuntime().fs.makeDir(path)
    return true
  } catch {
    return false
  }
}
