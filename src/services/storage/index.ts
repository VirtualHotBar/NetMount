/**
 * Storage Service Module
 * 
 * This module provides a complete set of storage management capabilities:
 * - StorageManager: Core storage operations (CRUD, search, path conversion)
 * - StorageCreationService: Storage creation with validation
 * - MountService: Mount operations
 * - FileManager: File operations (list, delete, upload, mkdir)
 * - TransferService: Transfer operations (copy, move, sync)
 */

// Storage Manager - Core storage operations
export {
  reupStorage,
  delStorage,
  getStorageParams,
  searchStorage,
  filterHideStorage,
  convertStoragePath,
  getStorageSpace,
  formatPathRclone,
  getFileName,
  renameStorage,
} from './StorageManager'

// Storage Creation Service - Creation with validation
export {
  createStorage,
} from './StorageCreationService'

// Mount Service - Mount operations
export {
  reupMountService,
} from './MountService'

// File Manager - File operations
export {
  getFileList,
  delFile,
  delDir,
  mkDir,
  uploadFileRequest,
  type RefreshCallback,
} from './FileManager'

// Transfer Service - Transfer operations
export {
  copyFile,
  copyDir,
  moveFile,
  moveDir,
  sync,
} from './TransferService'

// Alist Import Service - Import alist configurations
export {
  importAlistConfig,
  parseAlistConfig,
  type AlistStorageItem,
  type ImportResult,
} from './AlistImportService'
