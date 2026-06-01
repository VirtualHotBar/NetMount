import type { TaskListItem } from '../../type/config'
import { runTask } from './runner'
import { delTask } from './task'
import { logger } from '../../services/LoggerService'

class TaskScheduler {
  tasks: TaskListItem[]
  private runningTasks: Set<string>

  constructor() {
    this.tasks = []
    this.runningTasks = new Set()
  }

  public async addTask(task: TaskListItem) {
    if (task.enable) {
      this.tasks.push(task)
      this.scheduleTask(task)
    }
  }

  private scheduleTask(task: TaskListItem) {
    switch (task.run.mode) {
      case 'start':
        void this.executeTask(task)
        this.cancelTask(task.name)
        break
      case 'disposable':
        void this.executeTask(task)
        this.cancelTask(task.name)
        break
      case 'time': {
        const executeTaskInterval = () => {
          const now = new Date()
          const scheduledTime = new Date(now)
          scheduledTime.setDate(scheduledTime.getDate() + task.run.time.intervalDays)
          scheduledTime.setHours(task.run.time.h, task.run.time.m, task.run.time.s)

          if (scheduledTime < now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1)
          }

          const timeout = scheduledTime.getTime() - now.getTime()
          if (timeout >= 0) {
            task.run.runId = window.setTimeout(async () => {
              await this.executeTask(task)
              executeTaskInterval()
            }, timeout)
          }
        }
        executeTaskInterval()
        break
      }
      case 'interval':
        task.run.runId = window.setInterval(async () => await this.executeTask(task), task.run.interval)
        break
      default:
        logger.error(`Invalid task mode: ${task.run.mode}`, undefined, 'TaskScheduler')
    }
  }

  public async executeTask(task: TaskListItem) {
    // 防止同一任务重叠执行
    if (this.runningTasks.has(task.name)) {
      logger.debug(`Task ${task.name} is already running, skipping`, 'TaskScheduler')
      return
    }

    this.runningTasks.add(task.name)
    try {
      const updatedTask = await runTask(task)
      this.tasks = this.tasks.map(t => t.name === updatedTask.name ? updatedTask : t)

      // disposable 模式：任务完成后删除
      if (updatedTask.run.mode === 'disposable') {
        delTask(updatedTask.name)
      }
    } finally {
      this.runningTasks.delete(task.name)
    }
  }

  cancelTask(taskName: string) {
    const task = this.tasks.find(t => t.name === taskName)
    if (task && task.run.runId !== undefined) {
      window.clearInterval(task.run.runId)
      window.clearTimeout(task.run.runId)
      task.run.runId = undefined
    }
  }
}

export { TaskScheduler }
