import type { TaskListItem } from '../../type/config'
import { copyDir, copyFile, delDir, delFile, moveDir, moveFile, sync } from '../../services/storage'
import { logger } from '../../services/LoggerService'

async function runTask(task: TaskListItem): Promise<TaskListItem> {
  const executeTask = async (t: TaskListItem) => {
    const srcIsDir = t.source.path.endsWith('/')
    const targetIsDir = t.target.path.endsWith('/')

    switch (t.taskType) {
      case 'copy': {
        if (srcIsDir && targetIsDir) {
          await copyDir(t.source.storageName, t.source.path, t.target.storageName, t.target.path)
        } else if (!srcIsDir && !targetIsDir) {
          await copyFile(t.source.storageName, t.source.path, t.target.storageName, t.target.path, true)
        } else if (!srcIsDir && targetIsDir) {
          await copyFile(t.source.storageName, t.source.path, t.target.storageName, t.target.path)
        } else {
          throw new Error('The directory cannot be copied/moved to a file')
        }
        break
      }
      case 'move': {
        if (srcIsDir && targetIsDir) {
          await moveDir(t.source.storageName, t.source.path, t.target.storageName, t.target.path)
        } else if (!srcIsDir && targetIsDir) {
          await moveFile(t.source.storageName, t.source.path, t.target.storageName, t.target.path)
        } else if (!srcIsDir && !targetIsDir) {
          await moveFile(t.source.storageName, t.source.path, t.target.storageName, t.target.path, undefined, true)
        } else {
          throw new Error('The directory cannot be copied/moved to a file')
        }
        break
      }
      case 'delete': {
        if (srcIsDir) {
          await delDir(t.source.storageName, t.source.path)
        } else {
          await delFile(t.source.storageName, t.source.path)
        }
        break
      }
      case 'sync': {
        await sync(t.source.storageName, t.source.path, t.target.storageName, t.target.path)
        break
      }
      case 'bisync': {
        // 使用resync参数处理首次同步或同步状态丢失的情况
        const useResync = t.parameters?.resync === true
        await sync(t.source.storageName, t.source.path, t.target.storageName, t.target.path, true, useResync)
        break
      }
      default: {
        throw new Error('Invalid task type')
      }
    }

    if (t.run.mode === 'disposable') {
      t.enable = false
    }
  }

  try {
    if (task.enable) {
      await executeTask(task)
      task.runInfo = { ...task.runInfo, error: false, msg: '' }
    }
  } catch (error) {
    logger.error(`Error executing task ${task.name}:`, error as Error, 'TaskRunner')
    task.runInfo = {
      ...task.runInfo,
      error: true,
      msg: error instanceof Error ? error.message : String(error),
    }
  }

  return task
}

export { runTask }
