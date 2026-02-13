import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

const SETTINGS_STORAGE_KEY = 'machine_settings20240202'

function loadPersistedSettings(): MachineSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.warn('Failed to load persisted settings:', e)
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
  const resultItems = ref<any[]>([])
  const isCalculating = ref(false)
  const calculationError = ref<string | null>(null)

  const hasDemand = computed(() => demandList.value.length > 0)
  const demandCount = computed(() => demandList.value.length)

  function addDemand(name: string, num: number = 1) {
    const existing = demandList.value.find(item => item.name === name)
    if (existing) {
      existing.num += num
    } else {
      demandList.value.push({ name, num })
    }
  }

  function removeDemand(name: string) {
    demandList.value = demandList.value.filter(item => item.name !== name)
  }

  function updateDemand(name: string, num: number) {
    const item = demandList.value.find(item => item.name === name)
    if (item) {
      item.num = Math.max(1, num)
    }
  }

  function addExclude(name: string) {
    if (!excludeList.value.includes(name)) {
      excludeList.value.push(name)
    }
  }

  function removeExclude(name: string) {
    excludeList.value = excludeList.value.filter(n => n !== name)
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
      console.warn('Failed to persist settings:', e)
    }
  }

  function setCalculating(calculating: boolean) {
    isCalculating.value = calculating
  }

  function setResultItems(items: any[]) {
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
  }

  return {
    demandList,
    excludeList,
    machineSettings,
    resultItems,
    isCalculating,
    calculationError,
    hasDemand,
    demandCount,
    addDemand,
    removeDemand,
    updateDemand,
    addExclude,
    removeExclude,
    setMachineSetting,
    loadMachineSettings,
    setCalculating,
    setResultItems,
    setError,
    clearAll
  }
})
