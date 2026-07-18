/**
 * 文件工具函数测试
 */

import { describe, it, expect } from 'vitest'
import {
  getParentPath,
  getFileName,
  getFileExtension,
  joinPath,
  normalizePath,
  isRootPath,
  getPathDepth,
} from '../index'

describe('File Utils - Path Functions', () => {
  describe('getParentPath', () => {
    it('should return parent directory for file path', () => {
      expect(getParentPath('/folder/subfolder/file.txt')).toBe('/folder/subfolder')
    })

    it('should return parent directory for directory path', () => {
      expect(getParentPath('/folder/subfolder/')).toBe('/folder')
    })

    it('should return root for top-level file', () => {
      expect(getParentPath('/file.txt')).toBe('/')
    })

    it('should return root for top-level folder', () => {
      expect(getParentPath('/folder')).toBe('/')
    })

    it('should handle Windows-style paths', () => {
      expect(getParentPath('\\folder\\subfolder\\file.txt')).toBe('/folder/subfolder')
    })

    it('should handle paths without leading slash', () => {
      expect(getParentPath('folder/subfolder')).toBe('/folder')
    })
  })

  describe('getFileName', () => {
    it('should return filename with extension', () => {
      expect(getFileName('/folder/file.txt')).toBe('file.txt')
    })

    it('should return filename without extension', () => {
      expect(getFileName('/folder/file.txt', false)).toBe('file')
    })

    it('should return directory name for directory path', () => {
      expect(getFileName('/folder/subfolder/')).toBe('subfolder')
    })

    it('should handle hidden files', () => {
      expect(getFileName('/folder/.hidden', false)).toBe('.hidden')
    })

    it('should handle files with multiple dots', () => {
      expect(getFileName('/folder/file.tar.gz', false)).toBe('file.tar')
    })

    it('should handle Windows-style paths', () => {
      expect(getFileName('\\folder\\file.txt')).toBe('file.txt')
    })
  })

  describe('getFileExtension', () => {
    it('should return extension with dot', () => {
      expect(getFileExtension('file.txt')).toBe('.txt')
    })

    it('should return last extension for multiple dots', () => {
      expect(getFileExtension('file.tar.gz')).toBe('.gz')
    })

    it('should return empty string for no extension', () => {
      expect(getFileExtension('file')).toBe('')
    })

    it('should handle path with directories', () => {
      expect(getFileExtension('/folder/subfolder/file.txt')).toBe('.txt')
    })

    it('should handle hidden files', () => {
      expect(getFileExtension('.hidden')).toBe('')
    })
  })

  describe('joinPath', () => {
    it('should join multiple path segments', () => {
      expect(joinPath('folder', 'subfolder', 'file.txt')).toBe('folder/subfolder/file.txt')
    })

    it('should handle paths with leading/trailing slashes', () => {
      expect(joinPath('/folder/', '/subfolder/')).toBe('/folder/subfolder')
    })

    it('should return root for empty input', () => {
      expect(joinPath()).toBe('/')
    })

    it('should preserve leading slash from first segment', () => {
      expect(joinPath('/folder', 'subfolder')).toBe('/folder/subfolder')
    })

    it('should not add leading slash if first segment does not have it', () => {
      expect(joinPath('folder', 'subfolder')).toBe('folder/subfolder')
    })

    it('should handle Windows-style paths', () => {
      expect(joinPath('\\folder', '\\subfolder')).toBe('/folder/subfolder')
    })
  })

  describe('normalizePath', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(normalizePath('\\folder\\subfolder\\')).toBe('/folder/subfolder')
    })

    it('should remove duplicate slashes', () => {
      expect(normalizePath('//folder//subfolder//')).toBe('/folder/subfolder')
    })

    it('should remove trailing slash', () => {
      expect(normalizePath('/folder/subfolder/')).toBe('/folder/subfolder')
    })

    it('should return root for empty string', () => {
      expect(normalizePath('')).toBe('/')
    })
  })

  describe('isRootPath', () => {
    it('should return true for root path', () => {
      expect(isRootPath('/')).toBe(true)
    })

    it('should return true for empty path', () => {
      expect(isRootPath('')).toBe(true)
    })

    it('should return false for non-root paths', () => {
      expect(isRootPath('/folder')).toBe(false)
      expect(isRootPath('/folder/subfolder')).toBe(false)
    })

    it('should handle Windows-style paths', () => {
      expect(isRootPath('\\')).toBe(true)
    })
  })

  describe('getPathDepth', () => {
    it('should return 0 for root path', () => {
      expect(getPathDepth('/')).toBe(0)
    })

    it('should return 1 for single level path', () => {
      expect(getPathDepth('/folder')).toBe(1)
    })

    it('should return 2 for two level path', () => {
      expect(getPathDepth('/folder/subfolder')).toBe(2)
    })

    it('should handle paths with trailing slash', () => {
      expect(getPathDepth('/folder/subfolder/')).toBe(2)
    })

    it('should handle Windows-style paths', () => {
      expect(getPathDepth('\\folder\\subfolder')).toBe(2)
    })
  })
})
