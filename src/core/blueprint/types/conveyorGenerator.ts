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
