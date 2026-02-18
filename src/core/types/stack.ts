/**
 * Stack类型定义
 *
 * 功能：
 * - 定义建筑堆叠配置类型
 * - 定义克隆过滤器和结果类型
 * - 定义索引重映射规则类型
 * - 定义物品汇总类型
 *
 * 定义：
 * - IStackConfig: 堆叠配置
 * - ICloneFilter: 克隆过滤器
 * - ICloneResult: 克隆结果
 * - IIndexRemapRule: 索引重映射规则
 * - ISubRecipeBuilding: 子配方建筑
 * - IItemSummary: 物品汇总
 * - ISorterInfo: 分拣器信息
 *
 * 上游使用：
 * - core/blueprint/services/StackService.ts: 堆叠服务
 * - core/blueprint/services/BlueprintService.ts: 蓝图服务
 */
import type { IBlueprintBuilding } from './blueprint'

export interface IStackConfig {
  stackLayers: number
  maxLabLayers: number
  maxSorterNumOneBelt: number
  zStep: number
}

export interface ICloneFilter {
  labItemIds: Set<number>
  beltItemIds: Set<number>
  sprayCoaterItemId: number
  labIndices: Set<number>
}

export interface ICloneResult {
  buildings: IBlueprintBuilding[]
  foundations: IBlueprintBuilding[]
  indexMap: Map<number, Map<number, number>>
}

export interface IIndexRemapRule {
  type: 'output' | 'input'
  baseIndex: number
  cloneIndex: number
  targetIndex: number
  layer: number
}

export interface ISubRecipeBuilding {
  name: string
  num: number
}

export interface ISubRecipe {
  building?: ISubRecipeBuilding
}

export interface IItemSummaryEntry {
  rate: number
  inputRate?: number
}

export type IItemSummary = Record<string, IItemSummaryEntry>

export interface ISorterInfo {
  rate: number
}

export interface ISorterMap {
  [itemName: string]: {
    output?: ISorterInfo[]
    input?: ISorterInfo[]
  }
}

export const DEFAULT_STACK_CONFIG: IStackConfig = {
  stackLayers: 1,
  maxLabLayers: 4,
  maxSorterNumOneBelt: 8,
  zStep: 10
}

export const BELT_ITEM_IDS = new Set([2001, 2002, 2003])

export const Z_STEP = 10
