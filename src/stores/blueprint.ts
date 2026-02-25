/**
 * BlueprintStore - 蓝图状态存储（兼容层）
 *
 * 功能：
 * - 提供向后兼容的API
 * - 内部委托给专门的子Store
 * - 保持原有接口不变
 * - 支持渐进式迁移
 *
 * 架构说明：
 * - 此Store作为兼容层，内部使用新的子Store
 * - demandStore: 需求管理
 * - settingsStore: 设置管理
 * - calculationStore: 计算状态管理
 * - 原有代码无需修改，继续使用此Store
 * - 新代码可以直接使用子Store获得更好的类型安全
 *
 * 主要方法：
 * - addDemand(name, num): 添加需求
 * - removeDemand(name): 移除需求
 * - toggleExclude(name): 切换排除状态
 * - setMachineSettings(settings): 设置机器设置
 * - runCalculation(): 执行计算
 * - createSnapshot(): 创建状态快照
 * - restoreSnapshot(snapshot): 恢复状态快照
 *
 * 上游调用：
 * - App.vue: 主应用组件
 * - components/DemandList.vue: 需求列表组件
 * - components/ConfigPanel.vue: 配置面板组件
 * - components/ResultTable.vue: 结果表格组件
 *
 * 下游依赖：
 * - stores/demand.ts: 需求Store
 * - stores/settings.ts: 设置Store
 * - stores/calculation.ts: 计算Store
 * - core/bridge.ts: 状态同步桥
 * - core/services/CalculatorService.ts: 计算服务
 * - core/config/app.config.ts: 应用配置
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { logger } from '../utils/logger'
import type { IConsumptionItem, IResultItemOutput } from '../core/types/recipe'
import type { IRecipeSettings, ISpeedSettings, IProductivitySettings } from '../core/types/settings'
import { APP_CONFIG } from '../core/config/app.config'
import { isGameDataLoaded } from '../core/bridge'
import { useDemandStore, type DemandItem, type IStateSnapshot as IDemandSnapshot } from './demand'
import { useSettingsStore, type MachineSettings } from './settings'
import { useCalculationStore, type ResultItem, CalcState } from './calculation'

export type { DemandItem } from './demand'
export type { MachineSettings } from './settings'

export interface IStateSnapshot {
  demandVersion: number
  demandList: DemandItem[]
  excludeList: string[]
}

export const useBlueprintStore = defineStore('blueprint', () => {
  const demandStore = useDemandStore()
  const settingsStore = useSettingsStore()
  const calculationStore = useCalculationStore()

  const demandList = computed(() => demandStore.demandList)
  const excludeList = computed(() => demandStore.excludeList)
  const machineSettings = computed(() => settingsStore.machineSettings)
  const resultItems = computed(() => calculationStore.resultItems)
  const isCalculating = computed(() => calculationStore.isCalculating)
  const calculationError = computed(() => {
    const err = calculationStore.error
    return err ? err.message : null
  })
  const demandVersion = computed(() => demandStore.demandVersion)
  const isIconsLoaded = ref(false)

  const recipeSettings = computed(() => settingsStore.recipeSettings)
  const speedSettings = computed(() => settingsStore.speedSettings)
  const productivitySettings = computed(() => settingsStore.productivitySettings)

  const hasDemand = computed(() => demandStore.hasDemand)
  const demandCount = computed(() => demandStore.demandCount)

  function enableSync() {
    demandStore.enableSync()
  }

  async function doSyncToLegacy(force: boolean = false): Promise<boolean> {
    return demandStore.forceSyncToLegacy()
  }

  async function forceSyncToLegacy(): Promise<boolean> {
    return demandStore.forceSyncToLegacy()
  }

  function getSyncStatus(): { enabled: boolean; lastVersion: number; currentVersion: number } {
    return demandStore.getSyncStatus()
  }

  function onSettingsChange(callback: () => void): () => void {
    return settingsStore.onSettingsChange(callback)
  }

  function loadFromLegacy(legacyDemands: DemandItem[], legacyExcludes: string[]): void {
    demandStore.loadFromLegacy(legacyDemands, legacyExcludes)
  }

  function checkIconsLoaded() {
    isIconsLoaded.value = isGameDataLoaded()
    return isIconsLoaded.value
  }

  function syncRecipeSettings(settings: IRecipeSettings) {
    settingsStore.syncRecipeSettings(settings)
  }

  function syncSpeedSettings(settings: ISpeedSettings) {
    settingsStore.syncSpeedSettings(settings)
  }

  function syncProductivitySettings(settings: IProductivitySettings) {
    settingsStore.syncProductivitySettings(settings)
  }

  function syncAllSettings(
    recipe: IRecipeSettings,
    speed: ISpeedSettings,
    prod: IProductivitySettings
  ) {
    settingsStore.syncAllSettings(recipe, speed, prod)
  }

  function addDemand(name: string, num: number = 1) {
    demandStore.addDemand(name, num)
  }

  function removeDemand(name: string) {
    demandStore.removeDemand(name)
  }

  function updateDemand(name: string, num: number) {
    demandStore.updateDemand(name, num)
  }

  function addExclude(name: string) {
    demandStore.addExclude(name)
  }

  function removeExclude(name: string) {
    demandStore.removeExclude(name)
  }

  function createSnapshot(): IStateSnapshot {
    return demandStore.createSnapshot()
  }

  function validateSnapshot(snapshot: IStateSnapshot): boolean {
    return demandStore.validateSnapshot(snapshot)
  }

  function setMachineSetting<K extends keyof MachineSettings>(key: K, value: MachineSettings[K]) {
    settingsStore.setMachineSetting(key, value)
  }

  function loadMachineSettings(settings: MachineSettings) {
    settingsStore.loadMachineSettings(settings)
  }

  function setCalculating(calculating: boolean) {
    if (calculating) {
      const currentState = calculationStore.getState()
      logger.log(`[BlueprintStore] setCalculating(true), current state: ${currentState}`)
      if (currentState === CalcState.SUCCESS || currentState === CalcState.ERROR) {
        calculationStore.resetStateOnly()
        logger.log('[BlueprintStore] State reset to IDLE')
      }
      if (calculationStore.canTransition(CalcState.PREPARING)) {
        calculationStore.setPreparing()
        calculationStore.setCalculating()
        logger.log('[BlueprintStore] State transitioned to CALCULATING')
      } else {
        logger.warn('[BlueprintStore] Cannot start calculation: invalid state transition')
      }
    } else {
      const currentState = calculationStore.getState()
      logger.log(`[BlueprintStore] setCalculating(false), current state: ${currentState}`)
      if (calculationStore.getState() === CalcState.CALCULATING) {
        calculationStore.transition(CalcState.SUCCESS)
      }
    }
  }

  function setResultItems(items: ResultItem[]) {
    logger.log(`[BlueprintStore] setResultItems: ${items.length} items`)
    calculationStore.setResultItems(items)
    const currentState = calculationStore.getState()
    logger.log(`[BlueprintStore] setResultItems, current state: ${currentState}`)
    if (currentState === CalcState.CALCULATING || currentState === CalcState.PREPARING) {
      calculationStore.transition(CalcState.SUCCESS)
      calculationStore.incrementVersion()
      logger.log('[BlueprintStore] State transitioned to SUCCESS')
    }
  }

  function setError(error: string | null) {
    if (error) {
      calculationStore.setError(error)
    } else {
      calculationStore.clearError()
    }
  }

  function clearAll() {
    demandStore.clearAll()
    calculationStore.reset()
  }

  return {
    demandList,
    excludeList,
    machineSettings,
    resultItems,
    isCalculating,
    calculationError,
    demandVersion,
    isIconsLoaded,
    recipeSettings,
    speedSettings,
    productivitySettings,
    hasDemand,
    demandCount,
    addDemand,
    removeDemand,
    updateDemand,
    addExclude,
    removeExclude,
    createSnapshot,
    validateSnapshot,
    setMachineSetting,
    loadMachineSettings,
    setCalculating,
    setResultItems,
    setError,
    clearAll,
    checkIconsLoaded,
    syncRecipeSettings,
    syncSpeedSettings,
    syncProductivitySettings,
    syncAllSettings,
    enableSync,
    forceSyncToLegacy,
    getSyncStatus,
    onSettingsChange,
    loadFromLegacy
  }
})
