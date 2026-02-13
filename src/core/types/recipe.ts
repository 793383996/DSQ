/**
 * 配方产出/需求项
 */
export interface IRecipeItem {
  name: string
  n: number
}

/**
 * 配方定义 (语义化)
 * 
 * 架构师注：此接口用于消除 s/q/t/m 等简写字段的理解成本
 * 原始数据格式保持不变，通过 RecipeAdapter 进行转换
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
  recipe?: any
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
