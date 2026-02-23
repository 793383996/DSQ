/**
 * BlueprintAdapter - 蓝图适配器
 *
 * 功能：
 * - 将遗留格式的配方数据转换为新服务格式
 * - 将遗留配置转换为新服务配置
 * - 调用BlueprintService生成蓝图
 * - 独立加载buildingMap和itemMap数据（不依赖window对象）
 *
 * 主要方法：
 * - generateBlueprintWithNewService(legacyRecipe, legacyConfig): 生成蓝图
 * - convertLegacyRecipe(legacyRecipe): 转换遗留配方格式
 * - convertLegacyConfig(legacyConfig): 转换遗留配置格式
 * - isBlueprintServiceAvailable(): 检查服务是否可用
 * - validateAndGetData(): 验证并获取数据
 *
 * 上游调用：
 * - core/bridge.ts: generateBlueprintWithAdapter()
 *
 * 下游依赖：
 * - core/blueprint/services/BlueprintService.ts: 蓝图生成服务
 * - core/utils/BlueprintEncoder.ts: 蓝图编码
 * - core/data/buildingMap.json: 建筑映射数据
 * - core/data/itemMap.json: 物品映射数据
 * - utils/logger.ts: 日志记录
 */
import { encodeBlueprint } from '../utils/BlueprintEncoder'
import {
  BlueprintService,
  IBlueprintServiceConfig,
  IBlueprintGenerateOptions
} from '../blueprint/services/BlueprintService'
import type { IBlueprintData } from '../types/blueprint'
import type { ISubRecipe } from '../blueprint/types/buildingGenerator'
import { logger } from '../../utils/logger'
import buildingMapData from '../data/buildingMap.json'
import itemMapData from '../data/itemMap.json'

export interface ILegacyRecipe {
  proliferator?: string
  subRecipes: ILegacySubRecipe[]
  blueprintTitle?: string
  blueprintIcon?: number[]
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

interface IBuildingMapEntry {
  itemId: number
  modelIndex: number
  productionSpeed?: number
  category?: number
  size?: { x: number; y: number }
  transportSpeed?: number
  type?: number
}

interface IItemMapEntry {
  iconId: number
  name: string
}

interface IDataValidationResult {
  valid: boolean
  buildingMap: Record<string, IBuildingMapEntry>
  itemMap: Record<string, IItemMapEntry>
  errors: string[]
}

const REQUIRED_BUILDINGS = [
  'arcSmelter',
  'assemblingMachineMk1',
  'lab',
  'conveyorBeltMk1',
  'conveyorBeltMK3',
  'sorterMk1',
  'sorterMk3'
]

function validateBuildingMapEntry(entry: unknown, name: string): entry is IBuildingMapEntry {
  if (!entry || typeof entry !== 'object') return false
  const e = entry as Record<string, unknown>
  return typeof e.itemId === 'number' && typeof e.modelIndex === 'number'
}

function validateItemMapEntry(entry: unknown): entry is IItemMapEntry {
  if (!entry || typeof entry !== 'object') return false
  const e = entry as Record<string, unknown>
  return typeof e.iconId === 'number' && typeof e.name === 'string'
}

function validateAndGetData(): IDataValidationResult {
  const errors: string[] = []
  const buildingMap: Record<string, IBuildingMapEntry> = {}
  const itemMap: Record<string, IItemMapEntry> = {}

  const rawBuildingMap = buildingMapData as Record<string, unknown>
  let validBuildingCount = 0
  for (const [key, value] of Object.entries(rawBuildingMap)) {
    if (validateBuildingMapEntry(value, key)) {
      buildingMap[key] = value
      validBuildingCount++
    }
  }
  if (validBuildingCount === 0) {
    errors.push('buildingMap.json contains no valid entries')
    logger.error('[BlueprintAdapter] buildingMap has no valid entries')
  } else {
    const missingRequired = REQUIRED_BUILDINGS.filter(b => !buildingMap[b])
    if (missingRequired.length > 0) {
      logger.warn(`[BlueprintAdapter] Missing required buildings: ${missingRequired.join(', ')}`)
    }
  }

  const rawItemMap = itemMapData as Record<string, unknown>
  let validItemCount = 0
  for (const [key, value] of Object.entries(rawItemMap)) {
    if (validateItemMapEntry(value)) {
      itemMap[key] = value
      validItemCount++
    }
  }
  if (validItemCount === 0) {
    errors.push('itemMap.json contains no valid entries')
    logger.error('[BlueprintAdapter] itemMap has no valid entries')
  }

  return {
    valid: Object.keys(buildingMap).length > 0 && Object.keys(itemMap).length > 0,
    buildingMap,
    itemMap,
    errors
  }
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
    const validation = validateAndGetData()

    if (!validation.valid) {
      const errorMsg =
        validation.errors.length > 0 ? validation.errors.join('; ') : 'Data validation failed'
      logger.error('[BlueprintAdapter] Validation failed:', errorMsg)
      return {
        success: false,
        error: errorMsg
      }
    }

    const { buildingMap, itemMap } = validation

    if (!legacyRecipe.subRecipes || legacyRecipe.subRecipes.length === 0) {
      logger.warn('[BlueprintAdapter] No subRecipes provided')
      return {
        success: false,
        error: 'No recipes provided'
      }
    }

    const recipes = convertLegacyRecipe(legacyRecipe)
    const config = convertLegacyConfig(legacyConfig)

    logger.info('[BlueprintAdapter] Generating blueprint with config:', {
      stackLayers: config.stackLayers,
      onlyConveyorBeltMk3: config.onlyConveyorBeltMk3,
      recipeCount: recipes.length
    })

    const service = new BlueprintService(config)

    const iconId = legacyRecipe.blueprintIcon?.[0]

    const options: IBlueprintGenerateOptions = {
      recipes,
      buildingMap: buildingMap as any,
      itemMap,
      proliferator: legacyRecipe.proliferator,
      title: legacyRecipe.blueprintTitle,
      iconId
    }

    const blueprintData = service.generate(options)

    const blueprintString = encodeBlueprint(blueprintData)

    logger.info(
      '[BlueprintAdapter] Blueprint generated successfully, building count:',
      blueprintData.buildings.length
    )

    return {
      success: true,
      blueprintString,
      blueprintData
    }
  } catch (error) {
    const err = error as Error
    logger.error('[BlueprintAdapter] Generation failed:', err.message, err.stack)
    return {
      success: false,
      error: err.message || 'Unknown error'
    }
  }
}

export function isBlueprintServiceAvailable(): boolean {
  const validation = validateAndGetData()
  return validation.valid
}

export { validateAndGetData, REQUIRED_BUILDINGS }
