/**
 * Storage Repository - 存储库模式实现
 * 解耦全局状态，提供类型安全的存储操作接口
 */

import { EventEmitter } from 'events';
import { rcloneInfo } from '../services/rclone';
import { AppError } from '../utils/error';
import { StorageList } from '../type/rclone/rcloneInfo';

// ============================================
// 常量定义
// ============================================

export const STORAGE_EVENTS = {
  UPDATED: 'storage:updated',
  ADDED: 'storage:added',
  REMOVED: 'storage:removed',
  ERROR: 'storage:error',
} as const;

export const STORAGE_CONSTANTS = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  STORAGE_NAME_MAX_LENGTH: 128,
  INVALID_STORAGE_CHARS: ['<', '>', ':', '"', '|', '?', '*', '/', '\\'],
  DEFAULT_PAGE_SIZE: 50,
} as const;

// ============================================
// 类型定义
// ============================================

/**
 * 存储搜索条件
 */
export interface StorageSearchCriteria {
  name?: string;
  framework?: 'rclone' | 'openlist';
  type?: string;
  includeHidden?: boolean;
}

/**
 * 存储更新事件
 */
export interface StorageUpdateEvent {
  type: 'added' | 'removed' | 'updated' | 'refresh';
  storage?: StorageList;
  timestamp: Date;
}

/**
 * 存储库配置
 */
export interface StorageRepositoryConfig {
  enableEventEmitter?: boolean;
  maxCacheSize?: number;
}

// ============================================
// 存储库类
// ============================================

/**
 * 存储库 - 提供统一的存储数据访问层
 * 
 * 设计原则:
 * 1. 单一数据源 - 所有存储数据通过此仓库访问
 * 2. 事件驱动 - 数据变化时通知订阅者
 * 3. 类型安全 - 强类型接口避免运行时错误
 * 4. 可测试 - 通过接口隔离依赖
 */
export class StorageRepository extends EventEmitter {
  private static instance: StorageRepository | null = null;
  private cache: StorageList[] = [];
  private lastRefresh: Date | null = null;
  private config: Required<StorageRepositoryConfig>;

  private constructor(config: StorageRepositoryConfig = {}) {
    super();
    this.config = {
      enableEventEmitter: config.enableEventEmitter ?? true,
      maxCacheSize: config.maxCacheSize ?? 100,
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: StorageRepositoryConfig): StorageRepository {
    if (!StorageRepository.instance) {
      StorageRepository.instance = new StorageRepository(config);
    }
    return StorageRepository.instance;
  }

  /**
   * 刷新存储列表
   */
  async refresh(): Promise<void> {
    try {
      // 从 rcloneInfo.service 获取数据
      const sourceList = rcloneInfo.storageList;
      
      // 更新缓存
      this.cache = [...sourceList];
      this.lastRefresh = new Date();

      // 触发事件
      if (this.config.enableEventEmitter) {
        this.emit(STORAGE_EVENTS.UPDATED, {
          type: 'refresh',
          timestamp: this.lastRefresh,
        });
      }
    } catch (error) {
      const appError = AppError.api(
        'Failed to refresh storage list',
        'REFRESH_FAILED',
        { error: String(error) }
      );
      
      if (this.config.enableEventEmitter) {
        this.emit(STORAGE_EVENTS.ERROR, appError);
      }
      
      throw appError;
    }
  }

  /**
   * 获取所有存储列表
   */
  getAll(): StorageList[] {
    return [...this.cache];
  }

  /**
   * 根据条件搜索存储
   */
  search(criteria: StorageSearchCriteria): StorageList[] {
    let results = [...this.cache];

    if (criteria.name) {
      results = results.filter(
        (s) => s.name.toLowerCase().includes(criteria.name!.toLowerCase())
      );
    }

    if (criteria.framework) {
      results = results.filter((s) => s.framework === criteria.framework);
    }

    if (criteria.type) {
      results = results.filter((s) => s.type === criteria.type);
    }

    if (!criteria.includeHidden) {
      results = results.filter((s) => !s.hide);
    }

    return results;
  }

  /**
   * 根据名称获取存储
   */
  getByName(name: string): StorageList | undefined {
    return this.cache.find((s) => s.name === name);
  }

  /**
   * 根据 ID 获取 OpenList 存储
   */
  getOpenListById(id: number): StorageList | undefined {
    return this.cache.find(
      (s) => s.framework === 'openlist' && s.other?.openlist?.id === id
    );
  }

  /**
   * 检查存储是否存在
   */
  exists(name: string): boolean {
    return this.cache.some((s) => s.name === name);
  }

  /**
   * 添加存储
   */
  add(storage: StorageList): void {
    // 检查是否已存在
    if (this.exists(storage.name)) {
      throw AppError.validation(`Storage "${storage.name}" already exists`, {
        name: storage.name,
      });
    }

    this.cache.push(storage);

    if (this.config.enableEventEmitter) {
      this.emit(STORAGE_EVENTS.ADDED, {
        type: 'added',
        storage,
        timestamp: new Date(),
      });
    }
  }

  /**
   * 移除存储
   */
  remove(name: string): boolean {
    const index = this.cache.findIndex((s) => s.name === name);
    if (index === -1) {
      return false;
    }

    const removed = this.cache.splice(index, 1)[0];

    if (this.config.enableEventEmitter) {
      this.emit(STORAGE_EVENTS.REMOVED, {
        type: 'removed',
        storage: removed,
        timestamp: new Date(),
      });
    }

    return true;
  }

  /**
   * 更新存储
   */
  update(name: string, updates: Partial<StorageList>): StorageList | undefined {
    const index = this.cache.findIndex((s) => s.name === name);
    if (index === -1) {
      return undefined;
    }

    const existing = this.cache[index];
    
    // 使用类型断言来合并更新，绕过 exactOptionalPropertyTypes 限制
    this.cache[index] = { ...existing, ...updates } as StorageList;

    const updated = this.cache[index];

    if (this.config.enableEventEmitter) {
      this.emit(STORAGE_EVENTS.UPDATED, {
        type: 'updated',
        storage: updated,
        timestamp: new Date(),
      });
    }

    return updated;
  }

  /**
   * 设置存储列表 (批量替换)
   */
  setStorages(storages: StorageList[]): void {
    this.cache = storages.slice(0, this.config.maxCacheSize);
    this.lastRefresh = new Date();

    if (this.config.enableEventEmitter) {
      this.emit(STORAGE_EVENTS.UPDATED, {
        type: 'refresh',
        timestamp: this.lastRefresh,
      });
    }
  }

  /**
   * 获取隐藏的存储数量
   */
  getHiddenCount(): number {
    return this.cache.filter((s) => s.hide).length;
  }

  /**
   * 获取按框架分组的存储统计
   */
  getStatsByFramework(): Record<'rclone' | 'openlist', number> {
    return {
      rclone: this.cache.filter((s) => s.framework === 'rclone').length,
      openlist: this.cache.filter((s) => s.framework === 'openlist').length,
    };
  }

  /**
   * 获取上次刷新时间
   */
  getLastRefreshTime(): Date | null {
    return this.lastRefresh;
  }

  /**
   * 检查缓存是否过期
   */
  isCacheExpired(maxAgeMs: number = 60000): boolean {
    if (!this.lastRefresh) {
      return true;
    }
    return Date.now() - this.lastRefresh.getTime() > maxAgeMs;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache = [];
    this.lastRefresh = null;
  }

  /**
   * 销毁单例 (主要用于测试)
   */
  static destroy(): void {
    if (StorageRepository.instance) {
      StorageRepository.instance.removeAllListeners();
      StorageRepository.instance = null;
    }
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 获取存储库实例
 */
export function getStorageRepository(config?: StorageRepositoryConfig): StorageRepository {
  return StorageRepository.getInstance(config);
}

/**
 * 创建存储验证器
 */
export function validateStorageName(name: string): AppError | null {
  if (!name || typeof name !== 'string') {
    return AppError.validation('存储名称不能为空', { name });
  }

  if (name.trim().length === 0) {
    return AppError.validation('存储名称不能为空', { name });
  }

  if (name.length > STORAGE_CONSTANTS.STORAGE_NAME_MAX_LENGTH) {
    return AppError.validation(
      `存储名称长度不能超过 ${STORAGE_CONSTANTS.STORAGE_NAME_MAX_LENGTH} 字符`,
      { name, maxLength: STORAGE_CONSTANTS.STORAGE_NAME_MAX_LENGTH }
    );
  }

  // 检查非法字符
  const invalidChars = STORAGE_CONSTANTS.INVALID_STORAGE_CHARS.filter(
    (char) => name.includes(char)
  );

  if (invalidChars.length > 0) {
    return AppError.validation('存储名称包含非法字符', {
      name,
      invalidChars,
    });
  }

  return null;
}

/**
 * 创建安全的存储添加函数
 */
export function safeAddStorage(
  repository: StorageRepository,
  storage: StorageList
): { success: boolean; error?: AppError } {
  const validationError = validateStorageName(storage.name);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    repository.add(storage);
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error };
    }
    return {
      success: false,
      error: AppError.api(
        'Failed to add storage',
        'ADD_STORAGE_FAILED',
        { originalError: String(error) }
      ),
    };
  }
}
