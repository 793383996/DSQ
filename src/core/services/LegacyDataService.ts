/**
 * LegacyDataService - 遗留代码数据隔离层
 *
 * 功能：
 * - 封装所有对遗留代码的访问
 * - 提供类型安全的API接口
 * - 消除对window全局变量的直接依赖
 * - 支持数据缓存和懒加载
 * - 提供数据就绪状态检查
 *
 * 设计原则：
 * - 单一数据源：所有遗留数据通过此服务访问
 * - 类型安全：使用TypeScript类型定义
 * - 最小变更：不修改遗留代码逻辑
 * - 向后兼容：保持现有接口行为
 *
 * 上游调用：
 * - core/bridge.ts: 遗留桥接
 * - core/services/CalculatorService.ts: 计算服务
 * - core/services/UpdateAllService.ts: 更新服务
 * - stores/blueprint.ts: 状态存储
 *
 * 下游依赖：
 * - core/legacy/data.js: 遗留数据模块（通过动态导入）
 * - core/legacy/calculator.js: 遗留计算模块（通过动态导入）
 */

import { logger } from '../../utils/logger'
import type { LegacyWindow, ILegacyDataItem } from '../types/legacy'
import type { IRawRecipe } from '../types/settings'

export interface ILegacyData {
  data: ILegacyDataItem[]
  pako: unknown
  itemMap: Record<string, unknown>
  buildingMap: Record<string, unknown>
}

export interface ILegacyState {
  xqs: Array<{ name: string; value: number; item: { name: string } }>
  ig_names: string[]
  xh_list: Array<{ name: string; value: number; value2?: number }>
  out_list: Array<{ name: string; value: number }>
  xhMap: Record<string, { name: string; value: number }>
  outMap: Record<string, { name: string; value: number }>
  settings: Record<string, { m?: string; accType?: string; accValue?: string }>
  settingsLocal: Record<string, { m?: string; accType?: string; accValue?: string }>
  settings_time: Record<string, number>
  settings_pf: Record<string, string | number>
  defaultAccType: string
  defaultAccValue: string
  hideSource: HTMLInputElement
  selfAcc: HTMLInputElement
  isAddSelfAccP: HTMLInputElement
  onlyConveyorBeltMk3: HTMLInputElement
  onlySorterMk3: HTMLInputElement
  useSorterMk4: HTMLInputElement
  generateTeslaTower: HTMLInputElement
  teslaTowerLineInterval: HTMLInputElement
  conveyorBeltStackLayer: HTMLInputElement
  stackLayers: HTMLInputElement
  x_y_ratio: HTMLInputElement
  maxLabLayers: HTMLInputElement
  pointLength: HTMLInputElement
}

export interface IRecipeIndex {
  byProduct: Record<string, number[]>
  byMaterial: Record<string, number[]>
}

export interface ILegacyFunctions {
  find: (name: string, normalize?: boolean) => ILegacyDataItem | null
  loadNumber: () => unknown
  getRecipe: () => unknown
}

class LegacyDataService {
  private static instance: LegacyDataService
  private isInitialized: boolean = false
  private initPromise: Promise<void> | null = null
  private dataCache: ILegacyData | null = null
  private stateCache: ILegacyState | null = null
  private functionsCache: ILegacyFunctions | null = null
  private recipeIndexCache: IRecipeIndex | null = null

  private constructor() {}

  static getInstance(): LegacyDataService {
    if (!this.instance) {
      this.instance = new LegacyDataService()
    }
    return this.instance
  }

  private getWin(): LegacyWindow {
    return window as unknown as LegacyWindow
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      try {
        logger.log('[LegacyDataService] Initializing...')

        const [dataMod, pakoMod] = await Promise.all([import('../legacy/data'), import('pako')])

        const win = this.getWin()

        this.dataCache = {
          data: win.data || [],
          pako: pakoMod,
          itemMap: (win as any).itemMap || {},
          buildingMap: (win as any).buildingMap || {}
        }

        this.stateCache = {
          xqs: win.xqs || [],
          ig_names: win.ig_names || [],
          xh_list: win.xh_list || [],
          out_list: win.out_list || [],
          xhMap: win.xhMap || {},
          outMap: win.outMap || {},
          settings: win.settings || {},
          settingsLocal: win.settingsLocal || {},
          settings_time: win.settings_time || {},
          settings_pf: win.settings_pf || {},
          defaultAccType: win.defaultAccType || '增产剂Mk.Ⅰ',
          defaultAccValue: win.defaultAccValue || '无',
          hideSource: win.hideSource || ({ checked: false } as HTMLInputElement),
          selfAcc: win.selfAcc || ({ checked: false } as HTMLInputElement),
          isAddSelfAccP: win.isAddSelfAccP || ({ checked: false } as HTMLInputElement),
          onlyConveyorBeltMk3: win.onlyConveyorBeltMk3 || ({ checked: true } as HTMLInputElement),
          onlySorterMk3: win.onlySorterMk3 || ({ checked: true } as HTMLInputElement),
          useSorterMk4: win.useSorterMk4 || ({ checked: false } as HTMLInputElement),
          generateTeslaTower: win.generateTeslaTower || ({ checked: true } as HTMLInputElement),
          teslaTowerLineInterval:
            win.teslaTowerLineInterval || ({ value: '1' } as HTMLInputElement),
          conveyorBeltStackLayer:
            win.conveyorBeltStackLayer || ({ value: '4' } as HTMLInputElement),
          stackLayers: win.stackLayers || ({ value: '1' } as HTMLInputElement),
          x_y_ratio: win.x_y_ratio || ({ value: '2' } as HTMLInputElement),
          maxLabLayers: win.maxLabLayers || ({ value: '15' } as HTMLInputElement),
          pointLength: win.pointLength || ({ value: '3' } as HTMLInputElement)
        }

        this.functionsCache = {
          find: typeof win.find === 'function' ? win.find.bind(win) : () => null,
          loadNumber: typeof win.loadNumber === 'function' ? win.loadNumber.bind(win) : () => null,
          getRecipe: typeof win.getRecipe === 'function' ? win.getRecipe.bind(win) : () => null
        }

        this.recipeIndexCache = {
          byProduct: win.recipeIndexByProduct || {},
          byMaterial: win.recipeIndexByMaterial || {}
        }

        this.isInitialized = true
        logger.log('[LegacyDataService] Initialized successfully')
      } catch (error) {
        logger.error('[LegacyDataService] Initialization failed:', error)
        this.reset()
        throw error
      }
    })()

    return this.initPromise
  }

  async reinitialize(): Promise<void> {
    this.reset()
    return this.initialize()
  }

  isReady(): boolean {
    return this.isInitialized
  }

  async ensureReady(): Promise<void> {
    if (!this.isReady()) {
      await this.initialize()
    }
  }

  getData(): ILegacyData {
    if (!this.dataCache) {
      throw new Error('LegacyDataService not initialized')
    }
    return this.dataCache
  }

  getState(): ILegacyState {
    if (!this.stateCache) {
      throw new Error('LegacyDataService not initialized')
    }
    return this.stateCache
  }

  getFunctions(): ILegacyFunctions {
    if (!this.functionsCache) {
      throw new Error('LegacyDataService not initialized')
    }
    return this.functionsCache
  }

  getRecipeIndex(): IRecipeIndex {
    if (!this.recipeIndexCache) {
      throw new Error('LegacyDataService not initialized')
    }
    return this.recipeIndexCache
  }

  getRecipes(): ILegacyDataItem[] {
    return this.getData().data
  }

  getPako(): unknown {
    return this.getData().pako
  }

  getItemMap(): Record<string, unknown> {
    return this.getData().itemMap
  }

  getBuildingMap(): Record<string, unknown> {
    return this.getData().buildingMap
  }

  getRecipeIndexByProduct(): Record<string, number[]> {
    return this.getRecipeIndex().byProduct
  }

  getRecipeIndexByMaterial(): Record<string, number[]> {
    return this.getRecipeIndex().byMaterial
  }

  getDemandList(): Array<{ name: string; value: number; item: { name: string } }> {
    return this.getState().xqs
  }

  getExcludeList(): string[] {
    return this.getState().ig_names
  }

  getConsumptionList(): Array<{ name: string; value: number; value2?: number }> {
    return this.getState().xh_list
  }

  getProductionList(): Array<{ name: string; value: number }> {
    return this.getState().out_list
  }

  getConsumptionMap(): Record<string, { name: string; value: number }> {
    return this.getState().xhMap
  }

  getProductionMap(): Record<string, { name: string; value: number }> {
    return this.getState().outMap
  }

  getRecipeSettings(): Record<string, { m?: string; accType?: string; accValue?: string }> {
    return this.getState().settings
  }

  getSpeedSettings(): Record<string, number> {
    return this.getState().settings_time
  }

  getProductivitySettings(): Record<string, string | number> {
    return this.getState().settings_pf
  }

  getDefaultAccType(): string {
    return this.getState().defaultAccType
  }

  getDefaultAccValue(): string {
    return this.getState().defaultAccValue
  }

  getHideSource(): boolean {
    return this.getState().hideSource.checked
  }

  getSelfAcc(): boolean {
    return this.getState().selfAcc.checked
  }

  getIsAddSelfAccP(): boolean {
    return this.getState().isAddSelfAccP.checked
  }

  getOnlyConveyorBeltMk3(): boolean {
    return this.getState().onlyConveyorBeltMk3.checked
  }

  getOnlySorterMk3(): boolean {
    return this.getState().onlySorterMk3.checked
  }

  getUseSorterMk4(): boolean {
    return this.getState().useSorterMk4.checked
  }

  getGenerateTeslaTower(): boolean {
    return this.getState().generateTeslaTower.checked
  }

  getTeslaTowerLineInterval(): number {
    return parseInt(this.getState().teslaTowerLineInterval.value || '1', 10)
  }

  getConveyorBeltStackLayer(): number {
    return parseInt(this.getState().conveyorBeltStackLayer.value || '4', 10)
  }

  getStackLayers(): number {
    return parseInt(this.getState().stackLayers.value || '1', 10)
  }

  getXYRatio(): number {
    return parseFloat(this.getState().x_y_ratio.value || '2')
  }

  getMaxLabLayers(): number {
    return parseInt(this.getState().maxLabLayers.value || '15', 10)
  }

  getPointLength(): number {
    return parseInt(this.getState().pointLength.value || '3', 10)
  }

  findItem(name: string, normalize?: boolean): ILegacyDataItem | null {
    return this.getFunctions().find(name, normalize)
  }

  async loadNumber(): Promise<unknown> {
    return this.getFunctions().loadNumber()
  }

  getRecipe(): unknown {
    return this.getFunctions().getRecipe()
  }

  setDemandList(demands: Array<{ name: string; value: number; item: { name: string } }>): void {
    const win = this.getWin()
    win.xqs = demands
    this.stateCache!.xqs = demands
  }

  setExcludeList(excludes: string[]): void {
    const win = this.getWin()
    win.ig_names = excludes
    this.stateCache!.ig_names = excludes
  }

  setDefaultAccType(type: string): void {
    const win = this.getWin()
    win.defaultAccType = type
    this.stateCache!.defaultAccType = type
  }

  setDefaultAccValue(value: string): void {
    const win = this.getWin()
    win.defaultAccValue = value
    this.stateCache!.defaultAccValue = value
  }

  setHideSource(hide: boolean): void {
    const win = this.getWin()
    if (win.hideSource) {
      win.hideSource.checked = hide
      this.stateCache!.hideSource.checked = hide
    }
  }

  setSelfAcc(selfAcc: boolean): void {
    const win = this.getWin()
    if (win.selfAcc) {
      win.selfAcc.checked = selfAcc
      this.stateCache!.selfAcc.checked = selfAcc
    }
  }

  setIsAddSelfAccP(isAddSelfAccP: boolean): void {
    const win = this.getWin()
    if (win.isAddSelfAccP) {
      win.isAddSelfAccP.checked = isAddSelfAccP
      this.stateCache!.isAddSelfAccP.checked = isAddSelfAccP
    }
  }

  clearCalculationState(): void {
    const win = this.getWin()

    if (win.xh_list) {
      win.xh_list.length = 0
      this.stateCache!.xh_list = []
    }

    if (win.out_list) {
      win.out_list.length = 0
      this.stateCache!.out_list = []
    }

    if (win.xhMap) {
      Object.keys(win.xhMap).forEach(key => delete win.xhMap![key])
      this.stateCache!.xhMap = {}
    }

    if (win.outMap) {
      Object.keys(win.outMap).forEach(key => delete win.outMap![key])
      this.stateCache!.outMap = {}
    }
  }

  checkDataReady(): { ready: boolean; reason?: string } {
    const win = this.getWin()

    if (!Array.isArray(win.data) || win.data.length === 0) {
      return { ready: false, reason: 'Recipe data not loaded' }
    }

    if (!win.recipeIndexByProduct || Object.keys(win.recipeIndexByProduct).length === 0) {
      return { ready: false, reason: 'Recipe index not built' }
    }

    if (typeof win.find !== 'function') {
      return { ready: false, reason: 'Recipe find function not available' }
    }

    return { ready: true }
  }

  reset(): void {
    this.isInitialized = false
    this.initPromise = null
    this.dataCache = null
    this.stateCache = null
    this.functionsCache = null
    this.recipeIndexCache = null
    logger.log('[LegacyDataService] Reset')
  }
}

export const legacyDataService = LegacyDataService.getInstance()
