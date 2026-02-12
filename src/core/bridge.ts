import { data } from './legacy/data'
import * as blueprint from './legacy/blueprint'
import * as pako from './legacy/pako'
import { cocoMessageProxy } from '../composables/useToast'

export interface LegacyGlobals {
  data: typeof data
  blueprint: typeof blueprint
  pako: typeof pako
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

  window.cocoMessage = cocoMessageProxy
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

export { data, blueprint, pako }
