/**
 * MountRepository 单元测试
 * 
 * 更新后的测试匹配重构后的 Repository API
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MountRepository } from '../mount/MountRepository'
import type { MountListItem } from '../../type/config'

// Mock 依赖模块
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('../../services/ConfigService', () => ({
  nmConfig: {
    mount: {
      lists: [] as MountListItem[],
    },
  },
  saveNmConfig: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../services/rclone', () => ({
  rcloneInfo: {
    mountList: [],
    version: { os: 'windows' },
    endpoint: { isLocal: true },
  },
}))

vi.mock('../../services/hook', () => ({
  hooks: {
    upMount: vi.fn(),
  },
}))

vi.mock('../../stores/mountStore', () => ({
  useMountStore: {
    getState: () => ({
      setMountList: vi.fn(),
    }),
  },
}))

vi.mock('../../utils/rclone/request', () => ({
  rclone_api_post: vi.fn().mockResolvedValue({ mountPoints: [] }),
}))

vi.mock('../../utils', () => ({
  fs_exist_dir: vi.fn().mockResolvedValue(true),
  fs_make_dir: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../services/storage/StorageManager', () => ({
  convertStoragePath: vi.fn().mockReturnValue('storage:'),
}))

vi.mock('../../type/rclone/api', () => ({
  isMountListResponse: vi.fn().mockReturnValue(true),
}))

describe('MountRepository', () => {
  let repository: MountRepository

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01'))
    repository = new MountRepository()
    vi.clearAllMocks()

    // vitest config sets mockReset/clearMocks, so module-level mock
    // implementations are wiped before each test. Re-establish the response
    // type guard (mountHelpers.refreshMountList gates on isMountListResponse).
    const { isMountListResponse } = await import('../../type/rclone/api')
    vi.mocked(isMountListResponse).mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getAll', () => {
    it('should return all mounts', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      
      vi.mocked(rclone_api_post).mockResolvedValueOnce({
        mountPoints: [
          { fs: 'storage1', mountPoint: '/mnt/storage1', mountedOn: '2024-01-01T00:00:00Z' },
          { fs: 'storage2', mountPoint: '/mnt/storage2', mountedOn: '2024-01-01T00:00:00Z' },
        ],
      })

      const result = await repository.getAll()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        storageName: 'storage1',
        mountPath: '/mnt/storage1',
        status: 'mounted',
      })
    })
  })

  describe('mountStorage', () => {
    it('should mount storage successfully', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      const { rclone_api_post } = await import('../../utils/rclone/request')

      nmConfig.mount.lists = []
      vi.mocked(rclone_api_post).mockResolvedValueOnce(undefined)
      vi.mocked(rclone_api_post).mockResolvedValueOnce({
        mountPoints: [
          { fs: 'test-storage', mountPoint: '/mnt/test', mountedOn: '2024-01-01T00:00:00Z' },
        ],
      })

      const mountInfo: MountListItem = {
        storageName: 'test-storage',
        mountPath: '/mnt/test',
        parameters: { vfsOpt: {}, mountOpt: {} },
        autoMount: false,
      }

      await repository.mountStorage(mountInfo)

      // Post-refactor mountStorage performs a pure mount (config persistence
      // lives in addMountConfig). Assert the /mount/mount call fired.
      expect(rclone_api_post).toHaveBeenCalledWith(
        '/mount/mount',
        expect.objectContaining({ mountPoint: expect.any(String) })
      )
    })
  })

  describe('getById', () => {
    it('should return mount by id', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      
      vi.mocked(rclone_api_post).mockResolvedValueOnce({
        mountPoints: [
          { fs: 'storage1', mountPoint: '/mnt/storage1', mountedOn: '2024-01-01T00:00:00Z' },
        ],
      })

      const expectedId = `${encodeURIComponent('storage1')}_${encodeURIComponent('/mnt/storage1')}`
      const result = await repository.getById(expectedId)

      expect(result).not.toBeNull()
      expect(result!.storageName).toBe('storage1')
      expect(result!.id).toBe(expectedId)
    })

    it('should return null for non-existent mount', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockResolvedValueOnce({ mountPoints: [] })

      const result = await repository.getById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('exists', () => {
    it('should return true for existing mount', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      
      vi.mocked(rclone_api_post).mockResolvedValueOnce({
        mountPoints: [
          { fs: 'storage1', mountPoint: '/mnt/storage1', mountedOn: '2024-01-01T00:00:00Z' },
        ],
      })

      const mountId = `${encodeURIComponent('storage1')}_${encodeURIComponent('/mnt/storage1')}`
      const result = await repository.exists(mountId)

      expect(result).toBe(true)
    })

    it('should return false for non-existent mount', async () => {
      const { rclone_api_post } = await import('../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockResolvedValueOnce({ mountPoints: [] })

      const result = await repository.exists('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('addMountConfig', () => {
    it('should add mount configuration', async () => {
      const { nmConfig, saveNmConfig } = await import('../../services/ConfigService')
      const { rclone_api_post } = await import('../../utils/rclone/request')
      
      nmConfig.mount.lists = []
      vi.mocked(rclone_api_post).mockResolvedValueOnce({ mountPoints: [] })

      const result = await repository.addMountConfig(
        'test-storage',
        '/mnt/test',
        { vfsOpt: {} as any, mountOpt: {} as any },
        false
      )

      expect(result).toBe(true)
      expect(saveNmConfig).toHaveBeenCalled()
      expect(nmConfig.mount.lists).toHaveLength(1)
    })

    it('should return false if mount already exists', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      
      nmConfig.mount.lists = [
        { storageName: 'test-storage', mountPath: '/mnt/test', parameters: { vfsOpt: {} as any, mountOpt: {} as any }, autoMount: false },
      ]

      const result = await repository.addMountConfig(
        'test-storage',
        '/mnt/test',
        { vfsOpt: {} as any, mountOpt: {} as any },
        false
      )

      expect(result).toBe(false)
    })
  })

  describe('getMountConfig', () => {
    it('should return mount config by path', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      
      nmConfig.mount.lists = [
        { storageName: 'test-storage', mountPath: '/mnt/test', parameters: { vfsOpt: {}, mountOpt: {} }, autoMount: false },
      ]

      const result = repository.getMountConfig('/mnt/test')

      expect(result).toBeDefined()
      expect(result!.storageName).toBe('test-storage')
    })

    it('should return undefined for non-existent path', async () => {
      const { nmConfig } = await import('../../services/ConfigService')
      nmConfig.mount.lists = []

      const result = repository.getMountConfig('/mnt/nonexistent')

      expect(result).toBeUndefined()
    })
  })
})