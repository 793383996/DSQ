/**
 * SettingsAdapter - 设置适配器
 *
 * 功能：
 * - 管理配方设置、速度设置、增产剂设置
 * - 使用 localStorage 作为主存储（独立于遗留代码）
 * - 提供类型安全的读写接口
 * - 自动同步到 localStorage
 *
 * 主要方法：
 * - init(): 初始化设置（从 localStorage 加载）
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
 *
 * 架构师注 (P4-6):
 * - 已重构为使用 localStorage 作为主存储
 * - 移除对 window.saveSetting 等遗留函数的依赖
 * - 保留 window.settings 同步以支持遗留代码过渡期
 */
import type {
  IRecipeSettings,
  ISpeedSettings,
  IProductivitySettings,
  IRecipeSetting
} from '../types/settings'
import { logger } from '../../utils/logger'
import { APP_CONFIG } from '../config/app.config'

const { VERSION, STORAGE_KEYS } = APP_CONFIG

const RECIPE_SETTINGS_KEY = STORAGE_KEYS.MACHINE_SETTINGS + VERSION
const SPEED_SETTINGS_KEY = STORAGE_KEYS.SPEED_SETTINGS + VERSION
const PF_SETTINGS_KEY = STORAGE_KEYS.PF_SETTINGS + VERSION

export class SettingsAdapter {
  private recipeSettings: IRecipeSettings = {}
  private speedSettings: ISpeedSettings = {}
  private productivitySettings: IProductivitySettings = {}
  private initialized: boolean = false

  init(): void {
    if (typeof window === 'undefined') return
    if (this.initialized) return

    this.loadFromStorage()
    this.syncToWindow()
    this.initialized = true
  }

  private syncToWindow(): void {
    if (typeof window === 'undefined') return

    window.settings = this.recipeSettings
    window.settings_time = this.speedSettings
    window.settings_pf = this.productivitySettings
  }

  private syncRecipeToWindow(key: string): void {
    if (typeof window === 'undefined') return
    window.settings[key] = this.recipeSettings[key]
  }

  private syncSpeedToWindow(key: string): void {
    if (typeof window === 'undefined') return
    window.settings_time[key] = this.speedSettings[key]
  }

  private syncPfToWindow(key: string): void {
    if (typeof window === 'undefined') return
    window.settings_pf[key] = this.productivitySettings[key]
  }

  private saveRecipeToStorage(): void {
    try {
      localStorage.setItem(RECIPE_SETTINGS_KEY, JSON.stringify(this.recipeSettings))
    } catch (e) {
      logger.warn('[SettingsAdapter] Failed to save recipe settings:', e)
    }
  }

  private saveSpeedToStorage(): void {
    try {
      localStorage.setItem(SPEED_SETTINGS_KEY, JSON.stringify(this.speedSettings))
    } catch (e) {
      logger.warn('[SettingsAdapter] Failed to save speed settings:', e)
    }
  }

  private savePfToStorage(): void {
    try {
      localStorage.setItem(PF_SETTINGS_KEY, JSON.stringify(this.productivitySettings))
    } catch (e) {
      logger.warn('[SettingsAdapter] Failed to save pf settings:', e)
    }
  }

  getRecipeSetting(recipeId: string | number): IRecipeSetting | undefined {
    const key = String(recipeId)
    return this.recipeSettings[key]
  }

  getRecipeMachine(recipeId: string | number): string | undefined {
    const key = String(recipeId)
    return this.recipeSettings[key]?.m
  }

  setRecipeMachine(recipeId: string | number, machineName: string): void {
    const key = String(recipeId)
    if (!this.recipeSettings[key]) {
      this.recipeSettings[key] = {}
    }
    this.recipeSettings[key].m = machineName
    this.syncRecipeToWindow(key)
    this.saveRecipeToStorage()
  }

  getRecipeAccType(recipeId: string | number): string | undefined {
    const key = String(recipeId)
    return this.recipeSettings[key]?.accType
  }

  setRecipeAccType(recipeId: string | number, accType: string): void {
    const key = String(recipeId)
    if (!this.recipeSettings[key]) {
      this.recipeSettings[key] = {}
    }
    this.recipeSettings[key].accType = accType
    this.syncRecipeToWindow(key)
    this.saveRecipeToStorage()
  }

  getRecipeAccValue(recipeId: string | number): string | undefined {
    const key = String(recipeId)
    return this.recipeSettings[key]?.accValue
  }

  setRecipeAccValue(recipeId: string | number, accValue: string): void {
    const key = String(recipeId)
    if (!this.recipeSettings[key]) {
      this.recipeSettings[key] = {}
    }
    this.recipeSettings[key].accValue = accValue
    this.syncRecipeToWindow(key)
    this.saveRecipeToStorage()
  }

  getAllRecipeSettings(): IRecipeSettings {
    return { ...this.recipeSettings }
  }

  getRecipeSettings(): IRecipeSettings {
    return this.recipeSettings
  }

  getSpeedSetting(machineName: string): number | undefined {
    return this.speedSettings[machineName]
  }

  setSpeedSetting(machineName: string, speed: number): void {
    this.speedSettings[machineName] = speed
    this.syncSpeedToWindow(machineName)
    this.saveSpeedToStorage()
  }

  getAllSpeedSettings(): ISpeedSettings {
    return { ...this.speedSettings }
  }

  getSpeedSettings(): ISpeedSettings {
    return this.speedSettings
  }

  getProductivitySetting(itemName: string): number | undefined {
    return this.productivitySettings[itemName]
  }

  setProductivitySetting(itemName: string, recipeIndex: number): void {
    this.productivitySettings[itemName] = recipeIndex
    this.syncPfToWindow(itemName)
    this.savePfToStorage()
  }

  getAllProductivitySettings(): IProductivitySettings {
    return { ...this.productivitySettings }
  }

  getProductivitySettings(): IProductivitySettings {
    return this.productivitySettings
  }

  getDefaultAccType(): string {
    if (typeof window !== 'undefined') {
      return (window as unknown as { defaultAccType?: string }).defaultAccType || '增产剂Mk.Ⅰ'
    }
    return '增产剂Mk.Ⅰ'
  }

  getDefaultAccValue(): string {
    if (typeof window !== 'undefined') {
      return (window as unknown as { defaultAccValue?: string }).defaultAccValue || '无'
    }
    return '无'
  }

  getSelfAcc(): boolean {
    if (typeof window !== 'undefined') {
      const win = window as unknown as { selfAcc?: { checked?: boolean } }
      return win.selfAcc?.checked ?? false
    }
    return false
  }

  getIsAddSelfAccP(): boolean {
    if (typeof window !== 'undefined') {
      const win = window as unknown as { isAddSelfAccP?: { checked?: boolean } }
      return win.isAddSelfAccP?.checked ?? false
    }
    return false
  }

  reset(): void {
    this.recipeSettings = {}
    this.speedSettings = {}
    this.productivitySettings = {}

    if (typeof window !== 'undefined') {
      window.settings = {}
      window.settings_time = {}
      window.settings_pf = {}
    }

    this.saveRecipeToStorage()
    this.saveSpeedToStorage()
    this.savePfToStorage()
  }

  loadFromStorage(): void {
    try {
      const recipeJson = localStorage.getItem(RECIPE_SETTINGS_KEY)
      if (recipeJson) {
        this.recipeSettings = JSON.parse(recipeJson)
      }

      const speedJson = localStorage.getItem(SPEED_SETTINGS_KEY)
      if (speedJson) {
        this.speedSettings = JSON.parse(speedJson)
      }

      const pfJson = localStorage.getItem(PF_SETTINGS_KEY)
      if (pfJson) {
        this.productivitySettings = JSON.parse(pfJson)
      }
    } catch (e) {
      logger.warn('[SettingsAdapter] Failed to load from storage:', e)
    }
  }

  saveToStorage(): void {
    this.saveRecipeToStorage()
    this.saveSpeedToStorage()
    this.savePfToStorage()
  }
}

declare global {
  interface Window {
    settings: IRecipeSettings
    settings_time: ISpeedSettings
    settings_pf: IProductivitySettings
    settingsLocal?: IRecipeSettings
    saveSetting?: () => void
    saveSettingTime?: () => void
    saveSettingPf?: () => void
    loadSetting?: () => void
    loadSettingTime?: () => void
    loadSettingPf?: () => void
  }
}

export const settingsAdapter = new SettingsAdapter()
