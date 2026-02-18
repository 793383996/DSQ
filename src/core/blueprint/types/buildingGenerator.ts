/**
 * BuildingGenerator类型定义
 *
 * 定义：
 * - IBuildingGeneratorConfig: 建筑生成器配置
 * - IBuildingLayout: 建筑布局
 * - ISorterInfo: 分拣器信息
 * - ISorterMap: 分拣器映射
 * - BuildingArray: 建筑数组
 * - IOccupiedArea: 占用区域
 * - ISubRecipe: 子配方
 * - IBuildingGenerateResult: 建筑生成结果
 *
 * 上游使用：
 * - generators/building/*.ts: 各类建筑生成器
 * - generators/ConveyorGenerator.ts: 传送带生成器
 * - services/BlueprintService.ts: 蓝图服务
 */
import type { IBlueprintBuilding, ICoordinate } from '../../types/blueprint'

export interface IBuildingGeneratorConfig {
  conveyorBeltStackLayer: number
  onlyConveyorBeltMk3: boolean
  onlySorterMk3: boolean
  useSorterMk4: boolean
  selfSpray: boolean
  generateTeslaTower: boolean
  teslaTowerInterval: number
  teslaTowerLineInterval: number
  compactLayout: boolean
  maxLabLayers: number
  stackLayers: number
  upgradeConveyorBelt: boolean
  onlyConveyorBeltMk3Downgrade: boolean
}

export interface IBuildingLayout {
  x: number
  y: number
  area: number
  centerPoint: [number, number, number, number]
  yaw: number[]
}

export interface ISorterInfo {
  index: number
  rate: number
  ownerObjIdx: number
  ownerName: string
  ownerOffset: ICoordinate
  recipeID: number
}

export interface ISorterMap {
  [itemName: string]: {
    output?: ISorterInfo[]
    input?: ISorterInfo[]
  }
}

export interface IBuildingArrayEntry {
  index: number
  sorterList: number[]
}

export type BuildingArray = IBuildingArrayEntry[][]

export interface IOccupiedArea {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface IBuildingGenerateResult {
  buildings: IBlueprintBuilding[]
  sorters: ISorterMap
  buildingArray: BuildingArray
  buildingIndex: number
  sprayCoaterOffsetList: ICoordinate[]
  lastProductionBuildingType: number
}

export interface ISorterEntry {
  index: number
  rate: number
  itemName: string
  type: 'input' | 'output'
  ownerObjIdx: number
  ownerName: string
  ownerOffset: ICoordinate
  recipeID: number
}

export interface ISingleBuildingGenerateResult {
  buildings: IBlueprintBuilding[]
  sorterEntries: ISorterEntry[]
  stackedBuildingIndices: number[]
  processedBuildingCount: number
  nextBuildingIndex: number
}

export interface ISubRecipeItem {
  name: string
  rate: number
}

export interface ISubRecipe {
  input: ISubRecipeItem[] | null
  output: ISubRecipeItem[]
  building?: {
    name: string
    num: number
  }
  recipeID?: string | number
  acceleratorMode: number
}

export interface IRecipe {
  subRecipes: ISubRecipe[]
  proliferator?: string
}

export const DEFAULT_BUILDING_GENERATOR_CONFIG: IBuildingGeneratorConfig = {
  conveyorBeltStackLayer: 4,
  onlyConveyorBeltMk3: false,
  onlySorterMk3: false,
  useSorterMk4: false,
  selfSpray: false,
  generateTeslaTower: false,
  teslaTowerInterval: 10,
  teslaTowerLineInterval: 2,
  compactLayout: false,
  maxLabLayers: 4,
  stackLayers: 1,
  upgradeConveyorBelt: true,
  onlyConveyorBeltMk3Downgrade: false
}
