import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBlueprintStore } from '../blueprint'

const SETTINGS_STORAGE_KEY = 'machine_settings20240202'

describe('BlueprintStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('demandList', () => {
    it('starts with empty demand list', () => {
      const store = useBlueprintStore()
      expect(store.demandList).toHaveLength(0)
      expect(store.hasDemand).toBe(false)
      expect(store.demandCount).toBe(0)
    })

    it('adds demand correctly', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)

      expect(store.demandList).toHaveLength(1)
      expect(store.demandList[0]).toEqual({ name: 'ironOre', num: 100 })
      expect(store.hasDemand).toBe(true)
      expect(store.demandCount).toBe(1)
    })

    it('updates existing demand when adding same item', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      store.addDemand('ironOre', 50)

      expect(store.demandList).toHaveLength(1)
      expect(store.demandList[0].num).toBe(150)
    })

    it('removes demand correctly', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      store.removeDemand('ironOre')

      expect(store.demandList).toHaveLength(0)
    })

    it('updates demand number', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      store.updateDemand('ironOre', 200)

      expect(store.demandList[0].num).toBe(200)
    })

    it('does not allow demand number below 1', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      store.updateDemand('ironOre', 0)

      expect(store.demandList[0].num).toBe(1)
    })

    it('does not update non-existent demand', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      store.updateDemand('copperOre', 200)

      expect(store.demandList).toHaveLength(1)
      expect(store.demandList[0].name).toBe('ironOre')
    })

    it('removes only specified demand', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      store.addDemand('copperOre', 50)

      store.removeDemand('ironOre')

      expect(store.demandList).toHaveLength(1)
      expect(store.demandList[0].name).toBe('copperOre')
    })

    it('increments demandVersion on add', () => {
      const store = useBlueprintStore()
      const initialVersion = store.demandVersion

      store.addDemand('ironOre', 100)

      expect(store.demandVersion).toBe(initialVersion + 1)
    })

    it('increments demandVersion on remove', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      const versionAfterAdd = store.demandVersion

      store.removeDemand('ironOre')

      expect(store.demandVersion).toBe(versionAfterAdd + 1)
    })

    it('increments demandVersion on update', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      const versionAfterAdd = store.demandVersion

      store.updateDemand('ironOre', 200)

      expect(store.demandVersion).toBe(versionAfterAdd + 1)
    })

    it('defaults num to 1 when not provided', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre')

      expect(store.demandList[0].num).toBe(1)
    })

    it('handles multiple demands correctly', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      store.addDemand('copperOre', 50)
      store.addDemand('gear', 30)

      expect(store.demandList).toHaveLength(3)
      expect(store.demandCount).toBe(3)
    })
  })

  describe('excludeList', () => {
    it('starts with empty exclude list', () => {
      const store = useBlueprintStore()
      expect(store.excludeList).toHaveLength(0)
    })

    it('adds exclude correctly', () => {
      const store = useBlueprintStore()
      store.addExclude('ironOre')

      expect(store.excludeList).toContain('ironOre')
    })

    it('does not add duplicate excludes', () => {
      const store = useBlueprintStore()
      store.addExclude('ironOre')
      store.addExclude('ironOre')

      expect(store.excludeList).toHaveLength(1)
    })

    it('removes exclude correctly', () => {
      const store = useBlueprintStore()
      store.addExclude('ironOre')
      store.removeExclude('ironOre')

      expect(store.excludeList).toHaveLength(0)
    })

    it('increments demandVersion on addExclude', () => {
      const store = useBlueprintStore()
      const initialVersion = store.demandVersion

      store.addExclude('ironOre')

      expect(store.demandVersion).toBe(initialVersion + 1)
    })

    it('increments demandVersion on removeExclude', () => {
      const store = useBlueprintStore()
      store.addExclude('ironOre')
      const versionAfterAdd = store.demandVersion

      store.removeExclude('ironOre')

      expect(store.demandVersion).toBe(versionAfterAdd + 1)
    })

    it('does not increment version when adding duplicate exclude', () => {
      const store = useBlueprintStore()
      store.addExclude('ironOre')
      const versionAfterAdd = store.demandVersion

      store.addExclude('ironOre')

      expect(store.demandVersion).toBe(versionAfterAdd)
    })

    it('handles multiple excludes correctly', () => {
      const store = useBlueprintStore()
      store.addExclude('ironOre')
      store.addExclude('copperOre')
      store.addExclude('coal')

      expect(store.excludeList).toHaveLength(3)
      expect(store.excludeList).toContain('ironOre')
      expect(store.excludeList).toContain('copperOre')
      expect(store.excludeList).toContain('coal')
    })

    it('does nothing when removing non-existent exclude', () => {
      const store = useBlueprintStore()
      store.addExclude('ironOre')

      store.removeExclude('copperOre')

      expect(store.excludeList).toHaveLength(1)
    })
  })

  describe('snapshot', () => {
    it('creates valid snapshot', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      store.addExclude('copperOre')

      const snapshot = store.createSnapshot()

      expect(snapshot.demandVersion).toBe(2)
      expect(snapshot.demandList).toHaveLength(1)
      expect(snapshot.excludeList).toHaveLength(1)
    })

    it('validates matching snapshot', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)

      const snapshot = store.createSnapshot()
      expect(store.validateSnapshot(snapshot)).toBe(true)
    })

    it('invalidates mismatched snapshot', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)

      const snapshot = store.createSnapshot()
      store.addDemand('copperOre', 50)

      expect(store.validateSnapshot(snapshot)).toBe(false)
    })

    it('snapshot contains copy of demandList', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)

      const snapshot = store.createSnapshot()
      store.updateDemand('ironOre', 200)

      expect(snapshot.demandList[0].num).toBe(100)
    })

    it('snapshot contains copy of excludeList', () => {
      const store = useBlueprintStore()
      store.addExclude('ironOre')

      const snapshot = store.createSnapshot()
      store.removeExclude('ironOre')

      expect(snapshot.excludeList).toContain('ironOre')
    })
  })

  describe('calculating state', () => {
    it('starts with isCalculating false', () => {
      const store = useBlueprintStore()
      expect(store.isCalculating).toBe(false)
    })

    it('sets calculating state', () => {
      const store = useBlueprintStore()
      store.setCalculating(true)
      expect(store.isCalculating).toBe(true)
    })

    it('can reset calculating state', () => {
      const store = useBlueprintStore()
      store.setCalculating(true)
      store.setCalculating(false)
      expect(store.isCalculating).toBe(false)
    })
  })

  describe('error state', () => {
    it('starts with null error', () => {
      const store = useBlueprintStore()
      expect(store.calculationError).toBe(null)
    })

    it('sets error state', () => {
      const store = useBlueprintStore()
      store.setError('Test error')
      expect(store.calculationError).toBe('Test error')
    })

    it('can clear error', () => {
      const store = useBlueprintStore()
      store.setError('Test error')
      store.setError(null)
      expect(store.calculationError).toBe(null)
    })
  })

  describe('result items', () => {
    it('starts with empty result items', () => {
      const store = useBlueprintStore()
      expect(store.resultItems).toHaveLength(0)
    })

    it('sets result items', () => {
      const store = useBlueprintStore()
      const items = [{ name: 'ironOre', num: 100 }]

      store.setResultItems(items)

      expect(store.resultItems).toEqual(items)
    })

    it('replaces existing result items', () => {
      const store = useBlueprintStore()
      store.setResultItems([{ name: 'ironOre', num: 100 }])
      store.setResultItems([{ name: 'copperOre', num: 50 }])

      expect(store.resultItems).toHaveLength(1)
      expect(store.resultItems[0].name).toBe('copperOre')
    })
  })

  describe('machine settings', () => {
    it('has default settings', () => {
      const store = useBlueprintStore()

      expect(store.machineSettings.modeIn).toBe('制作台Mk.Ⅰ')
      expect(store.machineSettings.furnace).toBe('电弧熔炉')
      expect(store.machineSettings.chemical).toBe('化工厂')
      expect(store.machineSettings.accType).toBe('增产剂Mk.Ⅰ')
      expect(store.machineSettings.accValue).toBe('无')
      expect(store.machineSettings.research).toBe('矩阵研究站')
    })

    it('updates single setting', () => {
      const store = useBlueprintStore()

      store.setMachineSetting('modeIn', '制作台Mk.Ⅱ')

      expect(store.machineSettings.modeIn).toBe('制作台Mk.Ⅱ')
    })

    it('loads multiple settings', () => {
      const store = useBlueprintStore()

      store.loadMachineSettings({
        modeIn: '制作台Mk.Ⅲ',
        furnace: '位面熔炉',
        chemical: '化工厂',
        accType: '增产剂Mk.Ⅰ',
        accValue: '无',
        research: '矩阵研究站'
      })

      expect(store.machineSettings.modeIn).toBe('制作台Mk.Ⅲ')
      expect(store.machineSettings.furnace).toBe('位面熔炉')
    })

    it('persists settings to localStorage', () => {
      const store = useBlueprintStore()

      store.setMachineSetting('modeIn', '制作台Mk.Ⅱ')

      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
      expect(saved).toBeTruthy()
      const parsed = JSON.parse(saved as string)
      expect(parsed.modeIn).toBe('制作台Mk.Ⅱ')
    })

    it('loads persisted settings on store creation', () => {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          modeIn: '制作台Mk.Ⅲ',
          furnace: '位面熔炉',
          chemical: '量子化工',
          accType: '增产剂Mk.Ⅱ',
          accValue: '加速',
          research: '研究站Mk.Ⅱ'
        })
      )

      setActivePinia(createPinia())
      const store = useBlueprintStore()

      expect(store.machineSettings.modeIn).toBe('制作台Mk.Ⅲ')
      expect(store.machineSettings.furnace).toBe('位面熔炉')
      expect(store.machineSettings.chemical).toBe('量子化工')
    })

    it('handles invalid localStorage data gracefully', () => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, 'invalid json')

      setActivePinia(createPinia())
      const store = useBlueprintStore()

      expect(store.machineSettings.modeIn).toBe('制作台Mk.Ⅰ')
    })
  })

  describe('clearAll', () => {
    it('clears all state', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      store.addExclude('copperOre')
      store.setResultItems([{ name: 'test', num: 1 }])
      store.setError('test error')

      store.clearAll()

      expect(store.demandList).toHaveLength(0)
      expect(store.excludeList).toHaveLength(0)
      expect(store.resultItems).toHaveLength(0)
      expect(store.calculationError).toBe(null)
    })

    it('increments demandVersion on clearAll', () => {
      const store = useBlueprintStore()
      store.addDemand('ironOre', 100)
      const versionBefore = store.demandVersion

      store.clearAll()

      expect(store.demandVersion).toBe(versionBefore + 1)
    })

    it('does not clear machine settings', () => {
      const store = useBlueprintStore()
      store.setMachineSetting('modeIn', '制作台Mk.Ⅱ')

      store.clearAll()

      expect(store.machineSettings.modeIn).toBe('制作台Mk.Ⅱ')
    })
  })

  describe('persistence edge cases', () => {
    it('handles localStorage quota exceeded', () => {
      const store = useBlueprintStore()

      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => store.setMachineSetting('modeIn', '制作台Mk.Ⅱ')).not.toThrow()

      localStorage.setItem = originalSetItem
    })
  })
})
