/**
 * DemandStore - 需求管理Store
 *
 * 功能：
 * - 管理需求列表和排除列表
 * - 提供需求增删改查接口
 * - 支持需求版本追踪
 * - 自动同步到遗留代码
 *
 * 主要状态：
 * - demandList: 需求列表
 * - excludeList: 排除列表
 * - demandVersion: 需求版本号
 *
 * 主要方法：
 * - addDemand(name, num): 添加需求
 * - removeDemand(name): 移除需求
 * - updateDemand(name, num): 更新需求数量
 * - addExclude(name): 添加排除项
 * - removeExclude(name): 移除排除项
 * - createSnapshot(): 创建状态快照
 * - validateSnapshot(snapshot): 验证快照
 *
 * 上游调用：
 * - App.vue: 主应用组件
 * - components/DemandList.vue: 需求列表组件
 * - stores/blueprint.ts: 原始Store（向后兼容）
 *
 * 下游依赖：
 * - core/bridge.ts: 状态同步桥
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { logger } from '../utils/logger'
import { syncStateToLegacy } from '../core/bridge'

export interface DemandItem {
  name: string
  num: number
}

export interface IStateSnapshot {
  demandVersion: number
  demandList: DemandItem[]
  excludeList: string[]
}

const DEMAND_STORAGE_KEY = 'dsq_demand_list'
const EXCLUDE_STORAGE_KEY = 'dsq_exclude_list'

function loadPersistedDemands(): DemandItem[] {
  try {
    const saved = localStorage.getItem(DEMAND_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    logger.warn('Failed to load persisted demands:', e)
  }
  return []
}

function loadPersistedExcludes(): string[] {
  try {
    const saved = localStorage.getItem(EXCLUDE_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    logger.warn('Failed to load persisted excludes:', e)
  }
  return []
}

export const useDemandStore = defineStore('demand', () => {
  const demandList = ref<DemandItem[]>([])
  const excludeList = ref<string[]>([])
  const demandVersion = ref(0)

  const hasDemand = computed(() => demandList.value.length > 0)
  const demandCount = computed(() => demandList.value.length)

  let syncEnabled = false
  let lastSyncVersion = 0
  let isSyncing = false
  let isInitializing = false
  let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
  let pendingSyncResolve: (() => void) | null = null
  let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null
  const SYNC_DEBOUNCE_MS = 16
  const PERSIST_DEBOUNCE_MS = 100

  function enableSync() {
    syncEnabled = true
  }

  function loadFromLegacy(legacyDemands: DemandItem[], legacyExcludes: string[]): void {
    isInitializing = true
    try {
      demandList.value = legacyDemands.map(d => ({ ...d }))
      excludeList.value = [...legacyExcludes]
      demandVersion.value++
      lastSyncVersion = demandVersion.value
      logger.log(
        '[DemandStore] Loaded from legacy:',
        legacyDemands.length,
        'demands,',
        legacyExcludes.length,
        'excludes'
      )
    } finally {
      isInitializing = false
    }
  }

  function doSyncToLegacy(force: boolean = false): Promise<boolean> {
    return new Promise(resolve => {
      if (!syncEnabled) {
        resolve(false)
        return
      }
      if (isSyncing) {
        resolve(false)
        return
      }
      if (isInitializing) {
        resolve(false)
        return
      }

      if (!force && lastSyncVersion === demandVersion.value) {
        resolve(false)
        return
      }

      isSyncing = true
      try {
        syncStateToLegacy({
          demandList: demandList.value,
          excludeList: excludeList.value
        })
        lastSyncVersion = demandVersion.value
        resolve(true)
      } catch (e) {
        logger.warn('[DemandStore] Failed to sync to legacy:', e)
        resolve(false)
      } finally {
        isSyncing = false
        if (pendingSyncResolve) {
          pendingSyncResolve()
          pendingSyncResolve = null
        }
      }
    })
  }

  function debouncedSyncToLegacy(): Promise<boolean> {
    return new Promise(resolve => {
      if (isInitializing) {
        resolve(false)
        return
      }
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer)
      }
      syncDebounceTimer = setTimeout(async () => {
        syncDebounceTimer = null
        const result = await doSyncToLegacy()
        resolve(result)
      }, SYNC_DEBOUNCE_MS)
    })
  }

  async function forceSyncToLegacy(): Promise<boolean> {
    if (isInitializing) return false

    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer)
      syncDebounceTimer = null
    }

    if (isSyncing) {
      await new Promise<void>(resolve => {
        pendingSyncResolve = resolve
      })
    }

    return doSyncToLegacy(true)
  }

  function getSyncStatus(): { enabled: boolean; lastVersion: number; currentVersion: number } {
    return {
      enabled: syncEnabled,
      lastVersion: lastSyncVersion,
      currentVersion: demandVersion.value
    }
  }

  watch(
    [demandList, excludeList],
    () => {
      if (!isInitializing) {
        debouncedSyncToLegacy()
        persistDemands()
        persistExcludes()
      }
    },
    { deep: true }
  )

  function persistDemands() {
    if (persistDebounceTimer) {
      clearTimeout(persistDebounceTimer)
    }
    persistDebounceTimer = setTimeout(() => {
      persistDebounceTimer = null
      try {
        localStorage.setItem(DEMAND_STORAGE_KEY, JSON.stringify(demandList.value))
      } catch (e) {
        logger.warn('Failed to persist demands:', e)
      }
    }, PERSIST_DEBOUNCE_MS)
  }

  function persistExcludes() {
    if (persistDebounceTimer) {
      clearTimeout(persistDebounceTimer)
    }
    persistDebounceTimer = setTimeout(() => {
      persistDebounceTimer = null
      try {
        localStorage.setItem(EXCLUDE_STORAGE_KEY, JSON.stringify(excludeList.value))
      } catch (e) {
        logger.warn('Failed to persist excludes:', e)
      }
    }, PERSIST_DEBOUNCE_MS)
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
    if (snapshot.demandVersion !== demandVersion.value) {
      return false
    }

    if (snapshot.demandList.length !== demandList.value.length) {
      return false
    }

    if (snapshot.excludeList.length !== excludeList.value.length) {
      return false
    }

    for (let i = 0; i < snapshot.demandList.length; i++) {
      const snap = snapshot.demandList[i]
      const curr = demandList.value[i]
      if (snap.name !== curr.name || snap.num !== curr.num) {
        return false
      }
    }

    for (let i = 0; i < snapshot.excludeList.length; i++) {
      if (snapshot.excludeList[i] !== excludeList.value[i]) {
        return false
      }
    }

    return true
  }

  function clearAll() {
    demandList.value = []
    excludeList.value = []
    demandVersion.value++
  }

  return {
    demandList,
    excludeList,
    demandVersion,
    hasDemand,
    demandCount,
    addDemand,
    removeDemand,
    updateDemand,
    addExclude,
    removeExclude,
    createSnapshot,
    validateSnapshot,
    clearAll,
    enableSync,
    forceSyncToLegacy,
    getSyncStatus,
    loadFromLegacy
  }
})
