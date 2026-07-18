/**
 * TaskRepository 单元测试
 * 
 * 更新后的测试匹配重构后的 Repository API
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TaskRepository } from '../task/TaskRepository'
import type { TaskListItem } from '../../type/config'

// Mock 依赖模块
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('../../services/ConfigService', () => ({
  nmConfig: {
    task: [] as TaskListItem[],
  },
  saveNmConfig: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../controller/task/scheduler', () => ({
  TaskScheduler: vi.fn().mockImplementation(() => ({
    addTask: vi.fn().mockResolvedValue(undefined),
    cancelTask: vi.fn(),
  })),
}))

vi.mock('../../controller/task/runner', () => ({
  runTask: vi.fn().mockResolvedValue({
    runInfo: { error: false, msg: 'Success' },
  }),
}))

vi.mock('../../services/LoggerService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/LoggerService')>()
  return {
    ...actual,
    logger: {
      withContext: vi.fn().mockReturnValue({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    },
  }
})

describe('TaskRepository', () => {
  let repository: TaskRepository

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01'))
    repository = new TaskRepository()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getAll', () => {
    it('should return all tasks', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 'storage1', path: '/path1' },
          target: { storageName: 'storage2', path: '/path2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
        {
          name: 'task2',
          taskType: 'move',
          source: { storageName: 'storage2', path: '/path2' },
          target: { storageName: 'storage3', path: '/path3' },
          enable: true,
          run: { mode: 'interval', time: { intervalDays: 1, h: 0, m: 0, s: 0 }, interval: 3600 },
          runInfo: {},
        },
      ]

      const result = await repository.getAll()

      expect(result.length).toBe(2)
      expect(result[0]).toMatchObject({
        id: 'task1',
        name: 'task1',
        taskType: 'copy',
      })
    })

    it('should return empty array when no tasks', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = []

      const result = await repository.getAll()

      expect(result).toHaveLength(0)
    })
  })

  describe('create', () => {
    it('should create task successfully', async () => {
      const { nmConfig, saveNmConfig } = await import('../../services/ConfigService')
      
      nmConfig.task = []

      const result = await repository.create({
        name: 'new-task',
        taskType: 'copy',
        source: { storageName: 's1', path: '/p1' },
        target: { storageName: 's2', path: '/p2' },
      })

      expect(result.name).toBe('new-task')
      expect(result.status).toBe('pending')
      expect(saveNmConfig).toHaveBeenCalled()
    })

    it('should throw error for missing required fields', async () => {
      await expect(repository.create({ name: 'test' } as any)).rejects.toThrow(
        'Missing required fields'
      )
    })

    it('should throw error for duplicate task name', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'existing-task',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      await expect(repository.create({
        name: 'existing-task',
        taskType: 'move',
        source: { storageName: 's2', path: '/p2' },
        target: { storageName: 's3', path: '/p3' },
      })).rejects.toThrow('already exists')
    })
  })

  describe('getById', () => {
    it('should return task by id', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      const result = await repository.getById('task1')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('task1')
    })

    it('should return null for non-existent task', async () => {
      const result = await repository.getById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('executeTask', () => {
    it('should execute task successfully', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      const { runTask } = await import('../../controller/task/runner')
      
      const mockTask: TaskListItem = {
        name: 'test-task',
        taskType: 'copy',
        source: { storageName: 's1', path: '/p1' },
        target: { storageName: 's2', path: '/p2' },
        enable: true,
        run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
        runInfo: {},
      }

      nmConfig.task = [mockTask]
      vi.mocked(runTask).mockResolvedValueOnce({
        runInfo: { error: false, msg: 'Success' },
      } as any)

      const result = await repository.executeTask('test-task')

      expect(result.success).toBe(true)
    })

    it('should throw error if task not found', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = []

      await expect(repository.executeTask('non-existent')).rejects.toThrow('Task not found')
    })
  })

  describe('cancelTask', () => {
    it('should cancel task successfully', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      
      nmConfig.task = [
        {
          name: 'running-task',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 }, runId: 123 },
          runInfo: {},
        },
      ]

      const result = await repository.cancelTask('running-task')

      expect(result).toBe(true)
    })
  })

  describe('getTaskStats', () => {
    it('should return correct statistics', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
        {
          name: 'task2',
          taskType: 'move',
          source: { storageName: 's2', path: '/p2' },
          target: { storageName: 's3', path: '/p3' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 }, runId: 123 },
          runInfo: {},
        },
      ]

      const stats = await repository.getTaskStats()

      expect(stats.totalTasks).toBe(2)
      expect(stats.runningTasks).toBe(1)
    })

    it('should handle empty task list', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = []

      const stats = await repository.getTaskStats()

      expect(stats.totalTasks).toBe(0)
      expect(stats.pendingTasks).toBe(0)
    })
  })

  describe('update', () => {
    it('should update task in place', async () => {
      const { nmConfig, saveNmConfig } = await import('../../services/ConfigService')

      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: { error: false, msg: 'Previous run' },
        },
      ]

      const result = await repository.update('task1', {
        taskType: 'sync',
        source: { storageName: 's3', path: '/p3' },
      })

      expect(result.taskType).toBe('sync')
      expect(result.source.storageName).toBe('s3')
      expect(result.source.path).toBe('/p3')
      expect(saveNmConfig).toHaveBeenCalled()
    })

    it('should throw error when trying to change task name', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      await expect(repository.update('task1', { name: 'new-name' })).rejects.toThrow(
        'Cannot change task name'
      )
    })

    it('should throw error for non-existent task', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = []

      await expect(repository.update('non-existent', { taskType: 'sync' })).rejects.toThrow('not found')
    })
  })

  describe('delete', () => {
    it('should delete task successfully', async () => {
      const { nmConfig, saveNmConfig } = await import('../../services/ConfigService')
      
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      const result = await repository.delete('task1')

      expect(result).toBe(true)
      expect(saveNmConfig).toHaveBeenCalled()
      expect(nmConfig.task).toHaveLength(0)
    })

    it('should return false for non-existent task', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = []

      const result = await repository.delete('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('saveTaskConfig', () => {
    it('should save new task config', async () => {
      const { nmConfig, saveNmConfig } = await import('../../services/ConfigService')
      
      nmConfig.task = []

      const taskInfo: TaskListItem = {
        name: 'new-task',
        taskType: 'copy',
        source: { storageName: 's1', path: '/p1' },
        target: { storageName: 's2', path: '/p2' },
        enable: true,
        run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
        runInfo: {},
      }

      const result = await repository.saveTaskConfig(taskInfo)

      expect(result).toBe(true)
      expect(saveNmConfig).toHaveBeenCalled()
      expect(nmConfig.task).toHaveLength(1)
    })

    it('should update existing task config', async () => {
      const { nmConfig, saveNmConfig } = await import('../../services/ConfigService')
      
      nmConfig.task = [
        {
          name: 'existing-task',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      const updatedTask: TaskListItem = {
        name: 'existing-task',
        taskType: 'move',
        source: { storageName: 's3', path: '/p3' },
        target: { storageName: 's4', path: '/p4' },
        enable: false,
        run: { mode: 'interval', time: { intervalDays: 1, h: 0, m: 0, s: 0 } },
        runInfo: {},
      }

      const result = await repository.saveTaskConfig(updatedTask)

      expect(result).toBe(true)
      expect(saveNmConfig).toHaveBeenCalled()
      expect(nmConfig.task[0]).toMatchObject({ taskType: 'move' })
    })
  })

  describe('deleteTaskConfig', () => {
    it('should delete task config', async () => {
      const { nmConfig, saveNmConfig } = await import('../../services/ConfigService')
      
      nmConfig.task = [
        {
          name: 'task-to-delete',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      const result = await repository.deleteTaskConfig('task-to-delete')

      expect(result).toBe(true)
      expect(saveNmConfig).toHaveBeenCalled()
      expect(nmConfig.task).toHaveLength(0)
    })
  })

  describe('getRunningTasks', () => {
    it('should return only running tasks', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 }, runId: 123 },
          runInfo: {},
        },
        {
          name: 'task2',
          taskType: 'move',
          source: { storageName: 's2', path: '/p2' },
          target: { storageName: 's3', path: '/p3' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      const result = await repository.getRunningTasks()

      expect(result).toHaveLength(1)
      expect(result[0]!.name).toBe('task1')
    })

    it('should return empty array when no running tasks', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'task1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
      ]

      const result = await repository.getRunningTasks()

      expect(result).toHaveLength(0)
    })
  })

  describe('getPendingTasks', () => {
    it('should return only pending tasks', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.task = [
        {
          name: 'pending1',
          taskType: 'copy',
          source: { storageName: 's1', path: '/p1' },
          target: { storageName: 's2', path: '/p2' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 } },
          runInfo: {},
        },
        {
          name: 'running1',
          taskType: 'move',
          source: { storageName: 's2', path: '/p2' },
          target: { storageName: 's3', path: '/p3' },
          enable: true,
          run: { mode: 'start', time: { intervalDays: 0, h: 0, m: 0, s: 0 }, runId: 123 },
          runInfo: {},
        },
      ]

      const result = await repository.getPendingTasks()

      expect(result).toHaveLength(1)
      expect(result[0]!.name).toBe('pending1')
    })
  })
})
