/**
 * Data数据模块
 *
 * 功能：
 * - 导出配方映射和配方数据
 * - 导出物品和建筑查询函数
 * - 提供数据访问入口
 *
 * 导出数据：
 * - RecipeMap: 配方映射
 * - Recipes: 配方列表
 * - itemMap: 物品映射
 * - buildingMap: 建筑映射
 *
 * 导出函数：
 * - getRecipeIdByKey(key): 获取配方ID
 * - getRecipeCount(): 获取配方数量
 * - getItemByName/getItemByRemark: 物品查询
 * - getBuildingByName/getBuildingByItemId: 建筑查询
 *
 * 上游使用：
 * - core/services/RecipeCalculator.ts: 配方计算器
 * - core/blueprint/services/BlueprintService.ts: 蓝图服务
 *
 * 下游依赖：
 * - core/data/recipeMap.json: 配方映射数据
 * - core/data/recipes.json: 配方数据
 */
import recipeMapData from './recipeMap.json'
import recipesData from './recipes.json'

import type { IRecipeMap } from '../types/blueprint'
import type { IRawRecipe } from '../types/settings'
import { itemMap } from '../types/itemMap'
import { buildingMap, PRODUCTION_CATEGORY, BUILDING_TYPE } from '../types/buildingMap'

export { itemMap, buildingMap, PRODUCTION_CATEGORY, BUILDING_TYPE }
export const RecipeMap: IRecipeMap = recipeMapData
export const Recipes: IRawRecipe[] = recipesData as IRawRecipe[]

export { getItemByName, getItemByRemark, getItemIconId, getItemRemark } from '../types/itemMap'

export {
  getBuildingByName,
  getBuildingByItemId,
  getProductionSpeed,
  isLabBuilding,
  isSmelterBuilding
} from '../types/buildingMap'

export type { IItemInfo, IItemData, IBuildingInfo, IBuildingData } from '../types/blueprint'

export function getRecipeIdByKey(key: string) {
  return RecipeMap[key]
}

export function getRecipeCount(): number {
  return Recipes.length
}
