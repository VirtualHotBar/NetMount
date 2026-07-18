/**
 * TransferService 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  copyDir,
  moveDir,
  sync,
} from '../TransferService'
import { convertStoragePath, formatPathRclone, getFileName } from '../StorageManager'

// Mock 依赖模块
vi.mock('../../../utils/rclone/request', () => ({
  rclone_api_post: vi.fn(),
  rclone_api_exec_async: vi.fn(),
}))

vi.mock('../StorageManager', () => ({
  convertStoragePath: vi.fn(),
  formatPathRclone: vi.fn(),
  getFileName: vi.fn(),
}))

describe('TransferService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // vitest config 设了 mockReset: true，每个 test 前会清掉 mock 实现，
    // 所以这里在 reset 之后重新装实现，避免 convertStoragePath 返回 undefined
    // 导致 impl 在 'Invalid source or destination path' 处提前抛错。
    vi.mocked(convertStoragePath).mockImplementation((name, path) => path ? `${name}:${path}` : `${name}:`)
    vi.mocked(formatPathRclone).mockImplementation((path) => path?.replace(/^\//, '') || '')
    vi.mocked(getFileName).mockImplementation((path) => path?.split('/').pop() || '')
  })

  describe('copyDir', () => {
    it('should copy directory successfully', async () => {
      const { rclone_api_exec_async } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_exec_async).mockResolvedValueOnce(true)

      await copyDir('src-storage', '/source-folder', 'dst-storage', '/dest-folder')

      expect(rclone_api_exec_async).toHaveBeenCalledWith('/sync/copy', expect.any(Object))
    })

    it('should throw error when storage name is empty', async () => {
      await expect(copyDir('', '/folder', 'dst', '/folder')).rejects.toThrow('Source or destination storage name is empty')
    })

    it('should throw error when path is empty', async () => {
      await expect(copyDir('src', '', 'dst', '/folder')).rejects.toThrow('Source path is empty')
    })

    it('should throw error when copy fails', async () => {
      const { rclone_api_exec_async } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_exec_async).mockResolvedValueOnce(false)

      await expect(copyDir('src', '/folder', 'dst', '/folder')).rejects.toThrow('Copy directory failed')
    })
  })

  describe('moveDir', () => {
    it('should move directory successfully', async () => {
      const { rclone_api_exec_async } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_exec_async).mockResolvedValueOnce(true)

      await moveDir('src-storage', '/source-folder', 'dst-storage', '/dest-folder')

      expect(rclone_api_exec_async).toHaveBeenCalledWith('/sync/move', expect.any(Object))
    })

    it('should support renaming during move', async () => {
      const { rclone_api_exec_async } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_exec_async).mockResolvedValueOnce(true)

      await moveDir('src', '/folder', 'dst', '/dest', 'new-name')

      expect(rclone_api_exec_async).toHaveBeenCalled()
    })

    it('should throw error when move fails', async () => {
      const { rclone_api_exec_async } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_exec_async).mockResolvedValueOnce(false)

      await expect(moveDir('src', '/folder', 'dst', '/folder')).rejects.toThrow('Move directory failed')
    })
  })

  describe('sync', () => {
    it('should perform one-way sync', async () => {
      const { rclone_api_exec_async } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_exec_async).mockResolvedValueOnce(true)

      await sync('src', '/folder1', 'dst', '/folder2')

      expect(rclone_api_exec_async).toHaveBeenCalledWith('/sync/sync', expect.any(Object))
    })

    it('should perform bidirectional sync when bisync is true', async () => {
      const { rclone_api_exec_async } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_exec_async).mockResolvedValueOnce(true)

      await sync('src', '/folder1', 'dst', '/folder2', true)

      expect(rclone_api_exec_async).toHaveBeenCalledWith('/sync/bisync', expect.any(Object))
    })

    it('should throw error when sync fails', async () => {
      const { rclone_api_exec_async } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_exec_async).mockResolvedValueOnce(false)

      await expect(sync('src', '/folder1', 'dst', '/folder2')).rejects.toThrow('Sync failed')
    })

    it('should throw error for bidirectional sync failure', async () => {
      const { rclone_api_exec_async } = await import('../../../utils/rclone/request')
      vi.mocked(rclone_api_exec_async).mockResolvedValueOnce(false)

      // impl 在 bisync 失败后会自动用 resync 重试一次（第二次调用返回默认 mock = undefined = falsy），
      // 然后抛出中文错误 '双向同步失败'。对齐实现的真实消息。
      await expect(sync('src', '/folder1', 'dst', '/folder2', true)).rejects.toThrow('双向同步失败')
    })
  })
})
