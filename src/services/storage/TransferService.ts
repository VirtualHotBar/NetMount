import { rclone_api_post, rclone_api_exec_async } from '../../utils/rclone/request'
import { convertStoragePath, formatPathRclone, getFileName } from './StorageManager'
import { logger } from '../LoggerService'

/**
 * Copy a file from one location to another
 * @param storageName - Source storage name
 * @param path - Source file path
 * @param destStoragename - Destination storage name
 * @param destPath - Destination directory path
 * @param pathF2f - If true, destPath is a file path (default: false for directory)
 */
async function copyFile(
  storageName: string,
  path: string,
  destStoragename: string,
  destPath: string,
  pathF2f: boolean = false
) {
  //pathF2f:destPath 为文件时需要设置为 true。(默认 false 时为文件夹，文件名来自 srcPath)
  await rclone_api_post(
    '/operations/copyfile',
    {
      srcFs: convertStoragePath(storageName, undefined, undefined, undefined, true),
      srcRemote: convertStoragePath(storageName, path, undefined, true),
      dstFs: convertStoragePath(destStoragename, undefined, undefined, undefined, true),
      dstRemote:
        convertStoragePath(destStoragename, destPath, !pathF2f, true)! +
        (!pathF2f && getFileName(path)),
    },
    true
  )
}

/**
 * Move a file from one location to another
 * @param storageName - Source storage name
 * @param path - Source file path
 * @param destStoragename - Destination storage name
 * @param destPath - Destination directory path
 * @param newNmae - New file name (optional)
 * @param pathF2f - If true, destPath is a file path (default: false for directory)
 */
async function moveFile(
  storageName: string,
  path: string,
  destStoragename: string,
  destPath: string,
  newNmae?: string,
  pathF2f: boolean = false
) {
  await rclone_api_post(
    '/operations/movefile',
    {
      srcFs: convertStoragePath(storageName, undefined, undefined, undefined, true),
      srcRemote: convertStoragePath(storageName, formatPathRclone(path), undefined, true),
      dstFs: convertStoragePath(destStoragename, undefined, undefined, undefined, true),
      dstRemote:
        convertStoragePath(destStoragename, destPath, !pathF2f, true) +
        (!pathF2f && newNmae ? newNmae : getFileName(path)),
    },
    true
  )
}

/**
 * Copy a directory from one location to another
 * @param storageName - Source storage name
 * @param path - Source directory path
 * @param destStoragename - Destination storage name
 * @param destPath - Destination directory path
 * @throws Error if source or destination is invalid
 */
async function copyDir(
  storageName: string,
  path: string,
  destStoragename: string,
  destPath: string
) {
  // 参数验证
  if (!storageName || !destStoragename) {
    throw new Error('Source or destination storage name is empty')
  }
  if (!path) {
    throw new Error('Source path is empty')
  }

  const srcFs = convertStoragePath(storageName, path, true)
  const dstFs = convertStoragePath(destStoragename, destPath, true) + getFileName(path)

  if (!srcFs || !dstFs) {
    throw new Error('Invalid source or destination path')
  }

  const success = await rclone_api_exec_async('/sync/copy', {
    srcFs,
    dstFs,
  })
  if (!success) {
    throw new Error(`Copy directory failed: ${srcFs} -> ${dstFs}`)
  }
}

/**
 * Move a directory from one location to another
 * @param storageName - Source storage name
 * @param path - Source directory path
 * @param destStoragename - Destination storage name
 * @param destPath - Destination directory path
 * @param newNmae - New directory name (optional)
 * @throws Error if source or destination is invalid
 */
async function moveDir(
  storageName: string,
  path: string,
  destStoragename: string,
  destPath: string,
  newNmae?: string
) {
  // 参数验证
  if (!storageName || !destStoragename) {
    throw new Error('Source or destination storage name is empty')
  }
  if (!path) {
    throw new Error('Source path is empty')
  }

  const srcFs = convertStoragePath(storageName, path, true)
  const dstFs =
    convertStoragePath(destStoragename, destPath, true) + (newNmae ? newNmae : getFileName(path))

  if (!srcFs || !dstFs) {
    throw new Error('Invalid source or destination path')
  }

  const success = await rclone_api_exec_async('/sync/move', {
    srcFs,
    dstFs,
  })
  if (!success) {
    throw new Error(`Move directory failed: ${srcFs} -> ${dstFs}`)
  }
}

/**
 * Sync two directories
 * @param storageName - Source storage name
 * @param path - Source directory path
 * @param destStoragename - Destination storage name
 * @param destPath - Destination directory path
 * @param bisync - If true, perform bidirectional sync (default: false)
 * @param resync - If true, force resync for bisync (default: false)
 * @param filterRules - Optional array of rclone filter rules (e.g., ["+ *.jpg", "- *.tmp"])
 * @throws Error if source or destination is invalid
 */
async function sync(
  storageName: string,
  path: string,
  destStoragename: string,
  destPath: string,
  bisync?: boolean,
  resync?: boolean,
  filterRules?: string[]
) {
  //bisync: 双向同步

  // 参数验证
  if (!storageName || !destStoragename) {
    throw new Error('Source or destination storage name is empty')
  }
  if (!path || !destPath) {
    throw new Error('Source or destination path is empty')
  }

  let success: boolean
  if (!bisync) {
    const srcFs = convertStoragePath(storageName, path, true)
    const dstFs = convertStoragePath(destStoragename, destPath, true)

    if (!srcFs || !dstFs) {
      throw new Error('Invalid source or destination path')
    }

    const params: Record<string, unknown> = {
      srcFs,
      dstFs,
    }

    // 添加过滤规则
    if (filterRules && filterRules.length > 0) {
      params.filter = filterRules.join('\n')
    }

    success = await rclone_api_exec_async('/sync/sync', params)
    if (!success) {
      throw new Error(`Sync failed: ${srcFs} -> ${dstFs}`)
    }
  } else {
    const path1 = convertStoragePath(storageName, path, true)
    const path2 = convertStoragePath(destStoragename, destPath, true)

    if (!path1 || !path2) {
      throw new Error('Invalid source or destination path')
    }

    const params: Record<string, unknown> = {
      path1,
      path2,
    }

    // 添加resync标志以处理首次同步或同步状态丢失的情况
    if (resync) {
      params.resync = true
    }

    // 使用 checksum 比较而非 modtime，解决某些远程存储不支持 modtime 的问题
    // 这是 rclone bisync 的推荐做法，可以避免 "Modtime compare was requested" 错误
    params.checksum = true

    // 添加过滤规则
    if (filterRules && filterRules.length > 0) {
      params.filter = filterRules.join('\n')
    }

    success = await rclone_api_exec_async('/sync/bisync', params)
    if (!success) {
      // 如果用户未请求 resync 且首次失败，自动尝试 resync
      if (!resync) {
        logger.info('Bisync failed, retrying with --resync flag', 'TransferService', { path1, path2 })
        params.resync = true
        success = await rclone_api_exec_async('/sync/bisync', params)
        if (!success) {
          throw new Error(
            `双向同步失败: ${path1} <-> ${path2}\n` +
            `首次同步可能需要使用"强制重新同步"选项。如果问题持续，请检查两端的文件是否可访问。`
          )
        }
      } else {
        throw new Error(
          `双向同步失败: ${path1} <-> ${path2}\n` +
          `请检查两端的文件是否可访问，以及是否有权限问题。`
        )
      }
    }
  }
}

export { copyFile, copyDir, moveFile, moveDir, sync }
