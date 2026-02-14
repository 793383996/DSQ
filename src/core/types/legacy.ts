/**
 * 遗留模块类型定义
 *
 * 这些类型定义用于描述 data.js 和 blueprint.js 中的遗留代码接口
 */

export interface ILegacyDataItem {
  id: string
  name: string
  mName: string
  m: Array<{ name: string; speed?: number }>
  s?: Array<{ name: string; n?: number }>
  q?: Array<{ name: string; n?: number }>
  t?: number
  group?: string
  noExtra?: boolean | null
}

export interface ILegacyIcon {
  name: string
  value: string
}

export interface ILegacyGameData {
  icons1: ILegacyIcon[]
  icons2: ILegacyIcon[]
}

export interface ILegacyXhItem {
  name: string
  value: number
  value2?: number
}

export interface ILegacyOutItem {
  name: string
  value: number
  value2?: number
}

export interface ILegacySettings {
  m?: string
  accType?: string
  accValue?: string
}

export interface ILegacyWindow {
  pako: unknown
  xqs: ILegacyXhItem[]
  ig_names: string[]
  settings: Record<string, ILegacySettings>
  cocoMessage: (msg: string, type?: string) => void
  loadNumber: () => unknown
  find: (name: string, normalize_recipe?: boolean) => ILegacyDataItem | null
  generateBlueprint: () => void
  icons: Record<string, string>
  xh_list: ILegacyXhItem[]
  out_list: ILegacyOutItem[]
  items0: unknown[]
  items: unknown[]
  totalDisplay: unknown[]
  f_initIcons: () => void
  f_reset: () => void
  f_reset_ig: () => void
  f_remove_ig: (name: string) => void
  removeItem: (index: number) => void
  onClickNumber: (index: number) => void
  onClickNumberItem: (index: number) => void
  submitEditorNumber: () => void
  submitEditorNumberItem: () => void
  cancelEditorNumber: () => void
  cancelEditorNumberItem: () => void
  speedChange: (item: unknown) => void
  txtnumber: HTMLInputElement
  selmaince: HTMLInputElement
  pointLength: HTMLInputElement
  hideSource: HTMLInputElement
  conveyorBeltStackLayer: HTMLInputElement
  onlyConveyorBeltMk3: HTMLInputElement
  onlySorterMk3: HTMLInputElement
  useSorterMk4: HTMLInputElement
  generateTeslaTower: HTMLInputElement
  teslaTowerLineInterval: HTMLInputElement
  stackLayers: HTMLInputElement
  x_y_ratio: HTMLInputElement
  maxLabLayers: HTMLInputElement
  selfAcc: HTMLInputElement
  isAddSelfAccP: HTMLInputElement
  xps_editor_index: number
  xps_editor_number: number
  items_editor_index: number
  items_editor_number: number
  settings_time: Record<string, number>
  saveSettingTime: () => void
  settingsLocal: Record<string, ILegacySettings>
  defaultAccType: string
  defaultAccValue: string
  update_all: () => void
  saveSetting: () => void
  data: ILegacyDataItem[]
  game_data: ILegacyGameData
  isDataLoaded: boolean
  logisticsSettings: {
    beltType: string
    logisticStack: number
  }
  beltSpeed: number
  app: {
    items: unknown[]
    items2: unknown[]
    items0: unknown[]
    total: unknown[]
    totalEnergy: string
    totalSpace: number
    totalAcc: string
    xqs: unknown[]
    ig_names: string[]
  }
}

export type LegacyWindow = Partial<ILegacyWindow> & Window
