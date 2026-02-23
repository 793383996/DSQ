/**
 * Legacy类型定义
 *
 * 功能：
 * - 定义遗留代码接口类型
 * - 描述data.js中的数据结构
 * - 提供遗留代码兼容层
 *
 * 定义：
 * - ILegacyDataItem: 遗留数据项
 * - ILegacyIcon: 遗留图标
 * - ILegacyGameData: 遗留游戏数据
 * - ILegacyXhItem: 遗留消耗项
 * - ILegacyOutItem: 遗留产出项
 * - ILegacySettings: 遗留设置
 * - ILegacyWindow: 遗留窗口接口
 *
 * 上游使用：
 * - core/legacy/data.js: 遗留数据模块
 * - core/bridge.ts: 状态同步桥
 *
 * 架构师注 (P4-8):
 * - 这些类型定义用于与遗留代码交互
 * - 新代码应使用 core/types/ 下的现代类型定义
 * - 遗留模块已标记为 @deprecated，将在未来版本移除
 */
/**
 * 遗留模块类型定义
 *
 * @deprecated 这些类型定义用于描述 data.js 中的遗留代码接口
 * 新代码应使用 core/types/ 下的现代类型定义
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
  number?: number
  num?: number
  item?: { name: string }
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
  xqs?: ILegacyXhItem[]
  ig_names?: string[]
  settings: Record<string, ILegacySettings>
  settings_time: Record<string, number>
  settings_pf: Record<string, number>
  settingsLocal: Record<string, ILegacySettings>
  cocoMessage: (msg: string, type?: string) => void
  loadNumber: () => unknown
  find: (name: string, normalize_recipe?: boolean) => ILegacyDataItem | null
  generateBlueprint: () => void
  getRecipe: () => {
    proliferator?: string
    recipeList: unknown[]
    blueprintTitle: string
    blueprintIcon: string[]
    blueprintDesc: string
  }
  icons: Record<string, string>
  xh_list: ILegacyXhItem[]
  out_list: ILegacyOutItem[]
  // P2-1修复：添加xhMap和outMap类型定义
  xhMap?: Record<string, ILegacyXhItem>
  outMap?: Record<string, ILegacyOutItem>
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
  saveSettingTime: () => void
  defaultAccType: string
  defaultAccValue: string
  update_all: () => void
  saveSetting: () => void
  data: ILegacyDataItem[]
  recipeIndexByProduct?: Record<string, number[]>
  recipeIndexByMaterial?: Record<string, number[]>
  game_data: ILegacyGameData
  isDataLoaded: boolean
  itemMap: Record<
    string,
    { name: string; iconId: number; remark: string; extra_rate?: number; accelerate?: number }
  >
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
