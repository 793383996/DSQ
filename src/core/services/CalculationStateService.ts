/**
 * CalculationStateService - 计算状态服务
 *
 * 功能：
 * - 统一管理计算过程中的所有状态
 * - 提供状态同步到遗留代码的接口
 * - 提供状态同步到Worker的接口
 * - 支持状态快照和验证
 *
 * 状态类型：
 * - demands: 需求列表
 * - excludes: 排除列表
 * - settings: 配方设置
 * - speedSettings: 速度设置
 * - productivitySettings: 增产剂设置
 * - machineSettings: 机器设置
 *
 * 上游调用：
 * - stores/blueprint.ts: Pinia状态存储
 * - core/services/CalculatorService.ts: 计算服务
 *
 * 下游依赖：
 * - core/bridge.ts: 遗留代码桥接
 * - core/workers/CalculatorWorkerService.ts: Worker服务
 *
 * 架构师注：
 * - 此服务作为单一状态源，简化状态同步链路
 * - 替代分散在多个模块中的状态同步逻辑
 * - 支持状态版本控制，便于检测状态变更
 */
import { logger } from '../../utils/logger'
import type { IRecipeSettings, ISpeedSettings, IProductivitySettings } from '../types/settings'

export interface IDemand {
  name: string
  num: number
}

export interface IMachineSettings {
  modeIn?: string
  furnace?: string
  chemical?: string
  accType?: string
  accValue?: string
  research?: string
  hideSource?: boolean
  selfAcc?: boolean
  isAddSelfAccP?: boolean
}

export interface ICalculationState {
  demands: IDemand[]
  excludes: string[]
  settings: IRecipeSettings
  speedSettings: ISpeedSettings
  productivitySettings: IProductivitySettings
  machineSettings: IMachineSettings
  defaultAccType: string
  defaultAccValue: string
}

export interface IStateVersion {
  version: number
  timestamp: number
  hash: string
}

type StateChangeListener = (state: ICalculationState, version: number) => void

class CalculationStateService {
  private state: ICalculationState = {
    demands: [],
    excludes: [],
    settings: {},
    speedSettings: {},
    productivitySettings: {},
    machineSettings: {},
    defaultAccType: '增产剂Mk.Ⅰ',
    defaultAccValue: '无'
  }

  private version: number = 0
  private listeners: Set<StateChangeListener> = new Set()
  private syncToLegacyEnabled: boolean = false
  private syncToWorkerEnabled: boolean = false

  private computeHash(): string {
    const stateStr = JSON.stringify({
      demands: this.state.demands,
      excludes: this.state.excludes,
      settingsKeys: Object.keys(this.state.settings).length,
      speedSettingsKeys: Object.keys(this.state.speedSettings).length,
      productivitySettingsKeys: Object.keys(this.state.productivitySettings).length
    })
    let hash = 0
    for (let i = 0; i < stateStr.length; i++) {
      const char = stateStr.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return hash.toString(16)
  }

  setDemands(demands: IDemand[]): void {
    this.state.demands = demands.map(d => ({ name: d.name, num: d.num || 1 }))
    this.incrementVersion()
  }

  getDemands(): IDemand[] {
    return [...this.state.demands]
  }

  setExcludes(excludes: string[]): void {
    this.state.excludes = [...excludes]
    this.incrementVersion()
  }

  getExcludes(): string[] {
    return [...this.state.excludes]
  }

  setSettings(settings: IRecipeSettings): void {
    this.state.settings = { ...settings }
    this.incrementVersion()
  }

  getSettings(): IRecipeSettings {
    return { ...this.state.settings }
  }

  setSpeedSettings(speedSettings: ISpeedSettings): void {
    this.state.speedSettings = { ...speedSettings }
    this.incrementVersion()
  }

  getSpeedSettings(): ISpeedSettings {
    return { ...this.state.speedSettings }
  }

  setProductivitySettings(productivitySettings: IProductivitySettings): void {
    this.state.productivitySettings = { ...productivitySettings }
    this.incrementVersion()
  }

  getProductivitySettings(): IProductivitySettings {
    return { ...this.state.productivitySettings }
  }

  setMachineSettings(machineSettings: IMachineSettings): void {
    this.state.machineSettings = { ...machineSettings }
    if (machineSettings.accType) {
      this.state.defaultAccType = machineSettings.accType
    }
    if (machineSettings.accValue) {
      this.state.defaultAccValue = machineSettings.accValue
    }
    this.incrementVersion()
  }

  getMachineSettings(): IMachineSettings {
    return { ...this.state.machineSettings }
  }

  setDefaultAccType(accType: string): void {
    this.state.defaultAccType = accType
    this.incrementVersion()
  }

  getDefaultAccType(): string {
    return this.state.defaultAccType
  }

  setDefaultAccValue(accValue: string): void {
    this.state.defaultAccValue = accValue
    this.incrementVersion()
  }

  getDefaultAccValue(): string {
    return this.state.defaultAccValue
  }

  setState(newState: Partial<ICalculationState>): void {
    if (newState.demands !== undefined) {
      this.state.demands = newState.demands.map(d => ({ name: d.name, num: d.num || 1 }))
    }
    if (newState.excludes !== undefined) {
      this.state.excludes = [...newState.excludes]
    }
    if (newState.settings !== undefined) {
      this.state.settings = { ...newState.settings }
    }
    if (newState.speedSettings !== undefined) {
      this.state.speedSettings = { ...newState.speedSettings }
    }
    if (newState.productivitySettings !== undefined) {
      this.state.productivitySettings = { ...newState.productivitySettings }
    }
    if (newState.machineSettings !== undefined) {
      this.state.machineSettings = { ...newState.machineSettings }
    }
    if (newState.defaultAccType !== undefined) {
      this.state.defaultAccType = newState.defaultAccType
    }
    if (newState.defaultAccValue !== undefined) {
      this.state.defaultAccValue = newState.defaultAccValue
    }
    this.incrementVersion()
  }

  getState(): ICalculationState {
    return {
      demands: [...this.state.demands],
      excludes: [...this.state.excludes],
      settings: { ...this.state.settings },
      speedSettings: { ...this.state.speedSettings },
      productivitySettings: { ...this.state.productivitySettings },
      machineSettings: { ...this.state.machineSettings },
      defaultAccType: this.state.defaultAccType,
      defaultAccValue: this.state.defaultAccValue
    }
  }

  getVersion(): IStateVersion {
    return {
      version: this.version,
      timestamp: Date.now(),
      hash: this.computeHash()
    }
  }

  private incrementVersion(): void {
    this.version++
    this.notifyListeners()
  }

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    const currentState = this.getState()
    const currentVersion = this.version
    this.listeners.forEach(listener => {
      try {
        listener(currentState, currentVersion)
      } catch (e) {
        logger.warn('[CalculationStateService] Listener error:', e)
      }
    })
  }

  enableSyncToLegacy(enabled: boolean = true): void {
    this.syncToLegacyEnabled = enabled
    if (enabled) {
      this.syncToLegacy()
    }
  }

  enableSyncToWorker(enabled: boolean = true): void {
    this.syncToWorkerEnabled = enabled
  }

  syncToLegacy(): void {
    if (!this.syncToLegacyEnabled) return

    if (typeof window === 'undefined') return

    const win = window as unknown as {
      xqs?: Array<{ name: string; value: number; number: number; item: { name: string } }>
      ig_names?: string[]
      settings?: IRecipeSettings
      settings_time?: ISpeedSettings
      settings_pf?: IProductivitySettings
      defaultAccType?: string
      defaultAccValue?: string
      hideSource?: { checked: boolean }
      selfAcc?: { checked: boolean }
      isAddSelfAccP?: { checked: boolean }
    }

    win.xqs = win.xqs || []
    win.xqs.length = 0
    this.state.demands.forEach(d => {
      win.xqs!.push({
        name: d.name,
        value: d.num,
        number: d.num,
        item: { name: d.name }
      })
    })

    win.ig_names = win.ig_names || []
    win.ig_names.length = 0
    this.state.excludes.forEach(name => {
      win.ig_names!.push(name)
    })

    win.settings = { ...this.state.settings }
    win.settings_time = { ...this.state.speedSettings }
    win.settings_pf = { ...this.state.productivitySettings }
    win.defaultAccType = this.state.defaultAccType
    win.defaultAccValue = this.state.defaultAccValue

    if (win.hideSource) {
      win.hideSource.checked = this.state.machineSettings.hideSource ?? false
    }
    if (win.selfAcc) {
      win.selfAcc.checked = this.state.machineSettings.selfAcc ?? false
    }
    if (win.isAddSelfAccP) {
      win.isAddSelfAccP.checked = this.state.machineSettings.isAddSelfAccP ?? false
    }

    logger.log('[CalculationStateService] State synced to legacy')
  }

  clear(): void {
    this.state = {
      demands: [],
      excludes: [],
      settings: {},
      speedSettings: {},
      productivitySettings: {},
      machineSettings: {},
      defaultAccType: '增产剂Mk.Ⅰ',
      defaultAccValue: '无'
    }
    this.version = 0
    this.incrementVersion()
    logger.log('[CalculationStateService] State cleared')
  }

  validateState(expectedVersion: number): boolean {
    return this.version === expectedVersion
  }

  isStateChangedSince(version: number): boolean {
    return this.version !== version
  }
}

export const calculationStateService = new CalculationStateService()
