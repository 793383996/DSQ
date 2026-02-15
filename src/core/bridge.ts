import { cocoMessageProxy } from '../composables/useToast'
import { recipeAdapter } from './adapters/RecipeAdapter'
import { settingsAdapter } from './adapters/SettingsAdapter'
import {
  generateBlueprintWithNewService,
  isBlueprintServiceAvailable,
  ILegacyRecipe,
  ILegacyBlueprintConfig,
  ILegacySubRecipe
} from './adapters/BlueprintAdapter'
import { logger } from '../utils/logger'
import type { LegacyWindow, ILegacyDataItem, ILegacyIcon, ILegacyGameData } from './types/legacy'
import type { IRawRecipe } from './types/settings'
import { itemMap } from './types/itemMap'

let dataModule: unknown = null
let blueprintModule: unknown = null
let pakoModule: unknown = null
let isBridgeInitialized = false
let legacyModulesPromise: Promise<unknown> | null = null

function getWin(): LegacyWindow {
  return window as unknown as LegacyWindow
}

async function loadLegacyModules() {
  if (dataModule) {
    return { data: dataModule, blueprint: blueprintModule, pako: pakoModule }
  }

  if (legacyModulesPromise) {
    return legacyModulesPromise
  }

  legacyModulesPromise = (async () => {
    const [
      dataMod,
      blueprintMod,
      pakoMod,
      calculatorMod,
      iconLoaderMod,
      storageManagerMod,
      recipeHelperMod,
      configDataMod,
      settingsHelperMod,
      calculatorEngineMod
    ] = await Promise.all([
      import('./legacy/data'),
      import('./legacy/blueprint'),
      import('pako'),
      import('./legacy/calculator'),
      import('./legacy/iconLoader'),
      import('./legacy/storageManager'),
      import('./legacy/recipeHelper'),
      import('./legacy/configData'),
      import('./legacy/settingsHelper'),
      import('./legacy/calculatorEngine')
    ])
    dataModule = dataMod
    blueprintModule = blueprintMod
    pakoModule = pakoMod
    getWin().pako = pakoMod

    const win = getWin()
    ;(win as any).itemMap = itemMap

    if (win.data && !recipeAdapter.isLoaded()) {
      recipeAdapter.loadFromRawData(win.data as unknown as IRawRecipe[])
    }

    settingsAdapter.init()

    logger.log('[bridge] Legacy modules loaded successfully')
    return { data: dataModule, blueprint: blueprintModule, pako: pakoModule }
  })()

  return legacyModulesPromise
}

function getLegacyModulesLoadPromise(): Promise<unknown> | null {
  return legacyModulesPromise
}

export interface LegacyGlobals {
  data: unknown
  blueprint: unknown
  pako: unknown
}

export interface StateSyncMap {
  demandList: Array<{ name: string; num?: number; number?: number }>
  excludeList: string[]
  machineSettings: MachineSettings
}

export interface MachineSettings {
  modeIn: string
  furnace: string
  chemical: string
  accType: string
  accValue: string
  research: string
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
  blueprintIcon: string[]
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
  const settingsLocal = win.settingsLocal || {}
  const settings = win.settings || {}

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

  win.settingsLocal = settingsLocal
  win.settings = settings
  win.defaultAccType = config.accType
  win.defaultAccValue = config.accValue

  if (win.hideSource) {
    win.hideSource.checked = config.hideSource
  }

  if (typeof win.saveSetting === 'function') {
    win.saveSetting()
  }

  if (typeof win.update_all === 'function') {
    win.update_all()
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
  win.xqs = state.demandList.map(d => ({
    name: d.name,
    value: d.num || d.number || 1,
    number: d.num || d.number || 1,
    item: { name: d.name }
  }))
  win.ig_names = state.excludeList
}

export function clearLegacyState(): void {
  const win = getWin()
  win.xh_list = []
  win.out_list = []
  win.xqs = []
  win.ig_names = []
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

export function legacyGenerateBlueprint(): void {
  const win = getWin()
  if (typeof win.generateBlueprint === 'function') {
    win.generateBlueprint()
  }
}

export function getLegacyRecipe(): ILegacyRecipe | null {
  const win = getWin()
  if (typeof win.getRecipe === 'function') {
    const recipe = win.getRecipe()
    return {
      proliferator: recipe.proliferator,
      subRecipes: recipe.recipeList as ILegacySubRecipe[]
    }
  }
  return null
}

export function generateBlueprintWithAdapter(): { success: boolean; error?: string } {
  const win = getWin()

  if (!isBlueprintServiceAvailable()) {
    logger.warn('[bridge] BlueprintService not available, falling back to legacy')
    legacyGenerateBlueprint()
    return { success: true }
  }

  try {
    const recipe = getLegacyRecipe()
    if (!recipe || !recipe.subRecipes) {
      return { success: false, error: 'No recipe data available' }
    }

    const config: ILegacyBlueprintConfig = legacyGetConfigFromDOM()

    const result = generateBlueprintWithNewService(recipe, config)

    if (!result.success) {
      logger.warn('[bridge] New service failed, falling back to legacy:', result.error)
      legacyGenerateBlueprint()
      return { success: true }
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
    legacyGenerateBlueprint()
    return { success: true }
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
  const settingsTime = win.settings_time || {}

  settingsTime['采矿机'] = (speeds.oreSpeed / 100) * 0.5 * 6
  settingsTime['大型采矿机'] = (speeds.oreSpeed / 100) * 1 * 20
  settingsTime['分馏塔'] = speeds.fractionatorSpeed
  settingsTime['原油萃取站'] = speeds.oilSpeed
  settingsTime['轨道采集器(气态)'] = speeds.orbitalHydrogenGas
  settingsTime['轨道采集器(巨冰)'] = speeds.orbitalHydrogenIce
  settingsTime['射线接收塔'] = speeds.criticalPhotonSpeed

  win.settings_time = settingsTime

  if (typeof win.saveSettingTime === 'function') {
    win.saveSettingTime()
  }

  if (win.pointLength) {
    win.pointLength.value = String(speeds.pointLength)
  }

  if (typeof win.update_all === 'function') {
    win.update_all()
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

  if (typeof win.update_all === 'function') {
    win.update_all()
  }
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

  return {
    oreSpeed: Math.round(((settingsTime['采矿机'] || 3) / 0.5 / 6) * 100),
    fractionatorSpeed: settingsTime['分馏塔'] || 18,
    largeMinerSpeed: Math.round(((settingsTime['大型采矿机'] || 20) / 1 / 20) * 100),
    oilSpeed: settingsTime['原油萃取站'] || 4,
    orbitalDeuterium: 0.02,
    orbitalFireIce: 0.5,
    orbitalHydrogenIce: settingsTime['轨道采集器(巨冰)'] || 0.5,
    orbitalHydrogenGas: settingsTime['轨道采集器(气态)'] || 1,
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
  const items: string[] = []
  const reg = /^(\d)-(\d{1,2})-(.+)$/
  const win = getWin()
  const gameData = win.game_data
  if (!gameData) return items

  const iconArrays = [gameData.icons1, gameData.icons2]
  const seen = new Set<string>()

  for (const icons of iconArrays) {
    if (!Array.isArray(icons)) continue
    for (const icon of icons) {
      const name = icon.name
      if (reg.test(name)) {
        const match = name.match(reg)
        if (match && match[3]) {
          const itemName = match[3]
          if (!seen.has(itemName)) {
            seen.add(itemName)
            items.push(itemName)
          }
        }
      }
    }
  }

  return items
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
  const result: SelectableItemsResult = { icons1: [], icons2: [] }
  const reg = /^(\d)-(\d{1,2})-(.+)$/
  const win = getWin()
  const gameData = win.game_data
  if (!gameData) return result

  const seen1 = new Set<string>()
  const seen2 = new Set<string>()

  function processIcons(icons: ILegacyIcon[], target: ItemWithIcon[], seen: Set<string>) {
    if (!Array.isArray(icons)) return
    for (const icon of icons) {
      const name = icon.name
      if (reg.test(name)) {
        const match = name.match(reg)
        if (match && match[3]) {
          const itemName = match[3]
          if (!seen.has(itemName)) {
            seen.add(itemName)
            target.push({
              name: itemName,
              icon: icon.value
            })
          }
        }
      }
    }
  }

  processIcons(gameData.icons1, result.icons1, seen1)
  processIcons(gameData.icons2, result.icons2, seen2)

  return result
}

export function getIconData(): { [key: string]: string } {
  const result: { [key: string]: string } = {}
  const reg = /^(\d)-(\d{1,2})-(.+)$/
  const win = getWin()
  const gameData = win.game_data
  if (!gameData) return result

  const iconArrays = [gameData.icons1, gameData.icons2]

  for (const icons of iconArrays) {
    if (!Array.isArray(icons)) continue
    for (const icon of icons) {
      const name = icon.name
      if (reg.test(name)) {
        const match = name.match(reg)
        if (match && match[3]) {
          result[match[3]] = 'data:image/png;base64,' + icon.value
        }
      }
    }
  }

  return result
}

export function isLegacyDataLoaded(): boolean {
  const win = getWin()
  return (
    typeof win.update_all === 'function' &&
    typeof win.find === 'function' &&
    Array.isArray(win.data)
  )
}

export function isGameDataLoaded(): boolean {
  const win = getWin()
  return win.isDataLoaded === true
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
