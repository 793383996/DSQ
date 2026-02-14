import type {
  IRecipeSettings,
  ISpeedSettings,
  IProductivitySettings,
  IRecipeSetting
} from '../types/settings'
import { logger } from '../../utils/logger'

declare global {
  interface Window {
    settings: IRecipeSettings
    settings_time: ISpeedSettings
    settings_pf: IProductivitySettings
    settingsLocal: IRecipeSettings
    saveSetting: () => void
    saveSettingTime: () => void
    saveSettingPf: () => void
    loadSetting: () => void
    loadSettingTime: () => void
    loadSettingPf: () => void
    update_all: () => void
  }
}

const STORAGE_KEY_MACHINE = 'machine_settings'
const STORAGE_KEY_SPEED = 'machine_settings_time'
const STORAGE_KEY_PF = 'machine_settings_pf'
const VERSION = '20240202'

/**
 * 设置适配器 - 管理配方设置、速度设置、增产剂设置
 *
 * 架构师注：
 * - 此适配器封装对 window.settings/settings_time/settings_pf 的访问
 * - settings: 配方级设置，key为配方ID，value包含机器名称和增产剂配置
 * - settings_time: 机器速度设置，key为机器名称
 * - settings_pf: 增产剂设置，key为物品名称，value为配方索引
 * - 提供类型安全的读写接口
 * - 自动同步到 localStorage
 */
export class SettingsAdapter {
  private recipeSettings: IRecipeSettings = {}
  private speedSettings: ISpeedSettings = {}
  private productivitySettings: IProductivitySettings = {}

  /**
   * 初始化设置 (从遗留代码加载)
   */
  init(): void {
    if (typeof window === 'undefined') return

    if (window.settings) {
      this.recipeSettings = window.settings
    }
    if (window.settings_time) {
      this.speedSettings = window.settings_time
    }
    if (window.settings_pf) {
      this.productivitySettings = window.settings_pf
    }

    logger.log('[SettingsAdapter] Initialized')
  }

  /**
   * 获取配方设置
   */
  getRecipeSetting(recipeId: string): IRecipeSetting | undefined {
    return this.recipeSettings[recipeId]
  }

  /**
   * 获取配方选中的机器
   */
  getRecipeMachine(recipeId: string): string | undefined {
    return this.recipeSettings[recipeId]?.m
  }

  /**
   * 设置配方选中的机器
   */
  setRecipeMachine(recipeId: string, machineName: string): void {
    if (!this.recipeSettings[recipeId]) {
      this.recipeSettings[recipeId] = {}
    }
    this.recipeSettings[recipeId].m = machineName
    if (typeof window !== 'undefined') {
      window.settings[recipeId] = this.recipeSettings[recipeId]
      if (typeof window.saveSetting === 'function') {
        window.saveSetting()
      }
      if (typeof window.update_all === 'function') {
        window.update_all()
      }
    }
  }

  /**
   * 获取配方增产剂类型
   */
  getRecipeAccType(recipeId: string): string | undefined {
    return this.recipeSettings[recipeId]?.accType
  }

  /**
   * 设置配方增产剂类型
   */
  setRecipeAccType(recipeId: string, accType: string): void {
    if (!this.recipeSettings[recipeId]) {
      this.recipeSettings[recipeId] = {}
    }
    this.recipeSettings[recipeId].accType = accType
    if (typeof window !== 'undefined') {
      window.settings[recipeId] = this.recipeSettings[recipeId]
      if (typeof window.saveSetting === 'function') {
        window.saveSetting()
      }
      if (typeof window.update_all === 'function') {
        window.update_all()
      }
    }
  }

  /**
   * 获取配方增产剂效果
   */
  getRecipeAccValue(recipeId: string): string | undefined {
    return this.recipeSettings[recipeId]?.accValue
  }

  /**
   * 设置配方增产剂效果
   */
  setRecipeAccValue(recipeId: string, accValue: string): void {
    if (!this.recipeSettings[recipeId]) {
      this.recipeSettings[recipeId] = {}
    }
    this.recipeSettings[recipeId].accValue = accValue
    if (typeof window !== 'undefined') {
      window.settings[recipeId] = this.recipeSettings[recipeId]
      if (typeof window.saveSetting === 'function') {
        window.saveSetting()
      }
      if (typeof window.update_all === 'function') {
        window.update_all()
      }
    }
  }

  /**
   * 获取所有配方设置
   */
  getAllRecipeSettings(): IRecipeSettings {
    return { ...this.recipeSettings }
  }

  /**
   * 获取机器速度设置
   */
  getSpeedSetting(machineName: string): number | undefined {
    return this.speedSettings[machineName]
  }

  /**
   * 设置机器速度
   */
  setSpeedSetting(machineName: string, speed: number): void {
    this.speedSettings[machineName] = speed
    if (typeof window !== 'undefined') {
      window.settings_time[machineName] = speed
      if (typeof window.saveSettingTime === 'function') {
        window.saveSettingTime()
      }
      if (typeof window.update_all === 'function') {
        window.update_all()
      }
    }
  }

  /**
   * 获取所有速度设置
   */
  getAllSpeedSettings(): ISpeedSettings {
    return { ...this.speedSettings }
  }

  /**
   * 获取增产剂设置（配方索引）
   */
  getProductivitySetting(itemName: string): number | undefined {
    return this.productivitySettings[itemName]
  }

  /**
   * 设置增产剂配置
   */
  setProductivitySetting(itemName: string, recipeIndex: number): void {
    this.productivitySettings[itemName] = recipeIndex
    if (typeof window !== 'undefined') {
      window.settings_pf[itemName] = recipeIndex
      if (typeof window.saveSettingPf === 'function') {
        window.saveSettingPf()
      }
      if (typeof window.update_all === 'function') {
        window.update_all()
      }
    }
  }

  /**
   * 获取所有增产剂设置
   */
  getAllProductivitySettings(): IProductivitySettings {
    return { ...this.productivitySettings }
  }

  /**
   * 重置所有设置
   */
  reset(): void {
    this.recipeSettings = {}
    this.speedSettings = {}
    this.productivitySettings = {}

    if (typeof window !== 'undefined') {
      window.settings = {}
      window.settings_time = {}
      window.settings_pf = {}
    }
  }

  /**
   * 从 localStorage 加载设置 (独立于遗留代码)
   */
  loadFromStorage(): void {
    try {
      const recipeJson = localStorage.getItem(STORAGE_KEY_MACHINE + VERSION)
      if (recipeJson) {
        this.recipeSettings = JSON.parse(recipeJson)
      }

      const speedJson = localStorage.getItem(STORAGE_KEY_SPEED + VERSION)
      if (speedJson) {
        this.speedSettings = JSON.parse(speedJson)
      }

      const pfJson = localStorage.getItem(STORAGE_KEY_PF + VERSION)
      if (pfJson) {
        this.productivitySettings = JSON.parse(pfJson)
      }

      logger.log('[SettingsAdapter] Loaded from storage')
    } catch (e) {
      logger.warn('[SettingsAdapter] Failed to load from storage:', e)
    }
  }

  /**
   * 保存到 localStorage (独立于遗留代码)
   */
  saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY_MACHINE + VERSION, JSON.stringify(this.recipeSettings))
      localStorage.setItem(STORAGE_KEY_SPEED + VERSION, JSON.stringify(this.speedSettings))
      localStorage.setItem(STORAGE_KEY_PF + VERSION, JSON.stringify(this.productivitySettings))
      logger.log('[SettingsAdapter] Saved to storage')
    } catch (e) {
      logger.warn('[SettingsAdapter] Failed to save to storage:', e)
    }
  }
}

export const settingsAdapter = new SettingsAdapter()
