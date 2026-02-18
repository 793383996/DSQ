/**
 * BuildingMap类型定义
 *
 * 功能：
 * - 定义建筑映射类型
 * - 提供建筑查询函数
 * - 导出建筑分类和类型常量
 *
 * 主要方法：
 * - getBuildingByName(name): 按名称获取建筑
 * - getBuildingByItemId(itemId): 按物品ID获取建筑
 * - getProductionSpeed(name): 获取生产速度
 *
 * 常量：
 * - PRODUCTION_CATEGORY: 生产分类（熔炉、制作台、化工厂等）
 * - BUILDING_TYPE: 建筑类型（生产、分拣器、传送带）
 *
 * 上游使用：
 * - core/blueprint/services/BlueprintService.ts: 蓝图服务
 * - core/services/RecipeCalculator.ts: 配方计算器
 *
 * 下游依赖：
 * - core/data/buildingMap.json: 建筑数据
 * - core/data/productionCategory.json: 生产分类数据
 * - core/data/buildingType.json: 建筑类型数据
 */
import type { IBuildingData, IBuildingInfo } from './blueprint'
import buildingMapData from '../data/buildingMap.json'
import productionCategoryData from '../data/productionCategory.json'
import buildingTypeData from '../data/buildingType.json'

export type { IBuildingInfo, IBuildingData }

export const PRODUCTION_CATEGORY = productionCategoryData as {
  smelter: number
  assembling: number
  plant: number
  refinery: number
  collider: number
  lab: number
}

export const BUILDING_TYPE = buildingTypeData as {
  production: number
  sorter: number
  conveyor: number
}

export type ProductionCategoryType = (typeof PRODUCTION_CATEGORY)[keyof typeof PRODUCTION_CATEGORY]
export type BuildingTypeType = (typeof BUILDING_TYPE)[keyof typeof BUILDING_TYPE]

export const buildingMap: Record<string, IBuildingInfo> = buildingMapData as Record<
  string,
  IBuildingInfo
>

export function getBuildingByName(name: string): IBuildingInfo | undefined {
  for (const key in buildingMap) {
    if (buildingMap[key].name === name || buildingMap[key].remark === name) {
      return buildingMap[key]
    }
  }
  return undefined
}

export function getBuildingByItemId(itemId: number): IBuildingInfo | undefined {
  for (const key in buildingMap) {
    if (buildingMap[key].itemId === itemId) {
      return buildingMap[key]
    }
  }
  return undefined
}

export function getProductionSpeed(name: string): number {
  const building = getBuildingByName(name)
  return building?.productionSpeed || 1
}

export function isLabBuilding(buildingName: string): boolean {
  const building = getBuildingByName(buildingName)
  return building?.category === PRODUCTION_CATEGORY.lab
}

export function isSmelterBuilding(buildingName: string): boolean {
  const building = getBuildingByName(buildingName)
  return building?.category === PRODUCTION_CATEGORY.smelter
}
