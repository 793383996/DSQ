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
