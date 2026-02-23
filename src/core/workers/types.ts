/**
 * Worker类型定义
 *
 * 定义：
 * - IWorkerCalculateRequest: 计算请求
 * - IWorkerCalculateResponse: 计算响应
 * - IWorkerInitRequest: 初始化请求
 * - IWorkerInitResponse: 初始化响应
 * - IWorkerSyncRequest: 增量同步请求
 * - IWorkerDataChecksum: 数据校验和
 * - WorkerRequest: Worker请求联合类型
 * - WorkerResponse: Worker响应联合类型
 *
 * 上游使用：
 * - workers/CalculatorWorkerService.ts: Worker服务
 * - workers/calculator.worker.ts: Worker实现
 *
 * 下游依赖：
 * - types/settings.ts: 设置类型定义
 *
 * 架构师注 (P5-2):
 * - 优化数据传递，减少重复数据传输
 * - 使用校验和检测数据变更
 * - calculate 请求仅传输计算参数
 */
import type { IRawRecipe } from '../types/settings'

export interface IWorkerDataChecksum {
  recipeCount: number
  settingsKeyCount: number
  settingsPfKeyCount: number
  settingsTimeKeyCount: number
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
  checksum: IWorkerDataChecksum
}

export interface IWorkerSyncRequest {
  type: 'sync'
  checksum: IWorkerDataChecksum
  recipes?: IRawRecipe[]
  settings?: Record<number, { accType?: string; accValue?: string; m?: string }>
  settingsPf?: Record<string, number>
  settingsTime?: Record<string, number>
  recipeIndexByProduct?: Record<string, number[]>
}

export interface IWorkerSyncResponse {
  type: 'synced'
  success: boolean
  checksum: IWorkerDataChecksum
}

export interface IWorkerCalculateRequest {
  type: 'calculate'
  id: number
  demands: Array<{ name: string; num: number }>
  excludes: string[]
  defaultAccType: string
  defaultAccValue: string
  singleMakes?: Array<{ id: number; number: number }>
  selfAcc?: boolean
  isAddSelfAccP?: boolean
  orbitalCollectorTCache?: Record<string, number>
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

export type WorkerRequest = IWorkerCalculateRequest | IWorkerInitRequest | IWorkerSyncRequest
export type WorkerResponse = IWorkerCalculateResponse | IWorkerInitResponse | IWorkerSyncResponse
