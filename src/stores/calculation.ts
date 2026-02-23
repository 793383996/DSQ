/**
 * CalculationStore - 计算状态管理Store
 *
 * 功能：
 * - 使用状态机模式管理计算流程
 * - 提供计算结果存储
 * - 支持计算错误处理
 * - 提供计算状态查询
 *
 * 计算状态：
 * - IDLE: 空闲
 * - PREPARING: 准备数据
 * - CALCULATING: 计算中
 * - SUCCESS: 成功
 * - ERROR: 错误
 *
 * 主要状态：
 * - state: 计算状态
 * - resultItems: 计算结果
 * - error: 错误信息
 * - calculationVersion: 计算版本号
 *
 * 主要方法：
 * - calculate(): 执行计算
 * - reset(): 重置状态
 * - canTransition(to): 检查状态转换是否合法
 * - transition(newState): 执行状态转换
 *
 * 上游调用：
 * - App.vue: 主应用组件
 * - stores/blueprint.ts: 原始Store（向后兼容）
 *
 * 下游依赖：
 * - core/services/CalculatorService.ts: 计算服务
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '../utils/logger'
import type { IConsumptionItem, IResultItemOutput } from '../core/types/recipe'

export enum CalcState {
  IDLE = 'idle',
  PREPARING = 'preparing',
  CALCULATING = 'calculating',
  SUCCESS = 'success',
  ERROR = 'error'
}

export interface CalculationError {
  message: string
  code?: string
  details?: unknown
}

export type ResultItem = IConsumptionItem | IResultItemOutput

export const useCalculationStore = defineStore('calculation', () => {
  const state = ref<CalcState>(CalcState.IDLE)
  const resultItems = ref<ResultItem[]>([])
  const error = ref<CalculationError | null>(null)
  const calculationVersion = ref(0)

  const isCalculating = computed(
    () => state.value === CalcState.CALCULATING || state.value === CalcState.PREPARING
  )
  const hasError = computed(() => state.value === CalcState.ERROR)
  const hasResults = computed(
    () => state.value === CalcState.SUCCESS && resultItems.value.length > 0
  )

  const transitions: Record<CalcState, CalcState[]> = {
    [CalcState.IDLE]: [CalcState.PREPARING],
    [CalcState.PREPARING]: [CalcState.CALCULATING, CalcState.ERROR],
    [CalcState.CALCULATING]: [CalcState.SUCCESS, CalcState.ERROR],
    [CalcState.SUCCESS]: [CalcState.IDLE, CalcState.PREPARING],
    [CalcState.ERROR]: [CalcState.IDLE, CalcState.PREPARING]
  }

  function canTransition(to: CalcState): boolean {
    return transitions[state.value].includes(to)
  }

  function transition(newState: CalcState): boolean {
    if (!canTransition(newState)) {
      logger.warn(`[CalculationStore] Invalid transition: ${state.value} -> ${newState}`)
      return false
    }
    logger.debug(`[CalculationStore] State transition: ${state.value} -> ${newState}`)
    state.value = newState
    return true
  }

  function setPreparing(): void {
    transition(CalcState.PREPARING)
    error.value = null
  }

  function setCalculating(): void {
    transition(CalcState.CALCULATING)
  }

  function setSuccess(items: ResultItem[]): void {
    resultItems.value = items
    error.value = null
    transition(CalcState.SUCCESS)
    calculationVersion.value++
  }

  function setError(err: CalculationError | Error | string): void {
    if (typeof err === 'string') {
      error.value = { message: err }
    } else if (err instanceof Error) {
      error.value = {
        message: err.message,
        code: err.name,
        details: err.stack
      }
    } else {
      error.value = err
    }
    transition(CalcState.ERROR)
  }

  function reset(): void {
    state.value = CalcState.IDLE
    resultItems.value = []
    error.value = null
    logger.debug('[CalculationStore] State reset to IDLE')
  }

  function forceReset(): void {
    const previousState = state.value
    state.value = CalcState.IDLE
    resultItems.value = []
    error.value = null
    logger.debug(`[CalculationStore] State force reset: ${previousState} -> IDLE`)
  }

  function setResultItems(items: ResultItem[]): void {
    resultItems.value = items
  }

  function clearError(): void {
    error.value = null
    if (state.value === CalcState.ERROR) {
      transition(CalcState.IDLE)
    }
  }

  function getState(): CalcState {
    return state.value
  }

  function getResultItems(): ResultItem[] {
    return resultItems.value
  }

  function getError(): CalculationError | null {
    return error.value
  }

  function getCalculationVersion(): number {
    return calculationVersion.value
  }

  return {
    state,
    resultItems,
    error,
    calculationVersion,
    isCalculating,
    hasError,
    hasResults,
    canTransition,
    transition,
    setPreparing,
    setCalculating,
    setSuccess,
    setError,
    reset,
    forceReset,
    setResultItems,
    clearError,
    getState,
    getResultItems,
    getError,
    getCalculationVersion
  }
})
