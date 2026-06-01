/**
 * Storage Controller - Backward Compatibility Layer
 * 
 * This file re-exports all storage functions from the new modular structure
 * to maintain backward compatibility with existing imports.
 * 
 * @deprecated Import directly from '@/services/storage' instead
 */

// Re-export all from the new modular structure
export {
  // Storage Manager
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
  
  // File Manager
  getFileList,
  delFile,
  delDir,
  mkDir,
  uploadFileRequest,
  type RefreshCallback,
  
  // Transfer Service
  copyFile,
  copyDir,
  moveFile,
  moveDir,
  sync,
} from '../../services/storage'
