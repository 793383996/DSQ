/**
 * ConveyorGenerator类型定义
 *
 * 定义：
 * - IItemSummary: 物品摘要
 * - IItemSummaryEntry: 物品摘要条目
 * - IConveyorGeneratorConfig: 传送带生成器配置
 * - IConveyorNode: 传送带节点
 * - IConveyorGenerateResult: 传送带生成结果
 * - IBeltSegment: 传送带段
 *
 * 上游使用：
 * - generators/ConveyorGenerator.ts: 传送带生成器
 * - generators/ItemSummaryCalculator.ts: 物品摘要计算器
 * - services/BlueprintService.ts: 蓝图服务
 */
import type { IBlueprintBuilding, ICoordinate } from '../../types/blueprint'
import type { ISorterMap } from './buildingGenerator'

export interface IItemSummaryEntry {
  rate: number
  inputRate?: number
  fromBuildingNum: number
  toBuildingNum: number
  needProliferator?: boolean
}

export type IItemSummary = Record<string, IItemSummaryEntry>

export interface IConveyorGeneratorConfig {
  onlyConveyorBeltMk3: boolean
  onlyConveyorBeltMk3Downgrade: boolean
  upgradeConveyorBelt: boolean
  conveyorBeltStackLayer: number
  maxSorterNumOneBelt: number
  stackLayers: number
  useSorterMk4: boolean
  onlySorterMk3: boolean
  selfSpray: boolean
}

export interface IConveyorNode {
  index: number
  localOffset: ICoordinate[]
  yaw: number[]
  itemId: number
  modelIndex: number
  outputObjIdx: number
  inputObjIdx: number
  outputToSlot: number
  inputToSlot: number
  parameters: {
    iconId?: number
    count?: string
  } | null
}

export interface IConveyorGenerateResult {
  buildings: IBlueprintBuilding[]
  conveyorStartOffsetX: number
  itemSummary: IItemSummary
}

export interface IBeltSegment {
  startPos: ICoordinate
  endPos: ICoordinate
  direction: number
  conveyorBelt: {
    itemId: number
    modelIndex: number
    transportSpeed: number
  }
  inputData: number[][]
  outputData: number[][]
  parameters: {
    iconId?: number
    count?: string
  } | null
}

export const DEFAULT_CONVEYOR_GENERATOR_CONFIG: IConveyorGeneratorConfig = {
  onlyConveyorBeltMk3: false,
  onlyConveyorBeltMk3Downgrade: false,
  upgradeConveyorBelt: true,
  conveyorBeltStackLayer: 4,
  maxSorterNumOneBelt: 8,
  stackLayers: 1,
  useSorterMk4: false,
  onlySorterMk3: false,
  selfSpray: false
}

export const CONVEYOR_BELT_MK1_SPEED = 6
export const CONVEYOR_BELT_MK2_SPEED = 12
export const CONVEYOR_BELT_MK3_SPEED = 30
export const CONVEYOR_BELT_MK3_DOWNGRADE_SPEED = 28

export const SORTER_MK1_SPEED = 1.5
export const SORTER_MK2_SPEED = 3
export const SORTER_MK3_SPEED = 6
export const SORTER_MK4_SPEED = 12
