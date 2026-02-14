import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBlueprintStore } from '../blueprint'

describe('BlueprintStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
  })

  describe('calculating state', () => {
    it('sets calculating state', () => {
      const store = useBlueprintStore()
      expect(store.isCalculating).toBe(false)

      store.setCalculating(true)
      expect(store.isCalculating).toBe(true)
    })
  })

  describe('error state', () => {
    it('sets error state', () => {
      const store = useBlueprintStore()
      expect(store.calculationError).toBe(null)

      store.setError('Test error')
      expect(store.calculationError).toBe('Test error')
    })
  })

  describe('result items', () => {
    it('sets result items', () => {
      const store = useBlueprintStore()
      const items = [{ name: 'ironOre', num: 100 }]

      store.setResultItems(items)

      expect(store.resultItems).toEqual(items)
    })
  })

  describe('machine settings', () => {
    it('has default settings', () => {
      const store = useBlueprintStore()

      expect(store.machineSettings.modeIn).toBe('制作台Mk.Ⅰ')
      expect(store.machineSettings.furnace).toBe('电弧熔炉')
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
  })
})
