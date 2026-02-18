/**
 * Worker类型定义
 *
 * 定义：
 * - IWorkerCalculateRequest: 计算请求
 * - IWorkerCalculateResponse: 计算响应
 * - IWorkerInitRequest: 初始化请求
 * - IWorkerInitResponse: 初始化响应
 * - WorkerRequest: Worker请求联合类型
 * - WorkerResponse: Worker响应联合类型
 *
 * 上游使用：
 * - workers/CalculatorWorkerService.ts: Worker服务
 * - workers/calculator.worker.ts: Worker实现
 *
 * 下游依赖：
 * - types/settings.ts: 设置类型定义
 */
import type { IRawRecipe } from '../types/settings'

export interface IWorkerCalculateRequest {
  type: 'calculate'
  id: number
  demands: Array<{ name: string; num: number }>
  excludes: string[]
  recipes: IRawRecipe[]
  settings: Record<number, { accType?: string; accValue?: string; m?: string }>
  settingsPf: Record<string, number>
  settingsTime: Record<string, number>
  recipeIndexByProduct: Record<string, number[]>
  defaultAccType: string
  defaultAccValue: string
  singleMakes?: Array<{ id: number; number: number }>
  selfAcc?: boolean
  isAddSelfAccP?: boolean
  // P6-4修复：添加轨道采集器t值缓存
  orbitalCollectorTCache?: Record<string, number>
  // P10-1修复：添加临界光子缓存
  criticalPhotonTCache?: number
  criticalPhotonLensNCache?: number
}

export interface IWorkerCalculateResponse {
  type: 'result' | 'error'
  id: number
  result?: {
    success: boolean
    xh_list: Array<{ name: string; value: number; value2?: number; accTotal?: number }>
    out_list: Array<{ name: string; value: number }>
    xhMap: Record<string, { name: string; value: number }>
    outMap: Record<string, { name: string; value: number }>
  }
  error?: string
}

export interface IWorkerInitRequest {
  type: 'init'
  recipes: IRawRecipe[]
  settings: Record<number, { accType?: string; accValue?: string; m?: string }>
  settingsPf: Record<string, number>
  settingsTime: Record<string, number>
  recipeIndexByProduct: Record<string, number[]>
}

export interface IWorkerInitResponse {
  type: 'ready'
  recipeCount: number
}

export type WorkerRequest = IWorkerCalculateRequest | IWorkerInitRequest
export type WorkerResponse = IWorkerCalculateResponse | IWorkerInitResponse
