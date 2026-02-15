import type { IRecipeSettings, ISpeedSettings, IProductivitySettings } from './settings'
import type { IRecipeItem, IDemandItem } from './recipe'

/**
 * 消耗项（计算中间状态）
 */
export interface IConsumptionEntry {
  name: string
  value: number
  value2?: number
  accTotal?: number
}

/**
 * 产出项（计算中间状态）
 */
export interface IProductionEntry {
  name: string
  value: number
  value2?: number
}

/**
 * 计算配置
 */
export interface ICalculationConfig {
  defaultAccType: string
  defaultAccValue: string
  maxRecursionDepth: number
  selfAccEnabled: boolean
  addSelfAccPEnabled: boolean
}

/**
 * 计算上下文接口
 *
 * 架构师注：
 * - 封装计算过程中的所有状态
 * - 替代全局变量 xh_list, out_list, xhMap, outMap, ig_names
 * - 支持遗留代码的数据结构兼容
 */
export interface ICalculationContext {
  consumption: IConsumptionEntry[]
  production: IProductionEntry[]
  consumptionMap: Map<string, number>
  productionMap: Map<string, number>
  excludes: Set<string>
  demands: IDemandItem[]
  depth: number
  maxDepth: number
  config: ICalculationConfig
  settings: IRecipeSettings
  speedSettings: ISpeedSettings
  productivitySettings: IProductivitySettings
  recipeData: IRecipeItem[]

  addConsumption(name: string, value: number): void
  addProduction(name: string, value: number): void
  getConsumption(name: string): number
  getProduction(name: string): number
  isExcluded(name: string): boolean
  enterRecursion(): boolean
  exitRecursion(): void
  reset(): void
}

/**
 * 计算结果接口
 */
export interface ICalculationResultData {
  items: unknown[]
  items2: unknown[]
  items0: unknown[]
  total: unknown[]
  totalEnergy: number
  totalSpace: number
  totalAcc: number
}

/**
 * 计算引擎接口
 */
export interface ICalculatorEngine {
  calculate(
    demands: IDemandItem[],
    excludes: string[],
    config?: Partial<ICalculationConfig>
  ): ICalculationResultData
}
