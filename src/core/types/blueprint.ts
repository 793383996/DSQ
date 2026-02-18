/**
 * Blueprint类型定义
 *
 * 功能：
 * - 定义蓝图数据结构类型
 * - 定义建筑数据类型
 * - 定义物品映射类型
 * - 定义坐标和布局类型
 *
 * 定义：
 * - IBlueprintData: 蓝图数据
 * - IBlueprintBuilding: 蓝图建筑
 * - IBlueprintArea: 蓝图区域
 * - IBlueprintHeader: 蓝图头信息
 * - IBuildingData: 建筑数据
 * - IItemData: 物品数据
 * - ICoordinate: 坐标
 *
 * 上游使用：
 * - core/blueprint/services/BlueprintService.ts: 蓝图服务
 * - core/utils/BlueprintEncoder.ts: 蓝图编码器
 * - core/utils/BlueprintDecoder.ts: 蓝图解码器
 */
export interface IItemData {
  name: string
  iconId: number
  remark: string
  extra_rate?: number
  accelerate?: number
}

export type IItemInfo = IItemData

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

export type IBuildingInfo = IBuildingData

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
