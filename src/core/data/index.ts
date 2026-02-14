import itemMap from './itemMap.json'
import buildingMap from './buildingMap.json'
import recipeMap from './recipeMap.json'
import productionCategory from './productionCategory.json'
import buildingType from './buildingType.json'
import recipes from './recipes.json'

import type {
  IItemMap,
  IBuildingMap,
  IRecipeMap,
  IProductionCategory,
  IBuildingType
} from '../types/blueprint'
import type { IRawRecipe } from '../types/settings'

export const ItemMap: IItemMap = itemMap
export const BuildingMap: IBuildingMap = buildingMap
export const RecipeMap: IRecipeMap = recipeMap
export const ProductionCategory: IProductionCategory = productionCategory
export const BuildingType: IBuildingType = buildingType
export const Recipes: IRawRecipe[] = recipes as IRawRecipe[]

export function getItemByName(name: string) {
  return ItemMap[name]
}

export function getBuildingByName(name: string) {
  return BuildingMap[name]
}

export function getRecipeIdByKey(key: string) {
  return RecipeMap[key]
}

export function getRecipeCount(): number {
  return Recipes.length
}
