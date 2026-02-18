/**
 * Settings类型定义
 *
 * 功能：
 * - 定义配方设置、速度设置、增产剂设置类型
 * - 定义机器设置项类型
 * - 定义原始配方数据类型
 *
 * 定义：
 * - IMachineSetting: 机器设置项
 * - IRecipeSettings: 配方级设置映射
 * - IRecipeSetting: 配方配置
 * - ISpeedSettings: 速度设置映射
 * - IProductivitySettings: 增产剂设置映射
 * - IRawRecipe: 原始配方数据
 * - IRawRecipeItem: 配方物品项
 *
 * 上游使用：
 * - core/services/RecipeCalculator.ts: 配方计算器
 * - core/services/UpdateAllService.ts: 更新服务
 * - core/adapters/SettingsAdapter.ts: 设置适配器
 */
/**
 * 机器设置项
 */
export interface IMachineSetting {
  name: string
  speed: number
}

/**
 * 配方级设置 (settings)
 * key: 配方ID, value: 配置
 *
 * 架构师注：data.js 中的 settings 结构
 * settings[recipeId] = { m?: string, accType?: string, accValue?: string }
 * - m: 选中的机器名称（如 "制作台Mk.Ⅲ"）
 * - accType: 增产剂等级
 * - accValue: 增产剂效果（"加速"/"增产"）
 */
export interface IRecipeSettings {
  [recipeId: string]: IRecipeSetting
}

/**
 * 配方配置
 */
export interface IRecipeSetting {
  m?: string
  accType?: string
  accValue?: string
}

/**
 * 速度设置 (settings_time)
 * key: 机器名称, value: 速度倍率
 */
export interface ISpeedSettings {
  [machineName: string]: number
}

/**
 * 增产剂设置 (settings_pf)
 * key: 物品名称, value: 配方索引（数字）
 *
 * 架构师注：data.js 中的 settings_pf 结构
 * settings_pf[itemName] = parseInt(value) - 存储的是配方索引
 */
export interface IProductivitySettings {
  [itemName: string]: number
}

/**
 * 增产剂配置（用于UI显示）
 */
export interface IProductivitySetting {
  type: string
  value: string
}

/**
 * 全局设置状态
 */
export interface IGlobalSettings {
  settings: IRecipeSettings
  settings_time: ISpeedSettings
  settings_pf: IProductivitySettings
  settingsLocal: IRecipeSettings
  pointLength: number
  version: string
}

/**
 * 默认增产剂类型
 */
export type DefaultAccType = '增产剂Mk.Ⅰ' | '增产剂Mk.Ⅱ' | '增产剂Mk.Ⅲ'

/**
 * 默认增产剂效果
 */
export type DefaultAccValue = '无' | '加速' | '增产'

/**
 * 排除项
 */
export interface IExcludeItem {
  name: string
}

/**
 * 计算上下文配置
 */
export interface ICalculationContextConfig {
  demands: Array<{ name: string; num: number }>
  excludes: string[]
  settings: IRecipeSettings
  speedSettings: ISpeedSettings
  productivitySettings: IProductivitySettings
}

/**
 * 计算结果
 */
export interface ICalculationOutput {
  consumption: Map<string, number>
  production: Map<string, number>
  items: ICalculationResultItem[]
  totalEnergy: number
  totalSpace: number
  totalAcc: number
}

/**
 * 计算结果项 (标准化)
 */
export interface ICalculationResultItem {
  name: string
  num: number
  machines: number
  machineType: string
  recipe?: IRawRecipe
}

/**
 * 原始配方数据格式 (data.js 中的格式)
 */
export interface IRawRecipe {
  id?: number
  name?: string
  s?: Array<{ name: string; n?: number }>
  q?: Array<{ name: string; n?: number }>
  t?: number
  m?: string | Array<{ name: string; speed: number }>
  mName?: string
  n?: number
  group?: string
  noExtra?: boolean | null
}
