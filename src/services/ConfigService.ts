/**
 * ConfigService - 配置服务封装
 * 
 * 将全局可变状态 nmConfig 和 osInfo 封装为服务类，提供：
 * 1. 受控的访问和修改
 * 2. 变更监听机制
 * 3. 类型安全
 * 4. 便于测试（可注入mock）
 * 
 * 保持向后兼容：原导出仍然可用，但建议使用新的服务类
 */

import { invoke } from '@tauri-apps/api/core'
import { NMConfig, OSInfo } from '../type/config'
import { RcloneInfo } from '../type/rclone/rcloneInfo'
import { mergeObjects } from '../utils'
import { logger } from './LoggerService'
import { rcloneInfo as rcloneInfoInstance } from './rclone'
import { roConfig, runtimeEnv, getRuntimeEnv, ConfigChangeListener, OsInfoChangeListener, createDefaultConfig, createDefaultOsInfo } from './config/roConfig'
import { encodePassword, decodePassword } from '../utils/passwordEncoding'

export { roConfig, runtimeEnv, getRuntimeEnv }

// ============================================
// ConfigService 类
// ============================================
class ConfigService {
  private config: NMConfig = createDefaultConfig()
  private osInfo: OSInfo = createDefaultOsInfo()
  private configListeners: Set<ConfigChangeListener> = new Set()
  private osInfoListeners: Set<OsInfoChangeListener> = new Set()

  // ==========================================
  // 配置访问
  // ==========================================
  
  /**
   * 获取当前配置的只读副本
   */
  getConfig(): Readonly<NMConfig> {
    return this.config
  }

  /**
   * 获取配置的部分字段
   */
  get<K extends keyof NMConfig>(key: K): NMConfig[K] {
    return this.config[key]
  }

  /**
   * 深获取嵌套配置值
   */
  getPath<T>(path: string): T | undefined {
    const keys = path.split('.')
    let value: unknown = this.config
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key]
      } else {
        return undefined
      }
    }
    
    return value as T
  }

  // ==========================================
  // 配置修改
  // ==========================================
  
  /**
   * 更新配置（部分更新，自动合并）
   */
  updateConfig(partial: Partial<NMConfig>): void {
    const prevConfig = { ...this.config }
    this.config = mergeObjects(this.config, partial)
    this.notifyConfigChange(prevConfig)
  }

  /**
   * 设置完整配置（覆盖）
   */
  setConfig(config: NMConfig): void {
    const prevConfig = this.config
    this.config = config
    this.notifyConfigChange(prevConfig)
  }

  /**
   * 更新嵌套配置路径
   */
  updatePath(path: string, value: unknown): void {
    const keys = path.split('.')
    const partial: Record<string, unknown> = {}
    let current = partial
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]!] = {}
      current = current[keys[i]!] as Record<string, unknown>
    }
    
    current[keys[keys.length - 1]!] = value
    this.updateConfig(partial as Partial<NMConfig>)
  }

  // ==========================================
  // 配置监听
  // ==========================================
  
  /**
   * 订阅配置变更
   * @returns 取消订阅函数
   */
  subscribeConfig(listener: ConfigChangeListener): () => void {
    this.configListeners.add(listener)
    return () => {
      this.configListeners.delete(listener)
    }
  }

  /**
   * 订阅特定路径的变更
   */
  subscribePath<T>(path: string, listener: (newValue: T, oldValue: T) => void): () => void {
    let oldValue = this.getPath<T>(path)
    
    return this.subscribeConfig(() => {
      const newValue = this.getPath<T>(path)
      if (newValue !== oldValue) {
        listener(newValue as T, oldValue as T)
        oldValue = newValue
      }
    })
  }

  private notifyConfigChange(prevConfig: NMConfig): void {
    this.configListeners.forEach(listener => {
      try {
        listener(this.config, prevConfig)
      } catch (error) {
        logger.error('Config change listener error', error as Error, 'ConfigService')
      }
    })
  }

  // ==========================================
  // 持久化
  // ==========================================
  
  /**
   * 从磁盘读取配置
   */
  async loadConfig(): Promise<void> {
    try {
      const configData = await invoke<Partial<NMConfig>>('get_config')
      this.config = mergeObjects(this.config, configData)
      
      // 解码框架密码（向后兼容明文密码）
      if (this.config.framework?.rclone?.password) {
        this.config.framework.rclone.password = decodePassword(this.config.framework.rclone.password)
      }
      if (this.config.framework?.openlist?.password) {
        this.config.framework.openlist.password = decodePassword(this.config.framework.openlist.password)
      }
      
      logger.info('Config loaded from disk', 'ConfigService')
    } catch (error) {
      logger.error('Failed to load config', error as Error, 'ConfigService')
      // 使用默认配置继续
    }
  }

  /**
   * 保存配置到磁盘
   */
  async saveConfig(): Promise<void> {
    try {
      // 创建配置副本，编码框架密码后再保存
      const configToSave = JSON.parse(JSON.stringify(this.config)) as NMConfig
      if (configToSave.framework?.rclone?.password) {
        configToSave.framework.rclone.password = encodePassword(configToSave.framework.rclone.password)
      }
      if (configToSave.framework?.openlist?.password) {
        configToSave.framework.openlist.password = encodePassword(configToSave.framework.openlist.password)
      }
      
      await invoke('update_config', {
        data: configToSave,
      })
      logger.info('Config saved to disk', 'ConfigService')
    } catch (error) {
      logger.error('Failed to save config', error as Error, 'ConfigService')
      throw error
    }
  }

  // ==========================================
  // OS Info
  // ==========================================
  
  getOsInfo(): Readonly<OSInfo> {
    return this.osInfo
  }

  setOsInfo(osInfo: OSInfo): void {
    this.osInfo = osInfo
    this.osInfoListeners.forEach(listener => {
      try {
        listener(osInfo)
      } catch (error) {
        logger.error('OS info listener error', error as Error, 'ConfigService')
      }
    })
  }

  subscribeOsInfo(listener: OsInfoChangeListener): () => void {
    this.osInfoListeners.add(listener)
    return () => {
      this.osInfoListeners.delete(listener)
    }
  }

  // ==========================================
  // Rclone Info
  // ==========================================
  
  /**
   * 更新 RcloneInfo 的部分字段
   */
  updateRcloneInfo(partial: Partial<RcloneInfo>): void {
    Object.assign(rcloneInfoInstance, partial)
    logger.debug('RcloneInfo updated', 'ConfigService', { updatedFields: Object.keys(partial) })
  }

  // ==========================================
  // 便捷方法
  // ==========================================
  
  /**
   * 获取当前语言
   */
  getLanguage(): string | undefined {
    return this.config.settings.language
  }

  /**
   * 设置语言
   */
  setLanguage(lang: string): void {
    this.updatePath('settings.language', lang)
  }

  /**
   * 获取主题模式
   */
  getThemeMode(): string {
    return this.config.settings.themeMode
  }

  /**
   * 设置主题模式
   */
  setThemeMode(mode: string): void {
    this.updatePath('settings.themeMode', mode)
  }

  /**
   * 获取缓存目录
   */
  getCacheDir(): string | undefined {
    return this.config.settings.path.cacheDir
  }

  /**
   * 设置缓存目录
   */
  setCacheDir(dir: string): void {
    this.updatePath('settings.path.cacheDir', dir)
  }

  /**
   * 添加挂载
   */
  addMount(mount: NMConfig['mount']['lists'][0]): void {
    this.updateConfig({
      mount: {
        lists: [...this.config.mount.lists, mount],
      },
    })
  }

  /**
   * 移除挂载
   */
  removeMount(storageName: string): void {
    this.updateConfig({
      mount: {
        lists: this.config.mount.lists.filter(m => m.storageName !== storageName),
      },
    })
  }

  /**
   * 添加任务
   */
  addTask(task: NMConfig['task'][0]): void {
    this.updateConfig({
      task: [...this.config.task, task],
    })
  }

  /**
   * 移除任务
   */
  removeTask(taskName: string): void {
    this.updateConfig({
      task: this.config.task.filter(t => t.name !== taskName),
    })
  }
}

// ============================================
// 单例实例
// ============================================
const configService = new ConfigService()

export { ConfigService, configService }

// ============================================
// 向后兼容：导出 getter 函数
// ============================================

// 为了向后兼容，导出 getter 函数而非快照
// 使用函数调用获取最新配置值
export const getNmConfig = () => configService.getConfig()
export const getOsInfo = () => configService.getOsInfo()

// 为了完全向后兼容，同时导出 Proxy 对象（允许 nmConfig.xxx 访问）
export const nmConfig = new Proxy({} as NMConfig, {
  get: (_, key) => configService.getConfig()[key as keyof NMConfig],
})
export const osInfo = new Proxy({} as OSInfo, {
  get: (_, key) => configService.getOsInfo()[key as keyof OSInfo],
})

// 导出原有的函数（委托给 configService）
export const setNmConfig = (config: NMConfig) => configService.setConfig(config)
export const setOsInfo = (osinfo: OSInfo) => configService.setOsInfo(osinfo)
export const readNmConfig = () => configService.loadConfig()
export const saveNmConfig = () => configService.saveConfig()
