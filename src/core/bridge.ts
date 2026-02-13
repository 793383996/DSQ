import { cocoMessageProxy } from '../composables/useToast'

let dataModule: any = null
let blueprintModule: any = null
let pakoModule: any = null

async function loadLegacyModules() {
  if (!dataModule) {
    const [dataMod, blueprintMod, pakoMod] = await Promise.all([
      import('./legacy/data'),
      import('./legacy/blueprint'),
      import('pako')
    ])
    dataModule = dataMod
    blueprintModule = blueprintMod
    pakoModule = pakoMod
  }
  return { data: dataModule, blueprint: blueprintModule, pako: pakoModule }
}

export interface LegacyGlobals {
  data: any
  blueprint: any
  pako: any
}

export interface StateSyncMap {
  demandList: any[]
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
  subRecipes?: any[]
}

export interface Recipe {
  blueprintTitle: string
  blueprintIcon: string[]
  blueprintDesc: string
}

declare global {
  interface Window {
    xqs: any[]
    ig_names: string[]
    settings: MachineSettings
    cocoMessage: (msg: string, type?: string) => void
    loadNumber: () => any
    find: (name: string, normalize_recipe?: boolean) => any
    generateBlueprint: () => void
    icons: Record<string, string>
    xh_list: any[]
    out_list: any[]
    items0: any[]
    items: any[]
    totalDisplay: any[]
    f_initIcons: () => void
    f_add: () => void
    f_reset: () => void
    f_reset_ig: () => void
    f_save: () => void
    f_ig: (element: HTMLElement) => void
    f_split: (element: HTMLElement) => void
    f_tag: (element: HTMLElement) => void
    f_remove_ig: (name: string) => void
    removeItem: (index: number) => void
    onClickNumber: (index: number) => void
    onClickNumberItem: (index: number) => void
    submitEditorNumber: () => void
    submitEditorNumberItem: () => void
    cancelEditorNumber: () => void
    cancelEditorNumberItem: () => void
    speedChange: (item: any) => void
    f_split_recipe: (name: string, type: number) => void
    f_split_select: (name: string, select: number) => void
    f_add_recipe: (name: string, num: number, pf: number) => void
    f_add_tag: (name: string, tag: string) => void
    f_change_speed: (name: string, speed: number) => void
    f_select_m: (name: string, m: string) => void
    f_select_acc_type: (name: string, accType: string) => void
    f_select_acc_value: (name: string, accValue: string) => void
    txtnumber: HTMLInputElement
    selmaince: HTMLInputElement
    selmodein: HTMLSelectElement
    furnace: HTMLSelectElement
    chemical: HTMLSelectElement
    accType: HTMLSelectElement
    accValue: HTMLSelectElement
    research: HTMLSelectElement
    selfAcc: HTMLInputElement
    isAddSelfAccP: HTMLInputElement
    showMaxOneBelt: HTMLInputElement
    hideSource: HTMLInputElement
    fractionatorSpeed: HTMLInputElement
    pointLength: HTMLInputElement
    conveyorBeltStackLayer: HTMLInputElement
    onlyConveyorBeltMk3: HTMLInputElement
    onlySorterMk3: HTMLInputElement
    useSorterMk4: HTMLInputElement
    generateTeslaTower: HTMLInputElement
    teslaTowerLineInterval: HTMLInputElement
    stackLayers: HTMLInputElement
    x_y_ratio: HTMLInputElement
    maxLabLayers: HTMLInputElement
    selprojects: HTMLSelectElement
    btnLoadProject: HTMLButtonElement
    btnReset5: HTMLButtonElement
    projectdiv: HTMLElement
    MoreSetting: HTMLElement
    UIselector: HTMLElement
    Split: HTMLElement
    xps_editor_index: number
    xps_editor_number: number
    items_editor_index: number
    items_editor_number: number
    settings_time: Record<string, number>
    saveSettingTime: () => void
    settingsLocal: Record<string, { m?: string; accType?: string; accValue?: string }>
    defaultAccType: string
    defaultAccValue: string
    update_all: () => void
  }
}

export function initLegacyBridge(): void {
  window.xqs = []
  window.ig_names = []
  window.settings = {
    modeIn: '制作台Mk.Ⅰ',
    furnace: '电弧熔炉',
    chemical: '化工厂',
    accType: '增产剂Mk.Ⅰ',
    accValue: '无',
    research: '矩阵研究站'
  }
  window.icons = {}
  window.xh_list = []
  window.out_list = []
  window.items0 = []
  window.items = []
  window.totalDisplay = []
  window.xps_editor_index = -1
  window.items_editor_index = -1
  window.settings_time = {}

  window.onlyConveyorBeltMk3 = { checked: true } as HTMLInputElement
  window.onlySorterMk3 = { checked: true } as HTMLInputElement
  window.useSorterMk4 = { checked: false } as HTMLInputElement
  window.selfAcc = { checked: false } as HTMLInputElement
  window.isAddSelfAccP = { checked: false } as HTMLInputElement
  window.generateTeslaTower = { checked: true } as HTMLInputElement
  window.teslaTowerLineInterval = { value: '1' } as HTMLInputElement
  window.conveyorBeltStackLayer = { value: '4' } as HTMLInputElement
  window.stackLayers = { value: '1' } as HTMLInputElement
  window.x_y_ratio = { value: '2' } as HTMLInputElement
  window.maxLabLayers = { value: '15' } as HTMLInputElement
  window.pointLength = { value: '1' } as HTMLInputElement
  window.hideSource = { checked: false } as HTMLInputElement
  window.settingsLocal = {}
  window.defaultAccType = '增产剂Mk.Ⅰ'
  window.defaultAccValue = '无'

  window.cocoMessage = cocoMessageProxy
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
  const data = (window as any).data || []
  const settingsLocal = (window as any).settingsLocal || {}
  
  data.forEach((item: any) => {
    if (!settingsLocal[item.id]) {
      settingsLocal[item.id] = {}
    }
    
    if (item.mName === '制作台') {
      settingsLocal[item.id].m = config.modeIn
    }
    if (item.mName === '冶炼设备') {
      settingsLocal[item.id].m = config.furnace
    }
    if (item.mName === '化工设备') {
      settingsLocal[item.id].m = config.chemical
    }
    if (item.mName === '研究站') {
      settingsLocal[item.id].m = config.research
    }
    
    settingsLocal[item.id].accType = config.accType
    settingsLocal[item.id].accValue = config.accValue
  })
  
  ;(window as any).settingsLocal = settingsLocal
  ;(window as any).defaultAccType = config.accType
  ;(window as any).defaultAccValue = config.accValue
  
  if (window.hideSource) {
    window.hideSource.checked = config.hideSource
  }
  
  if (typeof (window as any).saveSetting === 'function') {
    ;(window as any).saveSetting()
  }
  
  if (typeof (window as any).update_all === 'function') {
    ;(window as any).update_all()
  }
}

export function legacyGetMachineSettings(): MachineConfigSettings {
  return {
    modeIn: '制作台Mk.Ⅰ',
    furnace: '电弧熔炉',
    chemical: '化工厂',
    accType: (window as any).defaultAccType || '增产剂Mk.Ⅰ',
    accValue: (window as any).defaultAccValue || '无',
    research: '矩阵研究站',
    hideSource: window.hideSource?.checked ?? false
  }
}

export function syncStateToLegacy(state: StateSyncMap): void {
  window.xqs = state.demandList
  window.ig_names = state.excludeList
  window.settings = state.machineSettings
}

export function clearLegacyState(): void {
  window.xh_list = []
  window.out_list = []
  window.xqs = []
  window.ig_names = []
}

export async function runCalculation(): Promise<any> {
  try {
    clearLegacyState()
    if (typeof window.loadNumber === 'function') {
      return await window.loadNumber()
    }
    throw new Error('loadNumber function not found')
  } catch (error) {
    console.error('Calculation failed:', error)
    cocoMessageProxy('计算失败，请检查配置', 'error')
    throw error
  }
}

export function legacyFind(name: string, normalize_recipe?: boolean): any {
  if (typeof window.find === 'function') {
    return window.find(name, normalize_recipe)
  }
  return null
}

export function legacyGenerateBlueprint(): void {
  if (typeof window.generateBlueprint === 'function') {
    window.generateBlueprint()
  }
}

export function legacyGetConfigFromDOM(): BlueprintConfig {
  return {
    maxSorterNumOneBelt: 8,
    conveyorBeltStackLayer: parseInt(window.conveyorBeltStackLayer?.value || '4'),
    x_y_ratio: parseFloat(window.x_y_ratio?.value || '2'),
    compactLayout: false,
    upgradeConveyorBelt: false,
    onlyConveyorBeltMk3: window.onlyConveyorBeltMk3?.checked ?? true,
    onlySorterMk3: window.onlySorterMk3?.checked ?? true,
    useSorterMk4: window.useSorterMk4?.checked ?? false,
    maxLabLayers: parseInt(window.maxLabLayers?.value || '15'),
    selfSpray: window.selfAcc?.checked ?? true,
    generateTeslaTower: window.generateTeslaTower?.checked ?? true,
    teslaTowerInterval: 10,
    teslaTowerLineInterval: parseInt(window.teslaTowerLineInterval?.value || '1'),
    onlyConveyorBeltMk3Downgrade: false,
    stackLayers: parseInt(window.stackLayers?.value || '1')
  }
}

export function legacyUpdateConfig(config: Partial<BlueprintConfig>): void {
  if (config.conveyorBeltStackLayer !== undefined && window.conveyorBeltStackLayer) {
    window.conveyorBeltStackLayer.value = String(config.conveyorBeltStackLayer)
  }
  if (config.onlyConveyorBeltMk3 !== undefined && window.onlyConveyorBeltMk3) {
    window.onlyConveyorBeltMk3.checked = config.onlyConveyorBeltMk3
  }
  if (config.onlySorterMk3 !== undefined && window.onlySorterMk3) {
    window.onlySorterMk3.checked = config.onlySorterMk3
  }
  if (config.useSorterMk4 !== undefined && window.useSorterMk4) {
    window.useSorterMk4.checked = config.useSorterMk4
  }
  if (config.selfSpray !== undefined && window.selfAcc) {
    window.selfAcc.checked = config.selfSpray
  }
  if (config.generateTeslaTower !== undefined && window.generateTeslaTower) {
    window.generateTeslaTower.checked = config.generateTeslaTower
  }
  if (config.teslaTowerLineInterval !== undefined && window.teslaTowerLineInterval) {
    window.teslaTowerLineInterval.value = String(config.teslaTowerLineInterval)
  }
  if (config.stackLayers !== undefined && window.stackLayers) {
    window.stackLayers.value = String(config.stackLayers)
  }
  if (config.x_y_ratio !== undefined && window.x_y_ratio) {
    window.x_y_ratio.value = String(config.x_y_ratio)
  }
  if (config.maxLabLayers !== undefined && window.maxLabLayers) {
    window.maxLabLayers.value = String(config.maxLabLayers)
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
  const settingsTime = (window as any).settings_time || {}
  
  settingsTime['采矿机'] = speeds.oreSpeed / 100 * 0.5 * 6
  settingsTime['大型采矿机'] = speeds.oreSpeed / 100 * 1 * 20
  settingsTime['分馏塔'] = speeds.fractionatorSpeed
  settingsTime['原油萃取站'] = speeds.oilSpeed
  settingsTime['轨道采集器(气态)'] = speeds.orbitalHydrogenGas
  settingsTime['轨道采集器(巨冰)'] = speeds.orbitalHydrogenIce
  settingsTime['射线接收塔'] = speeds.criticalPhotonSpeed
  
  ;(window as any).settings_time = settingsTime
  
  if (typeof (window as any).saveSettingTime === 'function') {
    ;(window as any).saveSettingTime()
  }
  
  if (window.pointLength) {
    window.pointLength.value = String(speeds.pointLength)
  }
  
  if (typeof (window as any).update_all === 'function') {
    ;(window as any).update_all()
  }
}

export function legacyUpdateLogisticsSettings(logistics: LogisticsSettings): void {
  ;(window as any).logisticsSettings = {
    beltType: logistics.beltType,
    logisticStack: logistics.logisticStack
  }
  
  const beltSpeedMap: Record<string, number> = {
    '传送带': 360,
    '高速传送带': 720,
    '极速传送带': 1800
  }
  ;(window as any).beltSpeed = beltSpeedMap[logistics.beltType] || 1800
  
  if (typeof (window as any).update_all === 'function') {
    ;(window as any).update_all()
  }
}

export function legacyGetLogisticsSettings(): LogisticsSettings {
  const settings = (window as any).logisticsSettings || {}
  return {
    beltType: settings.beltType || '极速传送带',
    logisticStack: settings.logisticStack || 1
  }
}

export function legacyGetSpeedSettings(): SpeedSettings {
  const settingsTime = (window as any).settings_time || {}
  
  return {
    oreSpeed: Math.round((settingsTime['采矿机'] || 3) / 0.5 / 6 * 100),
    fractionatorSpeed: settingsTime['分馏塔'] || 18,
    largeMinerSpeed: Math.round((settingsTime['大型采矿机'] || 20) / 1 / 20 * 100),
    oilSpeed: settingsTime['原油萃取站'] || 4,
    orbitalDeuterium: 0.02,
    orbitalFireIce: 0.5,
    orbitalHydrogenIce: settingsTime['轨道采集器(巨冰)'] || 0.5,
    orbitalHydrogenGas: settingsTime['轨道采集器(气态)'] || 1,
    criticalPhotonSpeed: settingsTime['射线接收塔'] || 5,
    pointLength: parseInt(window.pointLength?.value || '1')
  }
}

export function legacyGetProductionSettings(): {
  productionPerMinute: number
  machineCount: number
} {
  return {
    productionPerMinute: parseFloat(window.txtnumber?.value || '60'),
    machineCount: parseInt(window.selmaince?.value || '1')
  }
}

export function legacySetProductionSettings(
  production: number,
  machineCount?: number
): void {
  if (window.txtnumber) {
    window.txtnumber.value = String(production)
  }
  if (machineCount !== undefined && window.selmaince) {
    window.selmaince.value = String(machineCount)
  }
}

export { loadLegacyModules }

export function getSelectableItems(): string[] {
  const items: string[] = []
  const reg = /^(\d)-(\d{1,2})-(.+)$/
  const gameData = (window as any).game_data
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
  const gameData = (window as any).game_data
  if (!gameData) return result

  const seen1 = new Set<string>()
  const seen2 = new Set<string>()

  function processIcons(icons: any[], target: ItemWithIcon[], seen: Set<string>) {
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
  const gameData = (window as any).game_data
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
  return (window as any).isDataLoaded === true
}

export function waitForLegacyData(timeout: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isLegacyDataLoaded()) {
      resolve(true)
      return
    }

    const startTime = Date.now()
    const checkInterval = 100

    const interval = setInterval(() => {
      if (isLegacyDataLoaded()) {
        clearInterval(interval)
        resolve(true)
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval)
        resolve(false)
      }
    }, checkInterval)
  })
}
