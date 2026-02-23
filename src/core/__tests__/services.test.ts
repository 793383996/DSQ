import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculationCacheService, type ICacheStats } from '../services/CalculationCacheService'
import {
  calculationStateService,
  type ICalculationState
} from '../services/CalculationStateService'
import { initializationService, InitState } from '../services/InitializationService'

describe('CalculationCacheService', () => {
  beforeEach(() => {
    calculationCacheService.clearAll()
  })

  describe('Orbital Collector Cache', () => {
    it('should set and get orbital collector t value', () => {
      calculationCacheService.setOrbitalCollectorT(1, '氢', 0.5)
      const result = calculationCacheService.getOrbitalCollectorT(1, '氢')
      expect(result).toBe(0.5)
    })

    it('should return undefined for non-existent cache', () => {
      const result = calculationCacheService.getOrbitalCollectorT(999, '不存在')
      expect(result).toBeUndefined()
    })

    it('should check if cache exists', () => {
      expect(calculationCacheService.hasOrbitalCollectorT(1, '氢')).toBe(false)
      calculationCacheService.setOrbitalCollectorT(1, '氢', 0.5)
      expect(calculationCacheService.hasOrbitalCollectorT(1, '氢')).toBe(true)
    })

    it('should clear orbital collector cache', () => {
      calculationCacheService.setOrbitalCollectorT(1, '氢', 0.5)
      calculationCacheService.setOrbitalCollectorT(2, '重氢', 0.3)
      calculationCacheService.clearOrbitalCollectorCache()
      expect(calculationCacheService.getOrbitalCollectorT(1, '氢')).toBeUndefined()
      expect(calculationCacheService.getOrbitalCollectorT(2, '重氢')).toBeUndefined()
    })
  })

  describe('Critical Photon Cache', () => {
    it('should set and get critical photon cache', () => {
      calculationCacheService.setCriticalPhotonCache(5.0, 0.0083, 100)
      const cache = calculationCacheService.getCriticalPhotonCache()
      expect(cache.t).toBe(5.0)
      expect(cache.lensN).toBe(0.0083)
      expect(cache.recipeId).toBe(100)
    })

    it('should get individual cache values', () => {
      calculationCacheService.setCriticalPhotonCache(5.0, 0.0083)
      expect(calculationCacheService.getCriticalPhotonT()).toBe(5.0)
      expect(calculationCacheService.getCriticalPhotonLensN()).toBe(0.0083)
    })

    it('should check if critical photon cache exists', () => {
      expect(calculationCacheService.hasCriticalPhotonCache()).toBe(false)
      calculationCacheService.setCriticalPhotonCache(5.0, 0.0083)
      expect(calculationCacheService.hasCriticalPhotonCache()).toBe(true)
    })

    it('should handle null values', () => {
      calculationCacheService.setCriticalPhotonCache(null, null)
      expect(calculationCacheService.hasCriticalPhotonCache()).toBe(false)
    })
  })

  describe('Version Control', () => {
    it('should detect version changes', () => {
      const settingsTime = { 采矿机: 100 }
      const settingsPf = { 铁板: 1 }
      const settings = { '1': { accType: '增产剂Mk.Ⅰ' } }

      expect(calculationCacheService.isVersionChanged(settingsTime, settingsPf, settings)).toBe(
        true
      )

      calculationCacheService.updateVersion(settingsTime, settingsPf, settings)
      expect(calculationCacheService.isVersionChanged(settingsTime, settingsPf, settings)).toBe(
        false
      )

      const newSettingsTime = { 采矿机: 200 }
      expect(calculationCacheService.isVersionChanged(newSettingsTime, settingsPf, settings)).toBe(
        true
      )
    })
  })

  describe('Statistics', () => {
    it('should return cache statistics', () => {
      calculationCacheService.setOrbitalCollectorT(1, '氢', 0.5)
      calculationCacheService.setCriticalPhotonCache(5.0, 0.0083)

      const stats = calculationCacheService.getStats()
      expect(stats.orbitalCollectorCount).toBe(1)
      expect(stats.hasCriticalPhotonCache).toBe(true)
      expect(stats.lastUpdate).toBeGreaterThan(0)
    })
  })

  describe('Worker Export/Import', () => {
    it('should export cache for worker', () => {
      calculationCacheService.setOrbitalCollectorT(1, '氢', 0.5)
      calculationCacheService.setCriticalPhotonCache(5.0, 0.0083)

      const exported = calculationCacheService.exportToWorker()
      expect(exported.orbitalCollectorTCache['1-氢']).toBe(0.5)
      expect(exported.criticalPhotonTCache).toBe(5.0)
      expect(exported.criticalPhotonLensNCache).toBe(0.0083)
    })

    it('should import cache from worker', () => {
      const data = {
        orbitalCollectorTCache: { '1-氢': 0.5 },
        criticalPhotonTCache: 5.0,
        criticalPhotonLensNCache: 0.0083
      }

      calculationCacheService.importFromWorker(data)

      expect(calculationCacheService.getOrbitalCollectorT(1, '氢')).toBe(0.5)
      expect(calculationCacheService.getCriticalPhotonT()).toBe(5.0)
    })
  })
})

describe('CalculationStateService', () => {
  beforeEach(() => {
    calculationStateService.clear()
  })

  describe('State Management', () => {
    it('should set and get demands', () => {
      calculationStateService.setDemands([{ name: '铁板', num: 100 }])
      const demands = calculationStateService.getDemands()
      expect(demands).toHaveLength(1)
      expect(demands[0].name).toBe('铁板')
      expect(demands[0].num).toBe(100)
    })

    it('should set and get excludes', () => {
      calculationStateService.setExcludes(['氢', '重氢'])
      const excludes = calculationStateService.getExcludes()
      expect(excludes).toHaveLength(2)
      expect(excludes).toContain('氢')
    })

    it('should set and get settings', () => {
      const settings = { '1': { accType: '增产剂Mk.Ⅰ', accValue: '加速' } }
      calculationStateService.setSettings(settings)
      const result = calculationStateService.getSettings()
      expect(result['1'].accType).toBe('增产剂Mk.Ⅰ')
    })

    it('should set and get machine settings', () => {
      calculationStateService.setMachineSettings({
        modeIn: '制作台Mk.Ⅲ',
        furnace: '电弧熔炉'
      })
      const ms = calculationStateService.getMachineSettings()
      expect(ms.modeIn).toBe('制作台Mk.Ⅲ')
      expect(calculationStateService.getDefaultAccType()).toBe('增产剂Mk.Ⅰ')
    })
  })

  describe('Version Control', () => {
    it('should increment version on state change', () => {
      const version1 = calculationStateService.getVersion()
      calculationStateService.setDemands([{ name: '铁板', num: 100 }])
      const version2 = calculationStateService.getVersion()
      expect(version2.version).toBeGreaterThan(version1.version)
    })

    it('should validate state version', () => {
      calculationStateService.setDemands([{ name: '铁板', num: 100 }])
      const version = calculationStateService.getVersion().version
      expect(calculationStateService.validateState(version)).toBe(true)
      expect(calculationStateService.validateState(version - 1)).toBe(false)
    })

    it('should detect state changes', () => {
      calculationStateService.setDemands([{ name: '铁板', num: 100 }])
      const version = calculationStateService.getVersion().version
      expect(calculationStateService.isStateChangedSince(version)).toBe(false)
      calculationStateService.setDemands([{ name: '铜板', num: 50 }])
      expect(calculationStateService.isStateChangedSince(version)).toBe(true)
    })
  })

  describe('State Subscription', () => {
    it('should notify listeners on state change', () => {
      const listener = vi.fn()
      calculationStateService.subscribe(listener)

      calculationStateService.setDemands([{ name: '铁板', num: 100 }])

      expect(listener).toHaveBeenCalled()
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ demands: expect.any(Array) }),
        expect.any(Number)
      )
    })

    it('should unsubscribe listener', () => {
      const listener = vi.fn()
      const unsubscribe = calculationStateService.subscribe(listener)

      unsubscribe()
      calculationStateService.setDemands([{ name: '铁板', num: 100 }])

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('Full State', () => {
    it('should get full state', () => {
      calculationStateService.setDemands([{ name: '铁板', num: 100 }])
      calculationStateService.setExcludes(['氢'])
      calculationStateService.setSettings({ '1': { accType: '增产剂Mk.Ⅰ' } })

      const state = calculationStateService.getState()
      expect(state.demands).toHaveLength(1)
      expect(state.excludes).toHaveLength(1)
      expect(state.settings['1'].accType).toBe('增产剂Mk.Ⅰ')
    })

    it('should set partial state', () => {
      calculationStateService.setState({
        demands: [{ name: '铁板', num: 100 }],
        excludes: ['氢']
      })

      const state = calculationStateService.getState()
      expect(state.demands).toHaveLength(1)
      expect(state.excludes).toHaveLength(1)
    })
  })
})

describe('InitializationService', () => {
  beforeEach(() => {
    initializationService.reset()
  })

  describe('State Management', () => {
    it('should start in IDLE state', () => {
      expect(initializationService.getState()).toBe(InitState.IDLE)
    })

    it('should transition through initialization states', () => {
      initializationService.startInitialization()
      expect(initializationService.getState()).toBe(InitState.LOADING_RECIPES)

      initializationService.setRecipesLoaded()
      expect(initializationService.getState()).toBe(InitState.LOADING_ICONS)

      initializationService.setIconsLoaded()
      expect(initializationService.getState()).toBe(InitState.BUILDING_INDEX)

      initializationService.setIndexBuilt()
      expect(initializationService.getState()).toBe(InitState.SYNCING_LEGACY)

      initializationService.setLegacySynced()
      expect(initializationService.getState()).toBe(InitState.READY)
    })

    it('should track progress', () => {
      initializationService.startInitialization()
      const progress = initializationService.getProgress()
      expect(progress.state).toBe(InitState.LOADING_RECIPES)
      expect(progress.progress).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should set error state', () => {
      initializationService.startInitialization()
      const error = new Error('Test error')
      initializationService.setError(error)

      expect(initializationService.getState()).toBe(InitState.ERROR)
      expect(initializationService.getError()).toBe(error)
      expect(initializationService.isError()).toBe(true)
    })
  })

  describe('Ready State', () => {
    it('should check if ready', () => {
      expect(initializationService.isReady()).toBe(false)
      initializationService.startInitialization()
      initializationService.setRecipesLoaded()
      initializationService.setIconsLoaded()
      initializationService.setIndexBuilt()
      initializationService.setLegacySynced()
      expect(initializationService.isReady()).toBe(true)
    })
  })

  describe('State Subscription', () => {
    it('should notify listeners on state change', () => {
      const listener = vi.fn()
      initializationService.subscribeState(listener)

      initializationService.startInitialization()

      expect(listener).toHaveBeenCalled()
    })

    it('should notify error listeners', () => {
      const listener = vi.fn()
      initializationService.subscribeError(listener)

      initializationService.startInitialization()
      initializationService.setError(new Error('Test error'))

      expect(listener).toHaveBeenCalled()
    })
  })

  describe('Wait Ready', () => {
    it('should resolve immediately if already ready', async () => {
      initializationService.startInitialization()
      initializationService.setRecipesLoaded()
      initializationService.setIconsLoaded()
      initializationService.setIndexBuilt()
      initializationService.setLegacySynced()

      await expect(initializationService.waitReady()).resolves.toBeUndefined()
    })

    it('should reject if in error state', async () => {
      initializationService.startInitialization()
      initializationService.setError(new Error('Test error'))

      await expect(initializationService.waitReady()).rejects.toThrow('Test error')
    })
  })

  describe('Reset', () => {
    it('should reset to IDLE state', () => {
      initializationService.startInitialization()
      initializationService.setRecipesLoaded()
      initializationService.reset()

      expect(initializationService.getState()).toBe(InitState.IDLE)
      expect(initializationService.getError()).toBeNull()
    })
  })

  // P1修复：新增 isCalculationReady 和 waitForCalculationReady 测试
  describe('Calculation Ready Check', () => {
    it('should return not ready when not initialized', () => {
      const result = initializationService.isCalculationReady()
      expect(result.ready).toBe(false)
      expect(result.reason).toContain('Initialization not complete')
    })

    it('should return not ready when in READY state but data not loaded', () => {
      initializationService.startInitialization()
      initializationService.setRecipesLoaded()
      initializationService.setIconsLoaded()
      initializationService.setIndexBuilt()
      initializationService.setLegacySynced()

      const result = initializationService.isCalculationReady()
      expect(result.ready).toBe(false)
      expect(result.reason).toContain('Recipe find function not available')
    })

    it('should return ready when all data is loaded', async () => {
      initializationService.startInitialization()
      initializationService.setRecipesLoaded()
      initializationService.setIconsLoaded()
      initializationService.setIndexBuilt()
      initializationService.setLegacySynced()
      ;(window as any).find = vi.fn()
      ;(window as any).data = [{ id: 1, name: 'test' }]
      ;(window as any).recipeIndexByProduct = { 铁: [1] }

      const result = initializationService.isCalculationReady()
      expect(result.ready).toBe(true)
      expect(result.reason).toBeUndefined()

      delete (window as any).find
      delete (window as any).data
      delete (window as any).recipeIndexByProduct
    })

    it('should wait for calculation ready', async () => {
      const result = await initializationService.waitForCalculationReady(100)
      expect(result.ready).toBe(false)
      expect(result.reason).toContain('Timeout')
    })

    it('should resolve immediately when already ready', async () => {
      initializationService.startInitialization()
      initializationService.setRecipesLoaded()
      initializationService.setIconsLoaded()
      initializationService.setIndexBuilt()
      initializationService.setLegacySynced()
      ;(window as any).find = vi.fn()
      ;(window as any).data = [{ id: 1, name: 'test' }]
      ;(window as any).recipeIndexByProduct = { 铁: [1] }

      const result = await initializationService.waitForCalculationReady(100)
      expect(result.ready).toBe(true)

      delete (window as any).find
      delete (window as any).data
      delete (window as any).recipeIndexByProduct
    })
  })
})
