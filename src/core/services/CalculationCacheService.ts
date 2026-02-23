/**
 * CalculationCacheService - 计算缓存服务
 *
 * 功能：
 * - 统一管理计算过程中的所有缓存数据
 * - 提供缓存获取、设置、失效接口
 * - 支持缓存版本控制和增量更新
 * - 解决缓存分散在多个服务中的问题
 *
 * 缓存类型：
 * - orbitalCollectorTCache: 轨道采集器t值缓存
 * - criticalPhotonTCache: 临界光子t值缓存
 * - criticalPhotonLensNCache: 临界光子引力透镜需求缓存
 * - recipeTCache: 配方t值缓存（通用）
 *
 * 上游调用：
 * - core/services/UpdateAllService.ts: 更新服务
 * - core/services/RecipeCalculator.ts: 配方计算器
 * - core/workers/CalculatorWorkerService.ts: Worker服务
 *
 * 架构师注：
 * - 此服务替代分散在多个服务中的缓存变量
 * - 使用单例模式，全局共享缓存
 * - 支持缓存版本控制，便于增量更新
 */
import { logger } from '../../utils/logger'

export interface IOrbitalCollectorCache {
  recipeId: number
  productName: string
  t: number
}

export interface ICriticalPhotonCache {
  t: number | null
  lensN: number | null
  recipeId?: number
}

export interface ICacheVersion {
  settingsTimeHash: string
  settingsPfHash: string
  settingsHash: string
  timestamp: number
}

export interface ICacheStats {
  orbitalCollectorCount: number
  hasCriticalPhotonCache: boolean
  version: ICacheVersion | null
  lastUpdate: number
}

class CalculationCacheService {
  private orbitalCollectorTCache: Map<string, number> = new Map()
  private criticalPhotonCache: ICriticalPhotonCache = { t: null, lensN: null }
  private recipeTCache: Map<number, number> = new Map()
  private version: ICacheVersion | null = null
  private lastUpdate: number = 0
  private hashCache: Map<string, string> = new Map()

  private computeHash(obj: Record<string, unknown>): string {
    const keys = Object.keys(obj)
    const keyCount = keys.length

    if (keyCount === 0) return 'empty'

    if (keyCount <= 50) {
      let hash = 0
      for (let i = 0; i < keyCount; i++) {
        const key = keys[i]
        const value = obj[key]
        for (let j = 0; j < key.length; j++) {
          hash = ((hash << 5) - hash + key.charCodeAt(j)) | 0
        }
        if (typeof value === 'number') {
          hash = ((hash << 5) - hash + value) | 0
        } else if (typeof value === 'string') {
          for (let j = 0; j < value.length; j++) {
            hash = ((hash << 5) - hash + value.charCodeAt(j)) | 0
          }
        }
      }
      return `${keyCount}:${hash >>> 0}`
    }

    const cacheKey = `${keyCount}:${keys.slice(0, 5).join(',')}`
    const cached = this.hashCache.get(cacheKey)
    if (cached) return cached

    let hash = 0
    const step = Math.max(1, Math.floor(keyCount / 50))

    for (let i = 0; i < keyCount; i += step) {
      const key = keys[i]
      const value = obj[key]
      if (typeof value === 'number') {
        hash = ((hash << 5) - hash + value) | 0
      } else if (typeof value === 'string') {
        for (let j = 0; j < value.length; j++) {
          hash = ((hash << 5) - hash + value.charCodeAt(j)) | 0
        }
      }
      hash = ((hash << 5) - hash + key.length) | 0
    }

    const result = `${keyCount}:${hash >>> 0}`
    this.hashCache.set(cacheKey, result)
    return result
  }

  setOrbitalCollectorT(recipeId: number | undefined, productName: string, t: number): boolean {
    if (recipeId === undefined) {
      logger.warn('[CalculationCacheService] Cannot set orbital collector T: recipeId is undefined')
      return false
    }
    const key = `${recipeId}-${productName}`
    this.orbitalCollectorTCache.set(key, t)
    this.lastUpdate = Date.now()
    return true
  }

  getOrbitalCollectorT(recipeId: number | undefined, productName: string): number | undefined {
    if (recipeId === undefined) return undefined
    const key = `${recipeId}-${productName}`
    return this.orbitalCollectorTCache.get(key)
  }

  hasOrbitalCollectorT(recipeId: number | undefined, productName: string): boolean {
    if (recipeId === undefined) return false
    const key = `${recipeId}-${productName}`
    return this.orbitalCollectorTCache.has(key)
  }

  setCriticalPhotonCache(t: number | null, lensN: number | null, recipeId?: number): void {
    this.criticalPhotonCache = { t, lensN, recipeId }
    this.lastUpdate = Date.now()
  }

  getCriticalPhotonCache(): ICriticalPhotonCache {
    return { ...this.criticalPhotonCache }
  }

  getCriticalPhotonT(): number | null {
    return this.criticalPhotonCache.t
  }

  getCriticalPhotonLensN(): number | null {
    return this.criticalPhotonCache.lensN
  }

  hasCriticalPhotonCache(): boolean {
    return this.criticalPhotonCache.t !== null
  }

  setRecipeT(recipeId: number, t: number): void {
    this.recipeTCache.set(recipeId, t)
    this.lastUpdate = Date.now()
  }

  getRecipeT(recipeId: number): number | undefined {
    return this.recipeTCache.get(recipeId)
  }

  updateVersion(
    settingsTime: Record<string, number>,
    settingsPf: Record<string, string | number>,
    settings: Record<string, { accType?: string; accValue?: string }>
  ): void {
    this.version = {
      settingsTimeHash: this.computeHash(settingsTime as Record<string, unknown>),
      settingsPfHash: this.computeHash(settingsPf as Record<string, unknown>),
      settingsHash: this.computeHash(settings as Record<string, unknown>),
      timestamp: Date.now()
    }
  }

  isVersionChanged(
    settingsTime: Record<string, number>,
    settingsPf: Record<string, string | number>,
    settings: Record<string, { accType?: string; accValue?: string }>
  ): boolean {
    if (!this.version) return true

    const newSettingsTimeHash = this.computeHash(settingsTime as Record<string, unknown>)
    const newSettingsPfHash = this.computeHash(settingsPf as Record<string, unknown>)
    const newSettingsHash = this.computeHash(settings as Record<string, unknown>)

    return (
      this.version.settingsTimeHash !== newSettingsTimeHash ||
      this.version.settingsPfHash !== newSettingsPfHash ||
      this.version.settingsHash !== newSettingsHash
    )
  }

  clearOrbitalCollectorCache(): void {
    this.orbitalCollectorTCache.clear()
    this.lastUpdate = Date.now()
    logger.log('[CalculationCacheService] Orbital collector cache cleared')
  }

  clearCriticalPhotonCache(): void {
    this.criticalPhotonCache = { t: null, lensN: null }
    this.lastUpdate = Date.now()
    logger.log('[CalculationCacheService] Critical photon cache cleared')
  }

  clearRecipeTCache(): void {
    this.recipeTCache.clear()
    this.lastUpdate = Date.now()
    logger.log('[CalculationCacheService] Recipe t cache cleared')
  }

  clearAll(): void {
    this.orbitalCollectorTCache.clear()
    this.criticalPhotonCache = { t: null, lensN: null }
    this.recipeTCache.clear()
    this.hashCache.clear()
    this.version = null
    this.lastUpdate = Date.now()
    logger.log('[CalculationCacheService] All caches cleared')
  }

  getStats(): ICacheStats {
    return {
      orbitalCollectorCount: this.orbitalCollectorTCache.size,
      hasCriticalPhotonCache: this.criticalPhotonCache.t !== null,
      version: this.version ? { ...this.version } : null,
      lastUpdate: this.lastUpdate
    }
  }

  exportToWorker(): {
    orbitalCollectorTCache: Record<string, number>
    criticalPhotonTCache: number | null
    criticalPhotonLensNCache: number | null
  } {
    const orbitalCollectorTCache: Record<string, number> = {}
    this.orbitalCollectorTCache.forEach((value, key) => {
      orbitalCollectorTCache[key] = value
    })

    return {
      orbitalCollectorTCache,
      criticalPhotonTCache: this.criticalPhotonCache.t,
      criticalPhotonLensNCache: this.criticalPhotonCache.lensN
    }
  }

  importFromWorker(data: {
    orbitalCollectorTCache?: Record<string, number>
    criticalPhotonTCache?: number | null
    criticalPhotonLensNCache?: number | null
    timestamp?: number
  }): void {
    if (data.timestamp && data.timestamp < this.lastUpdate) {
      logger.log('[CalculationCacheService] Worker cache is older, skipping import')
      return
    }

    if (data.orbitalCollectorTCache) {
      this.orbitalCollectorTCache.clear()
      for (const [key, value] of Object.entries(data.orbitalCollectorTCache)) {
        this.orbitalCollectorTCache.set(key, value)
      }
    }

    if (data.criticalPhotonTCache !== undefined || data.criticalPhotonLensNCache !== undefined) {
      this.criticalPhotonCache = {
        t: data.criticalPhotonTCache ?? null,
        lensN: data.criticalPhotonLensNCache ?? null
      }
    }

    this.lastUpdate = Date.now()
    logger.log('[CalculationCacheService] Cache imported from worker')
  }

  getOrbitalCollectorCacheAsMap(): Map<string, number> {
    return new Map(this.orbitalCollectorTCache)
  }
}

export const calculationCacheService = new CalculationCacheService()
