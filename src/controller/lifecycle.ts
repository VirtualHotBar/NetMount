import { saveNmConfig } from '../services/ConfigService'
import { stopRclone } from '../utils/rclone/process'
import { stopOpenlist } from '../utils/openlist/process'
import { stopComponentWatchdog } from './componentWatchdog'
import { exit as tauriExit } from '@tauri-apps/plugin-process'
import { logger } from '../services/LoggerService'
import { cleanupTempOnExit } from '../utils/tempCleanup'

export async function exit(isRestartSelf: boolean = false) {
  stopComponentWatchdog()
  
  try {
    await saveNmConfig()
    await stopRclone()
    await stopOpenlist()
    await saveNmConfig()
    
    // 退出前清理临时文件（短超时，不阻塞退出）
    await cleanupTempOnExit().catch(() => {
      // 清理失败不阻止退出
    })
  } finally {
    if (isRestartSelf) {
      location.reload()
    } else {
      await tauriExit(0)
    }
  }
}

export async function saveStateAndExit(isRestartSelf: boolean = false) {
  try {
    await saveNmConfig()
  } catch (e) {
    logger.error('Failed to save config before exit', e as Error, 'Lifecycle')
  }
  
  if (isRestartSelf) {
    location.reload()
  }
}
