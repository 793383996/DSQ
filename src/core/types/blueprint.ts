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
