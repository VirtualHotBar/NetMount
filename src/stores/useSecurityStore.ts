/**
 * Security Store - 安全状态管理
 * 
 * 管理应用锁定状态，支持启动密码、空闲超时锁定和休眠锁定
 */

import { create } from 'zustand'

interface SecurityState {
  /** 当前是否处于锁定状态 */
  isLocked: boolean
  /** 是否已设置启动密码 */
  hasPassword: boolean
  /** 空闲超时时间（分钟），0表示禁用 */
  idleTimeoutMinutes: number
  /** 最后一次用户活动时间戳 */
  lastActivityTime: number

  // Actions
  /** 锁定应用 */
  lock: () => void
  /** 解锁应用 */
  unlock: () => void
  /** 设置是否有密码 */
  setHasPassword: (has: boolean) => void
  /** 设置空闲超时时间 */
  setIdleTimeout: (minutes: number) => void
  /** 更新最后活动时间 */
  updateActivity: () => void
}

export const useSecurityStore = create<SecurityState>((set) => ({
  isLocked: false,
  hasPassword: false,
  idleTimeoutMinutes: 0,
  lastActivityTime: Date.now(),

  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
  setHasPassword: (has) => set({ hasPassword: has }),
  setIdleTimeout: (minutes) => set({ idleTimeoutMinutes: minutes }),
  updateActivity: () => set({ lastActivityTime: Date.now() }),
}))
