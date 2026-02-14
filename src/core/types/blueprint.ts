export interface IItemData {
  name: string
  iconId: number
  remark: string
  extra_rate?: number
  accelerate?: number
}

export interface IItemMap {
  [key: string]: IItemData
}

export interface IBuildingSize {
  x: number
  y: number
}

export interface IBuildingData {
  name: string
  itemId: number
  modelIndex: number
  remark: string
  productionSpeed?: number
  sortingSpeed?: number
  transportSpeed?: number
  powerDistribution?: number
  type?: number
  category?: number
  size?: IBuildingSize
  height?: number
  slotMaxIndex?: number
}

export interface IBuildingMap {
  [key: string]: IBuildingData
}

export interface IRecipeMap {
  [key: string]: number
}

export interface IProductionCategory {
  [key: string]: number
}

export interface IBuildingType {
  [key: string]: number
}

export interface ICoordinate {
  x: number
  y: number
  z: number
}

export interface IBlueprintArea {
  index: number
  parentIndex: number
  tropicAnchor: number
  areaSegments: number
  anchorLocalOffset: { x: number; y: number }
  size: { x: number; y: number }
}

export interface IBlueprintBuilding {
  index: number
  areaIndex?: number
  localOffset: ICoordinate[] | null
  yaw: number[]
  itemId: number
  modelIndex?: number
  outputObjIdx: number
  inputObjIdx: number
  outputToSlot: number
  inputFromSlot: number
  outputFromSlot: number
  inputToSlot: number
  outputOffset: number
  inputOffset: number
  recipeId: number
  filterId: number
  parameters: unknown
}

export interface IBlueprintHeader {
  layout: number
  icons: number[]
  time: Date
  gameVersion: string
  shortDesc: string
  desc: string
}

export interface IBlueprintData {
  version: number
  cursorOffset: { x: number; y: number }
  cursorTargetArea: number
  dragBoxSize: { x: number; y: number }
  primaryAreaIdx: number
  areas: IBlueprintArea[]
  buildings: IBlueprintBuilding[]
  header: IBlueprintHeader
}
