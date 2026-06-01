import { invoke } from '@tauri-apps/api/core'
import { nmConfig } from '../../services/ConfigService'

// 设置颜色模式
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  //监听
  nmConfig.settings.themeMode === 'auto' && setThemeMode(nmConfig.settings.themeMode)
})
function setThemeMode(mode: 'dark' | 'light' | 'auto' | string): void {
  const body = document.body
  let isDarkMode: boolean = false

  switch (mode) {
    case 'dark':
      isDarkMode = true
      break
    case 'light':
      isDarkMode = false
      break
    case 'auto':
      isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      break
  }

  // 根据模式设置页面主题和背景颜色
  if (isDarkMode) {
    document.body.setAttribute('arco-theme', 'dark')
    body.style.backgroundColor = '#2E2E2E'
  } else {
    document.body.removeAttribute('arco-theme')
    body.style.backgroundColor = '#FFFFFF'
  }
}

//获取是否启用自启
async function getAutostartState(): Promise<boolean> {
  return (await invoke('get_autostart_state')) as boolean
}

//设置自启
async function setAutostartState(state: boolean): Promise<boolean> {
  return (await invoke('set_autostart_state', { enabled: state })) as boolean
}

// 自启模式类型
type AutostartMode = 'none' | 'registry' | 'task_scheduler'

//获取自启模式
async function getAutostartMode(): Promise<AutostartMode> {
  return (await invoke('get_autostart_mode')) as AutostartMode
}

//设置自启模式
async function setAutostartMode(mode: AutostartMode): Promise<boolean> {
  return (await invoke('set_autostart_mode', { mode })) as boolean
}

//检查是否支持任务计划程序（仅 Windows）
async function isTaskSchedulerAvailable(): Promise<boolean> {
  return (await invoke('is_task_scheduler_available')) as boolean
}

//检查是否在服务模式下运行
async function isServiceMode(): Promise<boolean> {
  return (await invoke('is_service_mode')) as boolean
}

export {
  setThemeMode,
  getAutostartState,
  setAutostartState,
  getAutostartMode,
  setAutostartMode,
  isTaskSchedulerAvailable,
  isServiceMode,
}

export type { AutostartMode }
