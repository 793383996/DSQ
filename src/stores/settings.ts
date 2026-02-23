/**
 * SettingsStore - 设置管理Store
 *
 * 功能：
 * - 管理机器设置（制造台、熔炉、化工厂等）
 * - 管理配方设置
 * - 管理速度设置
 * - 管理生产力设置
 * - 支持设置持久化
 * - 提供设置变更通知
 *
 * 主要状态：
 * - machineSettings: 机器设置
 * - recipeSettings: 配方设置
 * - speedSettings: 速度设置
 * - productivitySettings: 生产力设置
 *
 * 主要方法：
 * - setMachineSetting(key, value): 设置机器配置
 * - loadMachineSettings(settings): 加载机器设置
 * - syncRecipeSettings(settings): 同步配方设置
 * - syncSpeedSettings(settings): 同步速度设置
 * - syncProductivitySettings(settings): 同步生产力设置
 * - onSettingsChange(callback): 监听设置变更
 *
 * 上游调用：
 * - App.vue: 主应用组件
 * - components/ConfigPanel.vue: 配置面板组件
 * - stores/blueprint.ts: 原始Store（向后兼容）
 *
 * 下游依赖：
 * - core/bridge.ts: 状态同步桥
 * - core/config/app.config.ts: 应用配置
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { logger } from '../utils/logger'
import { APP_CONFIG } from '../core/config/app.config'
import type { IRecipeSettings, ISpeedSettings, IProductivitySettings } from '../core/types/settings'

export interface MachineSettings {
  modeIn: string
  furnace: string
  chemical: string
  accType: string
  accValue: string
  research: string
  selfAcc?: boolean
  isAddSelfAccP?: boolean
  hideSource?: boolean
}

const SETTINGS_STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.DEFAULT_MACHINE_SETTINGS + APP_CONFIG.VERSION

function loadPersistedSettings(): MachineSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    logger.warn('Failed to load persisted settings:', e)
  }
  return {
    modeIn: '制作台Mk.Ⅰ',
    furnace: '电弧熔炉',
    chemical: '化工厂',
    accType: '增产剂Mk.Ⅰ',
    accValue: '无',
    research: '矩阵研究站',
    selfAcc: false,
    isAddSelfAccP: false,
    hideSource: false
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const machineSettings = ref<MachineSettings>(loadPersistedSettings())
  const recipeSettings = ref<IRecipeSettings>({})
  const speedSettings = ref<ISpeedSettings>({})
  const productivitySettings = ref<IProductivitySettings>({})

  const settingsChangeCallbacks: Set<() => void> = new Set()
  let settingsChangeDebounceTimer: ReturnType<typeof setTimeout> | null = null
  let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null
  const SETTINGS_CHANGE_DEBOUNCE_MS = 100
  const PERSIST_DEBOUNCE_MS = 100

  /**
   * 注册设置变更监听器
   *
   * 重要：调用方必须在组件销毁时调用返回的清理函数，否则会导致内存泄漏
   *
   * @example
   * // 在 Vue 组件中使用
   * const cleanup = settingsStore.onSettingsChange(() => { ... })
   * onUnmounted(() => cleanup())
   *
   * @param callback 设置变更时调用的回调函数
   * @returns 清理函数，调用后移除该监听器
   */
  function onSettingsChange(callback: () => void): () => void {
    settingsChangeCallbacks.add(callback)
    return () => settingsChangeCallbacks.delete(callback)
  }

  function notifySettingsChange() {
    if (settingsChangeDebounceTimer) {
      clearTimeout(settingsChangeDebounceTimer)
    }
    settingsChangeDebounceTimer = setTimeout(() => {
      settingsChangeDebounceTimer = null
      settingsChangeCallbacks.forEach(cb => {
        try {
          cb()
        } catch (e) {
          logger.warn('[SettingsStore] Settings change callback error:', e)
        }
      })
    }, SETTINGS_CHANGE_DEBOUNCE_MS)
  }

  function setMachineSetting<K extends keyof MachineSettings>(key: K, value: MachineSettings[K]) {
    machineSettings.value[key] = value
    persistSettings()
    notifySettingsChange()
  }

  function loadMachineSettings(settings: MachineSettings) {
    machineSettings.value = { ...settings }
    persistSettings()
    notifySettingsChange()
  }

  function syncRecipeSettings(settings: IRecipeSettings) {
    recipeSettings.value = { ...settings }
    notifySettingsChange()
  }

  function syncSpeedSettings(settings: ISpeedSettings) {
    speedSettings.value = { ...settings }
    notifySettingsChange()
  }

  function syncProductivitySettings(settings: IProductivitySettings) {
    productivitySettings.value = { ...settings }
    notifySettingsChange()
  }

  function syncAllSettings(
    recipe: IRecipeSettings,
    speed: ISpeedSettings,
    prod: IProductivitySettings
  ) {
    recipeSettings.value = { ...recipe }
    speedSettings.value = { ...speed }
    productivitySettings.value = { ...prod }
    notifySettingsChange()
  }

  function persistSettings() {
    if (persistDebounceTimer) {
      clearTimeout(persistDebounceTimer)
    }
    persistDebounceTimer = setTimeout(() => {
      persistDebounceTimer = null
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(machineSettings.value))
      } catch (e) {
        logger.warn('Failed to persist settings:', e)
      }
    }, PERSIST_DEBOUNCE_MS)
  }

  function resetToDefaults() {
    machineSettings.value = {
      modeIn: '制作台Mk.Ⅰ',
      furnace: '电弧熔炉',
      chemical: '化工厂',
      accType: '增产剂Mk.Ⅰ',
      accValue: '无',
      research: '矩阵研究站',
      selfAcc: false,
      isAddSelfAccP: false,
      hideSource: false
    }
    recipeSettings.value = {}
    speedSettings.value = {}
    productivitySettings.value = {}
    persistSettings()
    notifySettingsChange()
  }

  watch(
    [machineSettings, recipeSettings, speedSettings, productivitySettings],
    () => {
      persistSettings()
    },
    { deep: true }
  )

  return {
    machineSettings,
    recipeSettings,
    speedSettings,
    productivitySettings,
    setMachineSetting,
    loadMachineSettings,
    syncRecipeSettings,
    syncSpeedSettings,
    syncProductivitySettings,
    syncAllSettings,
    onSettingsChange,
    resetToDefaults
  }
})
