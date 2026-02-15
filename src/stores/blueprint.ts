import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '../utils/logger'
import type { IConsumptionItem, IResultItemOutput } from '../core/types/recipe'
import type { IRecipeSettings, ISpeedSettings, IProductivitySettings } from '../core/types/settings'
import { APP_CONFIG } from '../core/config/app.config'
import { isGameDataLoaded } from '../core/bridge'

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
}

export interface IStateSnapshot {
  demandVersion: number
  demandList: DemandItem[]
  excludeList: string[]
}

export type ResultItem = IConsumptionItem | IResultItemOutput

const SETTINGS_STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.MACHINE_SETTINGS + APP_CONFIG.VERSION

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
    research: '矩阵研究站'
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

  function checkIconsLoaded() {
    isIconsLoaded.value = isGameDataLoaded()
    return isIconsLoaded.value
  }

  function syncRecipeSettings(settings: IRecipeSettings) {
    recipeSettings.value = { ...settings }
  }

  function syncSpeedSettings(settings: ISpeedSettings) {
    speedSettings.value = { ...settings }
  }

  function syncProductivitySettings(settings: IProductivitySettings) {
    productivitySettings.value = { ...settings }
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
  }

  function loadMachineSettings(settings: MachineSettings) {
    machineSettings.value = { ...settings }
    persistSettings()
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
    syncAllSettings
  }
})
