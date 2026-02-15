import { encodeBlueprint } from '../utils/BlueprintEncoder'
import {
  BlueprintService,
  IBlueprintServiceConfig,
  IBlueprintGenerateOptions
} from '../blueprint/services/BlueprintService'
import type { IBlueprintData } from '../types/blueprint'
import type { ISubRecipe } from '../blueprint/types/buildingGenerator'

export interface ILegacyRecipe {
  proliferator?: string
  subRecipes: ILegacySubRecipe[]
}

export interface ILegacySubRecipe {
  building?: {
    name: string
    num: number
  } | null
  output?: Array<{ name: string; rate: number }>
  input?: Array<{ name: string; rate: number }> | null
  acceleratorMode: number
  recipeID?: string | number
}

export interface ILegacyBlueprintConfig {
  maxSorterNumOneBelt: number
  conveyorBeltStackLayer: number
  x_y_ratio: number
  compactLayout: boolean
  upgradeConveyorBelt: boolean
  onlyConveyorBeltMk3: boolean
  onlySorterMk3: boolean
  useSorterMk4: boolean
  maxLabLayers: number
  selfSpray: boolean
  generateTeslaTower: boolean
  teslaTowerInterval: number
  teslaTowerLineInterval: number
  onlyConveyorBeltMk3Downgrade: boolean
  stackLayers: number
}

export interface IBlueprintGenerateResult {
  success: boolean
  blueprintString?: string
  blueprintData?: IBlueprintData
  error?: string
}

function getBuildingMap(): Record<
  string,
  {
    itemId: number
    modelIndex: number
    productionSpeed?: number
    category?: number
    size?: { x: number; y: number }
    transportSpeed?: number
    type?: number
  }
> {
  const win = window as any
  if (!win.buildingMap) {
    return {}
  }
  return win.buildingMap
}

function getItemMap(): Record<string, { iconId: number; name: string }> {
  const win = window as any
  if (!win.itemMap) {
    return {}
  }
  return win.itemMap
}

export function convertLegacyRecipe(legacyRecipe: ILegacyRecipe): ISubRecipe[] {
  if (!legacyRecipe.subRecipes) {
    return []
  }

  return legacyRecipe.subRecipes.map((sub, index) => ({
    building: sub.building || undefined,
    output: sub.output || [],
    input: sub.input || undefined,
    acceleratorMode: sub.acceleratorMode,
    recipeID: sub.recipeID
  })) as ISubRecipe[]
}

export function convertLegacyConfig(
  legacyConfig: ILegacyBlueprintConfig
): Partial<IBlueprintServiceConfig> {
  return {
    conveyorBeltStackLayer: legacyConfig.conveyorBeltStackLayer,
    onlyConveyorBeltMk3: legacyConfig.onlyConveyorBeltMk3,
    onlySorterMk3: legacyConfig.onlySorterMk3,
    useSorterMk4: legacyConfig.useSorterMk4,
    selfSpray: legacyConfig.selfSpray,
    generateTeslaTower: legacyConfig.generateTeslaTower,
    teslaTowerInterval: legacyConfig.teslaTowerInterval,
    teslaTowerLineInterval: legacyConfig.teslaTowerLineInterval,
    compactLayout: legacyConfig.compactLayout,
    maxLabLayers: legacyConfig.maxLabLayers,
    stackLayers: legacyConfig.stackLayers,
    upgradeConveyorBelt: legacyConfig.upgradeConveyorBelt,
    onlyConveyorBeltMk3Downgrade: legacyConfig.onlyConveyorBeltMk3Downgrade,
    xYRatio: legacyConfig.x_y_ratio,
    extraRate: 1.25
  }
}

export function generateBlueprintWithNewService(
  legacyRecipe: ILegacyRecipe,
  legacyConfig: ILegacyBlueprintConfig
): IBlueprintGenerateResult {
  try {
    const buildingMap = getBuildingMap()
    const itemMap = getItemMap()

    if (Object.keys(buildingMap).length === 0) {
      return {
        success: false,
        error: 'buildingMap not loaded'
      }
    }

    const recipes = convertLegacyRecipe(legacyRecipe)
    const config = convertLegacyConfig(legacyConfig)

    const service = new BlueprintService(config)

    const options: IBlueprintGenerateOptions = {
      recipes,
      buildingMap: buildingMap as any,
      itemMap,
      proliferator: legacyRecipe.proliferator
    }

    const blueprintData = service.generate(options)

    const blueprintString = encodeBlueprint(blueprintData)

    return {
      success: true,
      blueprintString,
      blueprintData
    }
  } catch (error) {
    const err = error as Error
    return {
      success: false,
      error: err.message || 'Unknown error'
    }
  }
}

export function isBlueprintServiceAvailable(): boolean {
  const buildingMap = getBuildingMap()
  const itemMap = getItemMap()
  return Object.keys(buildingMap).length > 0 && Object.keys(itemMap).length > 0
}
