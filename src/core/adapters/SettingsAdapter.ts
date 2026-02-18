/**
 * SettingsAdapter - 设置适配器
 *
 * 功能：
 * - 管理配方设置、速度设置、增产剂设置
 * - 封装对window.settings/settings_time/settings_pf的访问
 * - 提供类型安全的读写接口
 * - 自动同步到localStorage
 *
 * 主要方法：
 * - init(): 初始化设置（从遗留代码加载）
 * - getRecipeSetting(recipeId): 获取配方设置
 * - getRecipeMachine(recipeId): 获取配方选中的机器
 * - setRecipeMachine(recipeId, machineName): 设置配方机器
 * - getSpeedSetting(machineName): 获取机器速度
 * - setSpeedSetting(machineName, speed): 设置机器速度
 * - getProductivitySetting(itemName): 获取增产剂设置
 * - loadFromStorage(): 从localStorage加载
 * - saveToStorage(): 保存到localStorage
 *
 * 上游调用：
 * - core/bridge.ts: 初始化设置
 * - core/services/CalculatorService.ts: 获取配方设置
 * - components/ConfigPanel.vue: 保存设置
 *
 * 下游依赖：
 * - core/types/settings.ts: 设置类型定义
 * - core/config/app.config.ts: 应用配置
 * - utils/logger.ts: 日志记录
 *
 * 设置类型：
 * - settings: 配方级设置，key为配方ID
 * - settings_time: 机器速度设置，key为机器名称
 * - settings_pf: 增产剂设置，key为物品名称
 */
import type {
  IRecipeSettings,
  ISpeedSettings,
  IProductivitySettings,
  IRecipeSetting
} from '../types/settings'
import { logger } from '../../utils/logger'
import { APP_CONFIG } from '../config/app.config'

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
  }
}

const { VERSION, STORAGE_KEYS } = APP_CONFIG

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
   *
   * 架构师注：
   * - 必须确保内部引用指向window对象上的同一个对象
   * - 如果window对象上没有设置，从localStorage加载
   * - 避免双重存储导致的状态不同步
   */
  init(): void {
    if (typeof window === 'undefined') return

    if (!window.settings) {
      window.settings = {}
    }
    if (!window.settings_time) {
      window.settings_time = {}
    }
    if (!window.settings_pf) {
      window.settings_pf = {}
    }

    this.recipeSettings = window.settings
    this.speedSettings = window.settings_time
    this.productivitySettings = window.settings_pf

    logger.log('[SettingsAdapter] Initialized')
  }

  /**
   * 获取配方设置
   * P1-1修复：支持数字和字符串key，遗留代码使用数字key
   */
  getRecipeSetting(recipeId: string | number): IRecipeSetting | undefined {
    // JavaScript对象key会自动转换为字符串，但显式处理更安全
    const key = String(recipeId)
    return this.recipeSettings[key]
  }

  /**
   * 获取配方选中的机器
   */
  getRecipeMachine(recipeId: string | number): string | undefined {
    const key = String(recipeId)
    return this.recipeSettings[key]?.m
  }

  /**
   * 设置配方选中的机器
   */
  setRecipeMachine(recipeId: string | number, machineName: string): void {
    const key = String(recipeId)
    if (!this.recipeSettings[key]) {
      this.recipeSettings[key] = {}
    }
    this.recipeSettings[key].m = machineName
    if (typeof window !== 'undefined') {
      window.settings[key] = this.recipeSettings[key]
      if (typeof window.saveSetting === 'function') {
        window.saveSetting()
      }
    }
  }

  /**
   * 获取配方增产剂类型
   */
  getRecipeAccType(recipeId: string | number): string | undefined {
    const key = String(recipeId)
    return this.recipeSettings[key]?.accType
  }

  /**
   * 设置配方增产剂类型
   */
  setRecipeAccType(recipeId: string | number, accType: string): void {
    const key = String(recipeId)
    if (!this.recipeSettings[key]) {
      this.recipeSettings[key] = {}
    }
    this.recipeSettings[key].accType = accType
    if (typeof window !== 'undefined') {
      window.settings[key] = this.recipeSettings[key]
      if (typeof window.saveSetting === 'function') {
        window.saveSetting()
      }
    }
  }

  /**
   * 获取配方增产剂效果
   */
  getRecipeAccValue(recipeId: string | number): string | undefined {
    const key = String(recipeId)
    return this.recipeSettings[key]?.accValue
  }

  /**
   * 设置配方增产剂效果
   */
  setRecipeAccValue(recipeId: string | number, accValue: string): void {
    const key = String(recipeId)
    if (!this.recipeSettings[key]) {
      this.recipeSettings[key] = {}
    }
    this.recipeSettings[key].accValue = accValue
    if (typeof window !== 'undefined') {
      window.settings[key] = this.recipeSettings[key]
      if (typeof window.saveSetting === 'function') {
        window.saveSetting()
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
      const recipeJson = localStorage.getItem(STORAGE_KEYS.MACHINE_SETTINGS + VERSION)
      if (recipeJson) {
        this.recipeSettings = JSON.parse(recipeJson)
      }

      const speedJson = localStorage.getItem(STORAGE_KEYS.SPEED_SETTINGS + VERSION)
      if (speedJson) {
        this.speedSettings = JSON.parse(speedJson)
      }

      const pfJson = localStorage.getItem(STORAGE_KEYS.PF_SETTINGS + VERSION)
      if (pfJson) {
        this.productivitySettings = JSON.parse(pfJson)
      }

      logger.log('[SettingsAdapter] Loaded from storage')
    } catch (e) {
      logger.warn('[SettingsAdapter] Failed to load from storage:', e)
    }
  }

  saveToStorage(): void {
    try {
      localStorage.setItem(
        STORAGE_KEYS.MACHINE_SETTINGS + VERSION,
        JSON.stringify(this.recipeSettings)
      )
      localStorage.setItem(
        STORAGE_KEYS.SPEED_SETTINGS + VERSION,
        JSON.stringify(this.speedSettings)
      )
      localStorage.setItem(
        STORAGE_KEYS.PF_SETTINGS + VERSION,
        JSON.stringify(this.productivitySettings)
      )
      logger.log('[SettingsAdapter] Saved to storage')
    } catch (e) {
      logger.warn('[SettingsAdapter] Failed to save to storage:', e)
    }
  }
}

export const settingsAdapter = new SettingsAdapter()
