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
 * @throws Error if source or destination is invalid
 */
async function sync(
  storageName: string,
  path: string,
  destStoragename: string,
  destPath: string,
  bisync?: boolean,
  resync?: boolean
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

    success = await rclone_api_exec_async('/sync/sync', {
      srcFs,
      dstFs,
    })
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

    success = await rclone_api_exec_async('/sync/bisync', params)
    if (!success) {
      throw new Error(`Bidirectional sync failed: ${path1} <-> ${path2}`)
    }
  }
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

    success = await rclone_api_exec_async('/sync/sync', {
      srcFs,
      dstFs,
    })
    if (!success) {
      throw new Error(`Sync failed: ${srcFs} -> ${dstFs}`)
    }
  } else {
    const path1 = convertStoragePath(storageName, path, true)
    const path2 = convertStoragePath(destStoragename, destPath, true)

    if (!path1 || !path2) {
      throw new Error('Invalid source or destination path')
    }

    // 双向同步：首次运行或同步状态丢失时需要 resync
    // rclone bisync 要求首次运行时传入 --resync 参数
    // 通过 _async + extra 参数传递
    success = await rclone_api_exec_async('/sync/bisync', {
      path1,
      path2,
      _resync: false, // 默认不 resync，rclone 会自动检测是否需要
    })

    if (!success) {
      // 如果失败，可能是首次运行需要 resync
      logger.info('Bisync failed, retrying with --resync flag', 'TransferService', { path1, path2 })
      success = await rclone_api_exec_async('/sync/bisync', {
        path1,
        path2,
        _resync: true,
      })
      if (!success) {
        throw new Error(`Bidirectional sync failed: ${path1} <-> ${path2}`)
      }
    }
  }
}

export { copyFile, copyDir, moveFile, moveDir, sync }
