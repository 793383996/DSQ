/**
 * 计算结果项 - 消耗项
 */
export interface IResultItem {
  name: string
  number1: string
  number2: string
  time: string
  t: string
  speed: string
  speedClass: string
  rowClass: string
  m: IMachineOption[]
  pf: IProductivityOption[]
}

/**
 * 计算结果项 - 产出项
 */
export interface IResultItemOutput {
  name: string
  number1: string
  number2: string
  time: string
  t: string
  speed: string
  speedClass: string
  rowClass: string
  m: IMachineOption[]
  pf: IProductivityOption[]
}

/**
 * 机器选项
 */
export interface IMachineOption {
  class: string
  itemName: string
  href: string
  name: string
  title: string
  showName: string
}

/**
 * 增产剂选项
 */
export interface IProductivityOption {
  class: string
  itemName: string
  href: string
  name: string
  title: string
  showName: string
}

/**
 * 增产剂类型选项
 */
export interface IAccTypeOption {
  class: string
  itemName: string
  href: string
  name: string
  title: string
  showName: string
}

/**
 * 增产剂效果选项
 */
export interface IAccValueOption {
  class: string
  itemName: string
  href: string
  name: string
  title: string
  showName: string
}

/**
 * 消耗项（带增产剂信息）
 */
export interface IConsumptionItem extends IResultItem {
  accType?: IAccTypeOption[]
  accValue?: IAccValueOption[]
}

/**
 * 汇总项
 */
export interface ITotalItem {
  name: string
  number: number
  energy?: number
  space?: number
  acc?: number
}

/**
 * 遗留计算结果
 */
export interface ILegacyCalculationResult {
  items: IConsumptionItem[]
  items2: IResultItemOutput[]
  items0: IResultItem[]
  total: ITotalItem[]
  totalEnergy: string
  totalSpace: number
  totalAcc: string
  xqs: IDemandItem[]
  ig_names: string[]
}

/**
 * 需求项
 */
export interface IDemandItem {
  name: string
  num: number
  item?: { name: string }
  number?: number
}

/**
 * 遗留App对象
 */
export interface ILegacyApp {
  items: IConsumptionItem[]
  items2: IResultItemOutput[]
  items0: IResultItem[]
  total: ITotalItem[]
  totalEnergy: string
  totalSpace: number
  totalAcc: string
  xqs: IDemandItem[]
  ig_names: string[]
}

/**
 * 配方产出/需求项
 */
export interface IRecipeItem {
  name: string
  n: number
}

/**
 * 配方定义 (语义化)
 */
export interface IRecipe {
  id: string
  name: string
  outputs: IRecipeItem[]
  inputs: IRecipeItem[]
  time: number
  machineType: string
  group?: string
  noExtra?: boolean | null
}

/**
 * 配方索引接口
 */
export interface IRecipeIndex {
  byProduct: Map<string, IRecipe[]>
  byInput: Map<string, IRecipe[]>
  byId: Map<string, IRecipe>
}

/**
 * 计算结果项
 */
export interface ICalculationResult {
  name: string
  amount: number
  machineCount: number
  recipe?: IRecipe
}

/**
 * 需求项
 */
export interface IDemand {
  name: string
  num: number
}

/**
 * 原始配方数据格式 (data.js 中的格式)
 */
export interface IRawRecipe {
  s?: Array<{ name: string; n?: number }>
  q?: Array<{ name: string; n?: number }>
  t?: number
  m?: string
  group?: string
  noExtra?: boolean | null
}
