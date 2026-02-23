/**
 * Bridge - 遗留代码桥接模块
 *
 * 功能：
 * - 加载和初始化遗留模块（data.js）
 * - 提供遗留代码与新代码的接口适配
 * - 同步状态到遗留代码
 * - 提供配方索引就绪通知
 *
 * 主要方法：
 * - initLegacyBridge(): 初始化遗留桥接
 * - loadLegacyModules(): 加载遗留模块
 * - syncStateToLegacy(state): 同步状态到遗留代码
 * - isGameDataLoaded(): 检查游戏数据是否加载
 * - notifyRecipeIndexReady(): 通知配方索引就绪
 * - waitForRecipeIndexReady(): 等待配方索引就绪
 *
 * 上游调用：
 * - main.ts: 应用入口
 * - stores/blueprint.ts: 状态存储
 *
 * 下游依赖：
 * - core/legacy/data.js: 遗留数据模块
 * - core/adapters/RecipeAdapter.ts: 配方适配器
 * - core/adapters/SettingsAdapter.ts: 设置适配器
 * - core/adapters/BlueprintAdapter.ts: 蓝图适配器（独立加载buildingMap/itemMap）
 */
import { cocoMessageProxy } from '../composables/useToast'
import { recipeAdapter } from './adapters/RecipeAdapter'
import { settingsAdapter } from './adapters/SettingsAdapter'
import {
  generateBlueprintWithNewService,
  ILegacyRecipe,
  ILegacyBlueprintConfig,
  ILegacySubRecipe
} from './adapters/BlueprintAdapter'
import { recipeDataBuilder, IRecipeBuildResult } from './services/RecipeDataBuilder'
import { iconService } from './services/IconService'
import { logger } from '../utils/logger'
import type { LegacyWindow, ILegacyDataItem, ILegacyIcon, ILegacyGameData } from './types/legacy'
import type { IRawRecipe } from './types/settings'
import type { IConsumptionItem, IResultItemOutput } from './types/recipe'
import type { DemandItem } from '../stores/blueprint'
import { itemMap } from './types/itemMap'
import { buildingMap } from './types/buildingMap'

let dataModule: unknown = null
let pakoModule: unknown = null
let isBridgeInitialized = false
let legacyModulesPromise: Promise<unknown> | null = null
let recipeIndexReady: boolean = false
let recipeIndexReadyResolve: (() => void) | null = null
let recipeIndexReadyPromise: Promise<void> | null = null

const RECIPE_INDEX_TIMEOUT_MS = 10000

function getRecipeIndexReadyPromise(): Promise<void> {
  // P2-2修复：如果已经ready，直接返回resolved Promise
  // 避免竞态条件：notify可能在Promise创建前被调用
  if (recipeIndexReady) {
    return Promise.resolve()
  }

  if (recipeIndexReadyPromise) return recipeIndexReadyPromise

  recipeIndexReadyPromise = new Promise<void>(resolve => {
    recipeIndexReadyResolve = resolve

    const timeoutId = setTimeout(() => {
      if (!recipeIndexReady) {
        logger.warn('[bridge] Recipe index ready timeout, proceeding anyway')
        resolve()
      }
    }, RECIPE_INDEX_TIMEOUT_MS)

    const originalResolve = resolve
    recipeIndexReadyResolve = () => {
      clearTimeout(timeoutId)
      originalResolve()
    }
  })

  return recipeIndexReadyPromise
}

function getWin(): LegacyWindow {
  return window as unknown as LegacyWindow
}

export function notifyRecipeIndexReady(): void {
  if (recipeIndexReady) return
  recipeIndexReady = true
  if (recipeIndexReadyResolve) {
    recipeIndexReadyResolve()
    recipeIndexReadyResolve = null
  }
  logger.log('[bridge] Recipe index ready notification received')
}

export function isRecipeIndexReady(): boolean {
  return recipeIndexReady
}

async function loadLegacyModules() {
  if (dataModule) {
    return { data: dataModule, pako: pakoModule }
  }

  if (legacyModulesPromise) {
    return legacyModulesPromise
  }

  legacyModulesPromise = (async () => {
    const [dataMod, pakoMod, calculatorMod, storageManagerMod, recipeHelperMod, settingsHelperMod] =
      await Promise.all([
        import('./legacy/data'),
        import('pako'),
        import('./legacy/calculator'),
        import('./legacy/storageManager'),
        import('./legacy/recipeHelper'),
        import('./legacy/settingsHelper')
      ])
    dataModule = dataMod
    pakoModule = pakoMod
    getWin().pako = pakoMod

    const win = getWin()
    ;(win as any).itemMap = itemMap
    ;(win as any).buildingMap = buildingMap

    await getRecipeIndexReadyPromise()

    if (win.data && win.recipeIndexByProduct && !recipeAdapter.isLoaded()) {
      recipeAdapter.loadFromRawData(win.data as unknown as IRawRecipe[])
    }

    settingsAdapter.init()

    logger.log('[bridge] Legacy modules loaded successfully')
    return { data: dataModule, pako: pakoModule }
  })()

  return legacyModulesPromise
}

function getLegacyModulesLoadPromise(): Promise<unknown> | null {
  return legacyModulesPromise
}

export interface LegacyGlobals {
  data: unknown
  pako: unknown
}

export interface StateSyncMap {
  demandList: Array<{ name: string; num?: number; number?: number }>
  excludeList: string[]
  machineSettings?: MachineSettings
}

export interface MachineSettings {
  modeIn?: string
  furnace?: string
  chemical?: string
  accType?: string
  accValue?: string
  research?: string
  hideSource?: boolean
  selfAcc?: boolean
  isAddSelfAccP?: boolean
}

export interface BlueprintConfig {
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

export interface OutputRecipe {
  subRecipes?: unknown[]
}

export interface Recipe {
  blueprintTitle: string
  blueprintIcon: number[]
  blueprintDesc: string
}

export function initLegacyBridge(): void {
  if (isBridgeInitialized) {
    logger.log('[bridge] Already initialized, skipping')
    return
  }
  isBridgeInitialized = true

  const win = getWin()
  ;(win as any).version = '20240202'
  win.xqs = []
  win.ig_names = []
  win.icons = {}
  win.xh_list = []
  win.out_list = []
  win.items0 = []
  win.items = []
  win.totalDisplay = []
  win.xps_editor_index = -1
  win.items_editor_index = -1

  win.onlyConveyorBeltMk3 = { checked: true } as HTMLInputElement
  win.onlySorterMk3 = { checked: true } as HTMLInputElement
  win.useSorterMk4 = { checked: false } as HTMLInputElement
  win.selfAcc = { checked: false } as HTMLInputElement
  win.isAddSelfAccP = { checked: false } as HTMLInputElement
  win.generateTeslaTower = { checked: true } as HTMLInputElement
  win.teslaTowerLineInterval = { value: '1' } as HTMLInputElement
  win.conveyorBeltStackLayer = { value: '4' } as HTMLInputElement
  win.stackLayers = { value: '1' } as HTMLInputElement
  win.x_y_ratio = { value: '2' } as HTMLInputElement
  win.maxLabLayers = { value: '15' } as HTMLInputElement
  win.pointLength = { value: '1' } as HTMLInputElement
  win.hideSource = { checked: false } as HTMLInputElement
  win.txtnumber = { value: '60' } as HTMLInputElement
  win.selmaince = { value: '1' } as HTMLInputElement

  win.cocoMessage = cocoMessageProxy
  ;(win as any).notifyRecipeIndexReady = notifyRecipeIndexReady

  logger.log('[bridge] Legacy bridge initialized')
}

export interface MachineConfigSettings {
  modeIn: string
  furnace: string
  chemical: string
  accType: string
  accValue: string
  research: string
  hideSource: boolean
}

export function legacyUpdateMachineSettings(config: MachineConfigSettings): void {
  const win = getWin()
  const data = win.data || []

  if (!win.settingsLocal) win.settingsLocal = {}
  if (!win.settings) win.settings = {}

  const settingsLocal = win.settingsLocal
  const settings = win.settings

  data.forEach((item: ILegacyDataItem) => {
    if (!settingsLocal[item.id]) {
      settingsLocal[item.id] = {}
    }
    if (!settings[item.id]) {
      settings[item.id] = {}
    }

    if (item.mName === '制作台') {
      settingsLocal[item.id].m = config.modeIn
      settings[item.id].m = config.modeIn
    }
    if (item.mName === '冶炼设备') {
      settingsLocal[item.id].m = config.furnace
      settings[item.id].m = config.furnace
    }
    if (item.mName === '化工设备') {
      settingsLocal[item.id].m = config.chemical
      settings[item.id].m = config.chemical
    }
    if (item.mName === '研究站') {
      settingsLocal[item.id].m = config.research
      settings[item.id].m = config.research
    }

    settingsLocal[item.id].accType = config.accType
    settingsLocal[item.id].accValue = config.accValue
    settings[item.id].accType = config.accType
    settings[item.id].accValue = config.accValue
  })

  win.defaultAccType = config.accType
  win.defaultAccValue = config.accValue

  if (win.hideSource) {
    win.hideSource.checked = config.hideSource
  }
}

export function legacyGetMachineSettings(): MachineConfigSettings {
  const win = getWin()
  return {
    modeIn: '制作台Mk.Ⅰ',
    furnace: '电弧熔炉',
    chemical: '化工厂',
    accType: win.defaultAccType || '增产剂Mk.Ⅰ',
    accValue: win.defaultAccValue || '无',
    research: '矩阵研究站',
    hideSource: win.hideSource?.checked ?? false
  }
}

export function syncStateToLegacy(state: StateSyncMap): void {
  const win = getWin()

  win.xqs = win.xqs || []
  win.xqs.length = 0
  state.demandList.forEach(d => {
    win.xqs!.push({
      name: d.name,
      value: d.num || d.number || 1,
      number: d.num || d.number || 1,
      item: { name: d.name }
    })
  })

  win.ig_names = win.ig_names || []
  win.ig_names.length = 0
  state.excludeList.forEach(name => {
    win.ig_names!.push(name)
  })

  // P0-2修复：同步machineSettings到legacy全局变量
  if (state.machineSettings) {
    const ms = state.machineSettings
    if (ms.accType !== undefined) {
      win.defaultAccType = ms.accType
    }
    if (ms.accValue !== undefined) {
      win.defaultAccValue = ms.accValue
    }
    if (ms.hideSource !== undefined && win.hideSource) {
      win.hideSource.checked = ms.hideSource
    }
    if (ms.selfAcc !== undefined && win.selfAcc) {
      win.selfAcc.checked = ms.selfAcc
    }
    if (ms.isAddSelfAccP !== undefined && win.isAddSelfAccP) {
      win.isAddSelfAccP.checked = ms.isAddSelfAccP
    }

    // P3-1修复：只在设置不存在时才设置默认值，避免覆盖用户自定义设置
    // 用户可能在UI中为特定配方设置了不同的设备或增产剂
    if (win.data && win.settings) {
      const data = win.data as ILegacyDataItem[]
      const settings = win.settings
      data.forEach((item: ILegacyDataItem) => {
        if (!settings[item.id]) {
          settings[item.id] = {}
        }
        // 只在用户未设置设备时才设置默认设备
        if (item.mName === '制作台' && ms.modeIn !== undefined && !settings[item.id].m) {
          settings[item.id].m = ms.modeIn
        }
        if (item.mName === '冶炼设备' && ms.furnace !== undefined && !settings[item.id].m) {
          settings[item.id].m = ms.furnace
        }
        if (item.mName === '化工设备' && ms.chemical !== undefined && !settings[item.id].m) {
          settings[item.id].m = ms.chemical
        }
        if (item.mName === '研究站' && ms.research !== undefined && !settings[item.id].m) {
          settings[item.id].m = ms.research
        }
        // 只在用户未设置增产剂时才设置默认增产剂
        if (ms.accType !== undefined && !settings[item.id].accType) {
          settings[item.id].accType = ms.accType
        }
        if (ms.accValue !== undefined && !settings[item.id].accValue) {
          settings[item.id].accValue = ms.accValue
        }
      })
    }
  }
}

export function clearLegacyState(): void {
  const win = getWin()
  if (win.xh_list) win.xh_list.length = 0
  if (win.out_list) win.out_list.length = 0
  if (win.xqs) win.xqs.length = 0
  if (win.ig_names) win.ig_names.length = 0
  // P2-1修复：清空xhMap和outMap，避免状态残留导致计算错误
  // 遗留代码的calculator.js使用window.xhMap/outMap作为缓存
  if (win.xhMap) {
    Object.keys(win.xhMap).forEach(key => delete win.xhMap![key])
  }
  if (win.outMap) {
    Object.keys(win.outMap).forEach(key => delete win.outMap![key])
  }
}

export async function runCalculation(): Promise<unknown> {
  try {
    clearLegacyState()
    const win = getWin()
    if (typeof win.loadNumber === 'function') {
      return await win.loadNumber()
    }
    throw new Error('loadNumber function not found')
  } catch (error) {
    logger.error('Calculation failed:', error)
    cocoMessageProxy('计算失败，请检查配置', 'error')
    throw error
  }
}

export function legacyFind(name: string, normalize_recipe?: boolean): ILegacyDataItem | null {
  const win = getWin()
  if (typeof win.find === 'function') {
    return win.find(name, normalize_recipe)
  }
  return null
}

/**
 * @deprecated 使用 generateBlueprintFromStoreData 替代
 * 该函数依赖遗留的 window.getRecipe()，将从 DOM 读取配方数据
 * 新架构应使用 generateBlueprintFromStoreData 直接从 Store 数据生成蓝图
 */
export function getLegacyRecipe(): ILegacyRecipe | null {
  const win = getWin()
  if (typeof win.getRecipe === 'function') {
    const recipe = win.getRecipe()
    const blueprintIcon = Array.isArray(recipe.blueprintIcon)
      ? recipe.blueprintIcon.map((v: any) => (typeof v === 'number' ? v : parseInt(String(v), 10)))
      : []
    return {
      proliferator: recipe.proliferator,
      subRecipes: recipe.recipeList as ILegacySubRecipe[],
      blueprintTitle: recipe.blueprintTitle,
      blueprintIcon
    }
  }
  return null
}

/**
 * @deprecated 使用 generateBlueprintFromStoreData 替代
 * 该函数依赖遗留的 window.getRecipe()，将从 DOM 读取配方数据
 * 新架构应使用 generateBlueprintFromStoreData 直接从 Store 数据生成蓝图
 */
export function generateBlueprintWithAdapter(): { success: boolean; error?: string } {
  try {
    const recipe = getLegacyRecipe()
    if (!recipe || !recipe.subRecipes) {
      return { success: false, error: 'No recipe data available' }
    }

    const config: ILegacyBlueprintConfig = legacyGetConfigFromDOM()

    const result = generateBlueprintWithNewService(recipe, config)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    if (result.blueprintString) {
      navigator.clipboard
        .writeText(result.blueprintString)
        .then(() => {
          cocoMessageProxy('已复制到粘贴板', 'success')
        })
        .catch(err => {
          logger.error('[bridge] Failed to copy to clipboard:', err)
        })
    }

    return { success: true }
  } catch (error) {
    const err = error as Error
    logger.error('[bridge] generateBlueprintWithAdapter error:', err)
    return { success: false, error: err.message }
  }
}

type TableItem = IConsumptionItem | IResultItemOutput

export function generateBlueprintFromStoreData(
  consumptionItems: TableItem[],
  demandList: DemandItem[],
  config?: Partial<BlueprintConfig>
): { success: boolean; error?: string } {
  try {
    const recipeData = recipeDataBuilder.buildRecipeData(
      consumptionItems,
      demandList,
      getWin().defaultAccType || '增产剂Mk.Ⅰ'
    )

    const legacyRecipe: ILegacyRecipe = {
      proliferator: recipeData.proliferator || undefined,
      subRecipes: recipeData.recipeList as ILegacySubRecipe[],
      blueprintTitle: recipeData.blueprintTitle,
      blueprintIcon: recipeData.blueprintIcon
    }

    const fullConfig: ILegacyBlueprintConfig = {
      ...legacyGetConfigFromDOM(),
      ...config
    }

    const result = generateBlueprintWithNewService(legacyRecipe, fullConfig)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    if (result.blueprintString) {
      navigator.clipboard
        .writeText(result.blueprintString)
        .then(() => {
          cocoMessageProxy('已复制到粘贴板', 'success')
        })
        .catch(err => {
          logger.error('[bridge] Failed to copy to clipboard:', err)
        })
    }

    return { success: true }
  } catch (error) {
    const err = error as Error
    logger.error('[bridge] generateBlueprintFromStoreData error:', err)
    return { success: false, error: err.message }
  }
}

export function legacyGetConfigFromDOM(): BlueprintConfig {
  const win = getWin()
  return {
    maxSorterNumOneBelt: 8,
    conveyorBeltStackLayer: parseInt(win.conveyorBeltStackLayer?.value || '4'),
    x_y_ratio: parseFloat(win.x_y_ratio?.value || '2'),
    compactLayout: false,
    upgradeConveyorBelt: false,
    onlyConveyorBeltMk3: win.onlyConveyorBeltMk3?.checked ?? true,
    onlySorterMk3: win.onlySorterMk3?.checked ?? true,
    useSorterMk4: win.useSorterMk4?.checked ?? false,
    maxLabLayers: parseInt(win.maxLabLayers?.value || '15'),
    selfSpray: win.selfAcc?.checked ?? true,
    generateTeslaTower: win.generateTeslaTower?.checked ?? true,
    teslaTowerInterval: 10,
    teslaTowerLineInterval: parseInt(win.teslaTowerLineInterval?.value || '1'),
    onlyConveyorBeltMk3Downgrade: false,
    stackLayers: parseInt(win.stackLayers?.value || '1')
  }
}

export function legacyUpdateConfig(config: Partial<BlueprintConfig>): void {
  const win = getWin()
  if (config.conveyorBeltStackLayer !== undefined && win.conveyorBeltStackLayer) {
    win.conveyorBeltStackLayer.value = String(config.conveyorBeltStackLayer)
  }
  if (config.onlyConveyorBeltMk3 !== undefined && win.onlyConveyorBeltMk3) {
    win.onlyConveyorBeltMk3.checked = config.onlyConveyorBeltMk3
  }
  if (config.onlySorterMk3 !== undefined && win.onlySorterMk3) {
    win.onlySorterMk3.checked = config.onlySorterMk3
  }
  if (config.useSorterMk4 !== undefined && win.useSorterMk4) {
    win.useSorterMk4.checked = config.useSorterMk4
  }
  if (config.selfSpray !== undefined && win.selfAcc) {
    win.selfAcc.checked = config.selfSpray
  }
  if (config.generateTeslaTower !== undefined && win.generateTeslaTower) {
    win.generateTeslaTower.checked = config.generateTeslaTower
  }
  if (config.teslaTowerLineInterval !== undefined && win.teslaTowerLineInterval) {
    win.teslaTowerLineInterval.value = String(config.teslaTowerLineInterval)
  }
  if (config.stackLayers !== undefined && win.stackLayers) {
    win.stackLayers.value = String(config.stackLayers)
  }
  if (config.x_y_ratio !== undefined && win.x_y_ratio) {
    win.x_y_ratio.value = String(config.x_y_ratio)
  }
  if (config.maxLabLayers !== undefined && win.maxLabLayers) {
    win.maxLabLayers.value = String(config.maxLabLayers)
  }
}

export interface SpeedSettings {
  oreSpeed: number
  fractionatorSpeed: number
  largeMinerSpeed: number
  oilSpeed: number
  orbitalDeuterium: number
  orbitalFireIce: number
  orbitalHydrogenIce: number
  orbitalHydrogenGas: number
  criticalPhotonSpeed: number
  pointLength: number
}

export interface LogisticsSettings {
  beltType: string
  logisticStack: number
}

export function legacyUpdateSpeedSettings(speeds: SpeedSettings): void {
  const win = getWin()

  if (!win.settings_time) win.settings_time = {}
  const settingsTime = win.settings_time

  // P0-4修复：键名与老代码data.js doSpeed1函数完全对齐
  // 老代码：speed1_1 = st['轨道采集器(气态)_氢']，对应气态巨行星采集氢
  // 老代码：speed1_2 = st['轨道采集器(气态)_重氢']，对应气态巨行星采集重氢
  // 老代码：speed1_3 = st['轨道采集器(巨冰)_氢']，对应巨冰行星采集氢
  // 老代码：speed1_4 = st['轨道采集器(巨冰)_可燃冰']，对应巨冰行星采集可燃冰
  // 老代码：ore = st['采矿机_效率']
  // P9-修复：大型采矿机速度计算与老代码对齐
  // 老代码：speed = 1 * 20 * 0.01 * oreSpeed * 0.01 * largeMinerSpeed
  // 即：speed = 20 * (oreSpeed/100) * (largeMinerSpeed/100)
  settingsTime['采矿机_效率'] = speeds.oreSpeed
  settingsTime['采矿机'] = (speeds.oreSpeed / 100) * 0.5 * 6
  settingsTime['大型采矿机'] = (speeds.oreSpeed / 100) * (speeds.largeMinerSpeed / 100) * 1 * 20
  settingsTime['分馏塔'] = speeds.fractionatorSpeed
  settingsTime['原油萃取站'] = speeds.oilSpeed
  settingsTime['轨道采集器(气态)_氢'] = speeds.orbitalHydrogenGas
  settingsTime['轨道采集器(气态)_重氢'] = speeds.orbitalDeuterium
  settingsTime['轨道采集器(巨冰)_氢'] = speeds.orbitalHydrogenIce
  settingsTime['轨道采集器(巨冰)_可燃冰'] = speeds.orbitalFireIce
  settingsTime['射线接收塔'] = speeds.criticalPhotonSpeed

  if (win.pointLength) {
    win.pointLength.value = String(speeds.pointLength)
  }
}

export function legacyUpdateLogisticsSettings(logistics: LogisticsSettings): void {
  const win = getWin()
  win.logisticsSettings = {
    beltType: logistics.beltType,
    logisticStack: logistics.logisticStack
  }

  const beltSpeedMap: Record<string, number> = {
    传送带: 360,
    高速传送带: 720,
    极速传送带: 1800
  }
  win.beltSpeed = beltSpeedMap[logistics.beltType] || 1800
}

export function legacyGetLogisticsSettings(): LogisticsSettings {
  const win = getWin()
  const settings = win.logisticsSettings || ({} as { beltType?: string; logisticStack?: number })
  return {
    beltType: settings.beltType || '极速传送带',
    logisticStack: settings.logisticStack || 1
  }
}

export function legacyGetSpeedSettings(): SpeedSettings {
  const win = getWin()
  const settingsTime = win.settings_time || {}

  // P9-修复：大型采矿机速度反推逻辑
  // 写入时：settingsTime['大型采矿机'] = (oreSpeed/100) * (largeMinerSpeed/100) * 20
  // 反推：largeMinerSpeed = settingsTime['大型采矿机'] * 15 / settingsTime['采矿机']
  const oreSpeedValue = Math.round(((settingsTime['采矿机'] || 3) / 0.5 / 6) * 100)
  const largeMinerSpeedValue = Math.round(
    ((settingsTime['大型采矿机'] || 20) * 15) / (settingsTime['采矿机'] || 3)
  )

  return {
    oreSpeed: oreSpeedValue,
    fractionatorSpeed: settingsTime['分馏塔'] || 18,
    largeMinerSpeed: largeMinerSpeedValue,
    oilSpeed: settingsTime['原油萃取站'] || 4,
    // P0-4修复：从settings_time读取重氢和可燃冰的值
    // P9-修复：读取键名与写入键名对齐
    orbitalDeuterium: settingsTime['轨道采集器(气态)_重氢'] || 0.02,
    orbitalFireIce: settingsTime['轨道采集器(巨冰)_可燃冰'] || 0.5,
    orbitalHydrogenIce: settingsTime['轨道采集器(巨冰)_氢'] || 0.5,
    orbitalHydrogenGas: settingsTime['轨道采集器(气态)_氢'] || 1,
    criticalPhotonSpeed: settingsTime['射线接收塔'] || 5,
    pointLength: parseInt(win.pointLength?.value || '1')
  }
}

export function legacyGetProductionSettings(): {
  productionPerMinute: number
  machineCount: number
} {
  const win = getWin()
  return {
    productionPerMinute: parseFloat(win.txtnumber?.value || '60'),
    machineCount: parseInt(win.selmaince?.value || '1')
  }
}

export function legacySetProductionSettings(production: number, machineCount?: number): void {
  const win = getWin()
  if (win.txtnumber) {
    win.txtnumber.value = String(production)
  }
  if (machineCount !== undefined && win.selmaince) {
    win.selmaince.value = String(machineCount)
  }
}

export { loadLegacyModules, getLegacyModulesLoadPromise }

export function getSelectableItems(): string[] {
  return iconService.getSelectableItems()
}

interface ItemWithIcon {
  name: string
  icon: string
}

interface SelectableItemsResult {
  icons1: ItemWithIcon[]
  icons2: ItemWithIcon[]
}

export function getSelectableItemsWithIcons(): SelectableItemsResult {
  const data = iconService.getSelectableItemsWithIcons()
  return {
    icons1: data.icons1.map(item => ({ name: item.name, icon: item.icon })),
    icons2: data.icons2.map(item => ({ name: item.name, icon: item.icon }))
  }
}

export function getIconData(): { [key: string]: string } {
  return iconService.getIconDataMap()
}

export function getIconImg(name: string): string {
  return iconService.getIconImg(name)
}

export function getIconShow(name: string, number: string | number): string {
  return iconService.getIconShow(name, number)
}

export function isLegacyDataLoaded(): boolean {
  const win = getWin()
  return (
    typeof win.find === 'function' &&
    Array.isArray(win.data) &&
    win.recipeIndexByProduct !== undefined &&
    Object.keys(win.recipeIndexByProduct || {}).length > 0
  )
}

export function isGameDataLoaded(): boolean {
  return iconService.isLoaded()
}

export interface LegacyDataLoadResult {
  success: boolean
  retries: number
  timedOut: boolean
}

export function waitForLegacyData(
  timeout: number = 10000,
  maxRetries: number = 2
): Promise<LegacyDataLoadResult> {
  return new Promise(resolve => {
    let retries = 0
    let interval: ReturnType<typeof setInterval> | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    function cleanup(): void {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    function attempt(): void {
      if (isLegacyDataLoaded()) {
        cleanup()
        resolve({ success: true, retries, timedOut: false })
        return
      }

      const startTime = Date.now()
      const checkInterval = 50

      interval = setInterval(() => {
        if (isLegacyDataLoaded()) {
          cleanup()
          resolve({ success: true, retries, timedOut: false })
        } else if (Date.now() - startTime > timeout) {
          cleanup()
          retries++
          if (retries < maxRetries) {
            logger.warn(`[bridge] Timeout, retrying (${retries}/${maxRetries})...`)
            attempt()
          } else {
            logger.error('[bridge] Timeout waiting for legacy data after all retries')
            resolve({ success: false, retries, timedOut: true })
          }
        }
      }, checkInterval)
    }

    attempt()
  })
}
