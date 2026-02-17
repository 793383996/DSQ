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
