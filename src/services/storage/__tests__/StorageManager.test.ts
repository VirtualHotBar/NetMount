/**
 * StorageManager 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  delStorage,
  searchStorage,
  filterHideStorage,
  convertStoragePath,
  getStorageSpace,
  formatPathRclone,
  getFileName,
} from '../StorageManager'

// Mock 依赖模块
vi.mock('../../services/hook', () => ({
  hooks: {
    upStorage: vi.fn(),
  },
}))

vi.mock('../../services/rclone', () => ({
  rcloneInfo: {
    storageList: [],
    mountList: [],
  },
}))

vi.mock('../../services/openlist', () => ({
  openlistInfo: {
    markInRclone: 'openlist',
  },
}))

vi.mock('../../services/ConfigService', () => ({
  nmConfig: {
    mount: { lists: [] },
  },
  configService: {
    updateRcloneInfo: vi.fn(),
  },
}))

vi.mock('../../utils/rclone/request', () => ({
  rclone_api_post: vi.fn(),
}))

vi.mock('../../utils/openlist/request', () => ({
  openlist_api_get: vi.fn(),
  openlist_api_post: vi.fn(),
}))

vi.mock('../../stores/storageStore', () => ({
  useStorageStore: {
    getState: vi.fn(() => ({
      setStorageList: vi.fn(),
    })),
  },
}))

vi.mock('../../controller/storage/mount/mount', () => ({
  delMountStorage: vi.fn(),
}))

vi.mock('../../utils/tempCleanup', () => ({
  cleanupStorageOnDelete: vi.fn(),
}))

describe('StorageManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01'))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('filterHideStorage', () => {
    it('should filter out hidden storages', () => {
      const storages = [
        { name: 'storage1', hide: false, framework: 'rclone' as const, type: 's3' },
        { name: 'storage2', hide: true, framework: 'rclone' as const, type: 's3' },
        { name: 'storage3', hide: false, framework: 'rclone' as const, type: 's3' },
      ]

      const result = filterHideStorage(storages)

      expect(result).toHaveLength(2)
      expect(result[0]!.name).toBe('storage1')
      expect(result[1]!.name).toBe('storage3')
    })

    it('should return empty array for all hidden storages', () => {
      const storages = [
        { name: 'storage1', hide: true, framework: 'rclone' as const, type: 's3' },
        { name: 'storage2', hide: true, framework: 'rclone' as const, type: 's3' },
      ]

      const result = filterHideStorage(storages)

      expect(result).toHaveLength(0)
    })

    it('should return all storages if none are hidden', () => {
      const storages = [
        { name: 'storage1', hide: false, framework: 'rclone' as const, type: 's3' },
        { name: 'storage2', hide: false, framework: 'rclone' as const, type: 's3' },
      ]

      const result = filterHideStorage(storages)

      expect(result).toHaveLength(2)
    })
  })

  describe('searchStorage', () => {
    it('should find storage by name', async () => {
      const { rcloneInfo } = await import('../../rclone')
      rcloneInfo.storageList = [
        { name: 'storage1', framework: 'rclone', type: 's3' },
        { name: 'storage2', framework: 'rclone', type: 's3' },
      ]

      const result = searchStorage('storage1')

      expect(result).not.toBeUndefined()
      expect(result?.name).toBe('storage1')
    })

    it('should find openlist storage by driverPath', async () => {
      const { rcloneInfo } = await import('../../rclone')
      rcloneInfo.storageList = [
        {
          name: 'storage1',
          framework: 'openlist',
          type: 'alist',
          other: {
            openlist: {
              driverPath: '/storage1',
            },
          },
        },
      ]

      const result = searchStorage('/storage1')

      expect(result).not.toBeUndefined()
      expect(result?.name).toBe('storage1')
    })

    it('should return undefined for non-existent storage', async () => {
      const { rcloneInfo } = await import('../../rclone')
      rcloneInfo.storageList = []

      const result = searchStorage('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('getFileName', () => {
    it('should extract filename from path', () => {
      expect(getFileName('/folder/file.txt')).toBe('file.txt')
    })

    it('should handle path without folders', () => {
      expect(getFileName('file.txt')).toBe('file.txt')
    })

    it('should handle empty path', () => {
      expect(getFileName('')).toBe('')
    })
  })

  describe('formatPathRclone', () => {
    it('should remove leading slash', () => {
      expect(formatPathRclone('/folder/file.txt')).toBe('folder/file.txt')
    })

    it('should remove trailing slash', () => {
      expect(formatPathRclone('folder/')).toBe('folder')
    })

    it('should handle path with both leading and trailing slashes', () => {
      expect(formatPathRclone('/folder/subfolder/')).toBe('folder/subfolder')
    })

    it('should handle root path', () => {
      expect(formatPathRclone('/')).toBe('')
    })
  })

  describe('convertStoragePath', () => {
    it('should convert rclone storage path', async () => {
      const { rcloneInfo } = await import('../../rclone')
      rcloneInfo.storageList = [
        { name: 'mys3', framework: 'rclone', type: 's3' },
      ]

      const result = convertStoragePath('mys3', '/folder/file.txt')

      expect(result).toBe('mys3:folder/file.txt')
    })

    it('should return only storage name when onlyStorageName is true', async () => {
      const { rcloneInfo } = await import('../../rclone')
      rcloneInfo.storageList = [
        { name: 'mys3', framework: 'rclone', type: 's3' },
      ]

      const result = convertStoragePath('mys3', '/folder/file.txt', false, false, true)

      expect(result).toBe('mys3')
    })

    it('should return empty string for unknown storage', async () => {
      const { rcloneInfo } = await import('../../rclone')
      rcloneInfo.storageList = []

      const result = convertStoragePath('unknown', '/folder/file.txt')

      expect(result).toBe('')
    })
  })

  describe('getStorageSpace', () => {
    it('should return storage space info', async () => {
      const { rclone_api_post } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockResolvedValueOnce({
        total: 1000000,
        free: 500000,
        used: 500000,
      })

      const result = await getStorageSpace('test-storage')

      expect(result).toEqual({
        total: 1000000,
        free: 500000,
        used: 500000,
      })
    })

    it('should return negative values when storage is not accessible', async () => {
      const { rclone_api_post } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockRejectedValueOnce(new Error('Storage not found'))

      const result = await getStorageSpace('test-storage')

      expect(result.total).toBeLessThan(0)
    })

    it('should mark internal storage for cleanup when inaccessible', async () => {
      const { rclone_api_post } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_post).mockRejectedValueOnce(new Error('Storage not found'))

      const result = await getStorageSpace('.netmount-test')

      expect(result).toEqual({ total: -2, free: -2, used: -2 })
    })
  })

  describe('delStorage', () => {
    it('should delete rclone storage', async () => {
      const { rcloneInfo } = await import('../../rclone')
      const { rclone_api_post } = await import('../../../utils/rclone/request')
      
      rcloneInfo.storageList = [
        { name: 'test-storage', framework: 'rclone', type: 's3' },
      ]
      vi.mocked(rclone_api_post).mockResolvedValueOnce(undefined)

      await delStorage('test-storage')

      expect(rclone_api_post).toHaveBeenCalledWith('/config/delete', {
        name: 'test-storage',
      })
    })

    it('should delete openlist storage', async () => {
      const { rcloneInfo } = await import('../../rclone')
      const { openlist_api_post } = await import('../../../utils/openlist/request')
      
      rcloneInfo.storageList = [
        {
          name: 'test-storage',
          framework: 'openlist',
          type: 'alist',
          other: {
            openlist: {
              id: 123,
            },
          },
        },
      ]
      vi.mocked(openlist_api_post).mockResolvedValueOnce({} as any)

      await delStorage('test-storage')

      expect(openlist_api_post).toHaveBeenCalledWith('/api/admin/storage/delete', undefined, {
        id: 123,
      })
    })
  })
})
