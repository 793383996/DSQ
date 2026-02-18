/**
 * CalculationContext - 计算上下文
 *
 * 功能：
 * - 管理计算过程中的状态和数据
 * - 跟踪消耗和产出
 * - 管理排除列表和需求列表
 * - 提供递归深度控制
 * - 提供计时功能
 *
 * 主要方法：
 * - addConsumption(name, value): 添加消耗
 * - addProduction(name, value): 添加产出
 * - getConsumption(name): 获取消耗值
 * - getProduction(name): 获取产出值
 * - isExcluded(name): 检查是否被排除
 * - enterRecursion()/exitRecursion(): 递归深度控制
 * - startTimer()/stopTimer(): 计时控制
 * - reset(): 重置上下文
 * - getStats(): 获取统计信息
 * - toLegacyFormat(): 转换为遗留格式
 *
 * 上游调用：
 * - core/services/CalculatorService.ts: 计算服务
 * - core/services/UpdateAllService.ts: 更新服务
 *
 * 下游依赖：
 * - core/types/calculator.ts: 计算类型定义
 * - core/types/settings.ts: 设置类型定义
 * - core/types/recipe.ts: 配方类型定义
 * - utils/logger.ts: 日志记录
 */
import type {
  ICalculationContext,
  ICalculationConfig,
  IConsumptionEntry,
  IProductionEntry
} from '../types/calculator'
import type { IRecipeSettings, ISpeedSettings, IProductivitySettings } from '../types/settings'
import type { IRecipeItem, IDemandItem } from '../types/recipe'
import { logger } from '../../utils/logger'

const DEFAULT_CONFIG: ICalculationConfig = {
  defaultAccType: '增产剂Mk.Ⅰ',
  defaultAccValue: '无',
  maxRecursionDepth: 200,
  selfAccEnabled: false,
  addSelfAccPEnabled: false
}

export class CalculationContext implements ICalculationContext {
  consumption: IConsumptionEntry[] = []
  production: IProductionEntry[] = []
  consumptionMap: Map<string, number> = new Map()
  productionMap: Map<string, number> = new Map()
  excludes: Set<string> = new Set()
  demands: IDemandItem[] = []
  depth: number = 0
  maxDepth: number = 200
  config: ICalculationConfig = { ...DEFAULT_CONFIG }
  settings: IRecipeSettings = {}
  speedSettings: ISpeedSettings = {}
  productivitySettings: IProductivitySettings = {}
  recipeData: IRecipeItem[] = []

  private startTime: number = 0
  elapsedTime: number = 0

  constructor(config?: Partial<ICalculationConfig>) {
    if (config) {
      this.config = { ...DEFAULT_CONFIG, ...config }
      this.maxDepth = this.config.maxRecursionDepth
    }
  }

  addConsumption(name: string, value: number): void {
    const current = this.consumptionMap.get(name) || 0
    const newValue = current + value
    this.consumptionMap.set(name, newValue)

    const entry = this.consumption.find(e => e.name === name)
    if (entry) {
      entry.value = newValue
    } else {
      this.consumption.push({ name, value: newValue })
    }
  }

  addProduction(name: string, value: number): void {
    const current = this.productionMap.get(name) || 0
    const newValue = current + value
    this.productionMap.set(name, newValue)

    const entry = this.production.find(e => e.name === name)
    if (entry) {
      entry.value = newValue
    } else {
      this.production.push({ name, value: newValue })
    }
  }

  getConsumption(name: string): number {
    return this.consumptionMap.get(name) || 0
  }

  getProduction(name: string): number {
    return this.productionMap.get(name) || 0
  }

  isExcluded(name: string): boolean {
    return this.excludes.has(name)
  }

  enterRecursion(): boolean {
    this.depth++
    if (this.depth > this.maxDepth) {
      logger.error(`[CalculationContext] Max recursion depth exceeded: ${this.maxDepth}`)
      return false
    }
    return true
  }

  exitRecursion(): void {
    this.depth--
  }

  setExcludes(excludes: string[]): void {
    this.excludes = new Set(excludes)
  }

  setDemands(demands: IDemandItem[]): void {
    this.demands = demands
  }

  setSettings(settings: IRecipeSettings): void {
    this.settings = settings
  }

  setSpeedSettings(speedSettings: ISpeedSettings): void {
    this.speedSettings = speedSettings
  }

  setProductivitySettings(productivitySettings: IProductivitySettings): void {
    this.productivitySettings = productivitySettings
  }

  setRecipeData(data: IRecipeItem[]): void {
    this.recipeData = data
  }

  startTimer(): void {
    this.startTime = performance.now()
  }

  stopTimer(): void {
    if (this.startTime > 0) {
      this.elapsedTime = performance.now() - this.startTime
    }
  }

  reset(): void {
    this.consumption = []
    this.production = []
    this.consumptionMap.clear()
    this.productionMap.clear()
    this.excludes.clear()
    this.demands = []
    this.depth = 0
    this.startTime = 0
    this.elapsedTime = 0
  }

  getStats(): {
    consumptionCount: number
    productionCount: number
    depth: number
    elapsedTime: number
  } {
    return {
      consumptionCount: this.consumption.length,
      productionCount: this.production.length,
      depth: this.depth,
      elapsedTime: this.elapsedTime
    }
  }

  toLegacyFormat(): {
    xh_list: IConsumptionEntry[]
    out_list: IProductionEntry[]
    ig_names: string[]
    xqs: IDemandItem[]
  } {
    return {
      xh_list: this.consumption,
      out_list: this.production,
      ig_names: Array.from(this.excludes),
      xqs: this.demands
    }
  }
}
