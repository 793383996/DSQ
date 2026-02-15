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
