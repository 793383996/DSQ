/**
 * BlueprintStore - 蓝图状态存储
 *
 * 功能：
 * - 管理需求列表和排除列表
 * - 管理机器设置（制造台、熔炉、化工厂等）
 * - 管理增产剂设置
 * - 管理计算结果（消耗列表、产出列表）
 * - 管理配方设置、速度设置、生产力设置
 * - 支持状态持久化和快照
 *
 * 主要状态：
 * - demandList: 需求列表
 * - excludeList: 排除列表
 * - machineSettings: 机器设置
 * - consumptionList: 消耗列表
 * - productionList: 产出列表
 * - recipeSettings: 配方设置
 * - speedSettings: 速度设置
 * - productivitySettings: 生产力设置
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
 * - core/bridge.ts: 状态同步桥
 * - core/services/CalculatorService.ts: 计算服务
 * - core/config/app.config.ts: 应用配置
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { logger } from '../utils/logger'
import type { IConsumptionItem, IResultItemOutput } from '../core/types/recipe'
import type { IRecipeSettings, ISpeedSettings, IProductivitySettings } from '../core/types/settings'
import { APP_CONFIG } from '../core/config/app.config'
import { isGameDataLoaded, syncStateToLegacy } from '../core/bridge'

export interface DemandItem {
  name: string
  num: number
}

export interface MachineSettings {
  modeIn: string
  furnace: string
  chemical: string
  accType: string
  accValue: string
  research: string
  selfAcc?: boolean
  isAddSelfAccP?: boolean
  hideSource?: boolean
}

export interface IStateSnapshot {
  demandVersion: number
  demandList: DemandItem[]
  excludeList: string[]
}

export type ResultItem = IConsumptionItem | IResultItemOutput

const SETTINGS_STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.DEFAULT_MACHINE_SETTINGS + APP_CONFIG.VERSION

function loadPersistedSettings(): MachineSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    logger.warn('Failed to load persisted settings:', e)
  }
  return {
    modeIn: '制作台Mk.Ⅰ',
    furnace: '电弧熔炉',
    chemical: '化工厂',
    accType: '增产剂Mk.Ⅰ',
    accValue: '无',
    research: '矩阵研究站',
    selfAcc: false,
    isAddSelfAccP: false,
    hideSource: false
  }
}

export const useBlueprintStore = defineStore('blueprint', () => {
  const demandList = ref<DemandItem[]>([])
  const excludeList = ref<string[]>([])
  const machineSettings = ref<MachineSettings>(loadPersistedSettings())
  const resultItems = ref<ResultItem[]>([])
  const isCalculating = ref(false)
  const calculationError = ref<string | null>(null)
  const demandVersion = ref(0)
  const isIconsLoaded = ref(false)

  const recipeSettings = ref<IRecipeSettings>({})
  const speedSettings = ref<ISpeedSettings>({})
  const productivitySettings = ref<IProductivitySettings>({})

  const hasDemand = computed(() => demandList.value.length > 0)
  const demandCount = computed(() => demandList.value.length)

  let syncEnabled = false
  let lastSyncVersion = 0
  let isSyncing = false
  // P2修复：添加同步防抖，避免频繁同步
  let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
  const SYNC_DEBOUNCE_MS = 16 // 约60fps，减少延迟同时避免过度同步

  function enableSync() {
    syncEnabled = true
  }

  function doSyncToLegacy(force: boolean = false): boolean {
    if (!syncEnabled) return false
    if (isSyncing) return false

    if (!force && lastSyncVersion === demandVersion.value) {
      return false
    }

    isSyncing = true
    try {
      syncStateToLegacy({
        demandList: demandList.value,
        excludeList: excludeList.value,
        machineSettings: machineSettings.value
      })
      lastSyncVersion = demandVersion.value
      return true
    } catch (e) {
      logger.warn('[Store] Failed to sync to legacy:', e)
      return false
    } finally {
      isSyncing = false
    }
  }

  // P2修复：带防抖的同步方法，用于 watch 触发
  function debouncedSyncToLegacy(): void {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer)
    }
    syncDebounceTimer = setTimeout(() => {
      syncDebounceTimer = null
      doSyncToLegacy()
    }, SYNC_DEBOUNCE_MS)
  }

  function forceSyncToLegacy(): void {
    // P2修复：强制同步时清除防抖定时器
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer)
      syncDebounceTimer = null
    }
    doSyncToLegacy(true)
  }

  function getSyncStatus(): { enabled: boolean; lastVersion: number; currentVersion: number } {
    return {
      enabled: syncEnabled,
      lastVersion: lastSyncVersion,
      currentVersion: demandVersion.value
    }
  }

  // P2修复：使用防抖同步，减少频繁触发
  watch(
    [demandList, excludeList, machineSettings],
    () => {
      debouncedSyncToLegacy()
    },
    { deep: true }
  )

  // P1-2修复：设置变更回调机制（带防抖）
  const settingsChangeCallbacks: Set<() => void> = new Set()
  let settingsChangeDebounceTimer: ReturnType<typeof setTimeout> | null = null
  // P1-2修复：防抖时间从300ms减少到100ms，提升用户体验
  const SETTINGS_CHANGE_DEBOUNCE_MS = 100

  function onSettingsChange(callback: () => void): () => void {
    settingsChangeCallbacks.add(callback)
    return () => settingsChangeCallbacks.delete(callback)
  }

  function notifySettingsChange() {
    // P1-2修复：防抖处理，避免频繁触发计算
    if (settingsChangeDebounceTimer) {
      clearTimeout(settingsChangeDebounceTimer)
    }
    settingsChangeDebounceTimer = setTimeout(() => {
      settingsChangeDebounceTimer = null
      settingsChangeCallbacks.forEach(cb => {
        try {
          cb()
        } catch (e) {
          logger.warn('[Store] Settings change callback error:', e)
        }
      })
    }, SETTINGS_CHANGE_DEBOUNCE_MS)
  }

  function checkIconsLoaded() {
    isIconsLoaded.value = isGameDataLoaded()
    return isIconsLoaded.value
  }

  function syncRecipeSettings(settings: IRecipeSettings) {
    recipeSettings.value = { ...settings }
    // P1-2修复：配方设置变更时通知监听者
    notifySettingsChange()
  }

  function syncSpeedSettings(settings: ISpeedSettings) {
    speedSettings.value = { ...settings }
    // P1-2修复：速度设置变更时通知监听者
    notifySettingsChange()
  }

  function syncProductivitySettings(settings: IProductivitySettings) {
    productivitySettings.value = { ...settings }
    // P1-2修复：增产剂设置变更时通知监听者
    notifySettingsChange()
  }

  function syncAllSettings(
    recipe: IRecipeSettings,
    speed: ISpeedSettings,
    prod: IProductivitySettings
  ) {
    recipeSettings.value = { ...recipe }
    speedSettings.value = { ...speed }
    productivitySettings.value = { ...prod }
  }

  function addDemand(name: string, num: number = 1) {
    const existing = demandList.value.find(item => item.name === name)
    if (existing) {
      existing.num += num
    } else {
      demandList.value.push({ name, num })
    }
    demandVersion.value++
  }

  function removeDemand(name: string) {
    demandList.value = demandList.value.filter(item => item.name !== name)
    demandVersion.value++
  }

  function updateDemand(name: string, num: number) {
    const item = demandList.value.find(item => item.name === name)
    if (item) {
      item.num = Math.max(1, num)
      demandVersion.value++
    }
  }

  function addExclude(name: string) {
    if (!excludeList.value.includes(name)) {
      excludeList.value.push(name)
      demandVersion.value++
    }
  }

  function removeExclude(name: string) {
    const idx = excludeList.value.indexOf(name)
    if (idx !== -1) {
      excludeList.value.splice(idx, 1)
      demandVersion.value++
    }
  }

  function createSnapshot(): IStateSnapshot {
    return {
      demandVersion: demandVersion.value,
      demandList: demandList.value.map(d => ({ ...d })),
      excludeList: [...excludeList.value]
    }
  }

  function validateSnapshot(snapshot: IStateSnapshot): boolean {
    return snapshot.demandVersion === demandVersion.value
  }

  function setMachineSetting<K extends keyof MachineSettings>(key: K, value: MachineSettings[K]) {
    machineSettings.value[key] = value
    persistSettings()
    // P1-2修复：设置变更时通知监听者
    notifySettingsChange()
  }

  function loadMachineSettings(settings: MachineSettings) {
    machineSettings.value = { ...settings }
    persistSettings()
    // P1-2修复：设置变更时通知监听者
    notifySettingsChange()
  }

  function persistSettings() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(machineSettings.value))
    } catch (e) {
      logger.warn('Failed to persist settings:', e)
    }
  }

  function setCalculating(calculating: boolean) {
    isCalculating.value = calculating
  }

  function setResultItems(items: ResultItem[]) {
    resultItems.value = items
  }

  function setError(error: string | null) {
    calculationError.value = error
  }

  function clearAll() {
    demandList.value = []
    excludeList.value = []
    resultItems.value = []
    calculationError.value = null
    demandVersion.value++
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
    onSettingsChange
  }
})
