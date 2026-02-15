import { describe, it, expect, beforeEach } from 'vitest'
import { ItemSummaryCalculator, DEFAULT_ITEM_SUMMARY_CONFIG } from '../ItemSummaryCalculator'
import { PRODUCTION_CATEGORY } from '../SorterGenerator'
import type { ISubRecipe } from '../../types/buildingGenerator'
import type { IBuildingData } from '../../../types/blueprint'

describe('ItemSummaryCalculator', () => {
  let calculator: ItemSummaryCalculator

  const mockBuildingMap: Record<string, IBuildingData> = {
    arcSmelter: {
      name: 'arcSmelter',
      itemId: 1002,
      modelIndex: 2302,
      productionSpeed: 1,
      category: 0,
      size: { x: 2, y: 2 },
      remark: ''
    },
    assemblingMachineMk1: {
      name: 'assemblingMachineMk1',
      itemId: 1001,
      modelIndex: 2303,
      productionSpeed: 0.75,
      category: 1,
      size: { x: 3, y: 3 },
      remark: ''
    },
    lab: {
      name: 'lab',
      itemId: 1003,
      modelIndex: 2310,
      productionSpeed: 1,
      category: 5,
      size: { x: 3, y: 3 },
      remark: ''
    }
  }

  beforeEach(() => {
    calculator = new ItemSummaryCalculator()
  })

  describe('DEFAULT_ITEM_SUMMARY_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_ITEM_SUMMARY_CONFIG.stackLayers).toBe(1)
      expect(DEFAULT_ITEM_SUMMARY_CONFIG.maxLabLayers).toBe(4)
      expect(DEFAULT_ITEM_SUMMARY_CONFIG.extraRate).toBe(1.25)
    })
  })

  describe('calculate', () => {
    it('should calculate item summary from simple recipe', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironIngot']).toBeDefined()
      expect(summary['ironOre']).toBeDefined()
      expect(summary['ironIngot'].rate).toBe(2)
      expect(summary['ironIngot'].fromBuildingNum).toBe(2)
      expect(summary['ironOre'].toBuildingNum).toBe(2)
    })

    it('should skip subRecipe without building', () => {
      const subRecipes: ISubRecipe[] = [
        {
          output: [{ name: 'ironOre', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(Object.keys(summary).length).toBe(0)
    })

    it('should skip unknown building', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'unknownBuilding', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(Object.keys(summary).length).toBe(0)
    })

    it('should apply extra rate for accelerator mode 1', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 1
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironIngot'].rate).toBe(1.25)
    })

    it('should handle lab category with maxLabLayers', () => {
      const calc = new ItemSummaryCalculator({ maxLabLayers: 4 })
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'lab', num: 8 },
          output: [{ name: 'sciencePack', rate: 1 }],
          input: [{ name: 'ironIngot', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const summary = calc.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['sciencePack'].fromBuildingNum).toBe(8)
      expect(summary['ironIngot'].toBuildingNum).toBe(2)
    })

    it('should accumulate multiple outputs for same item', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: null,
          acceleratorMode: 0
        },
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironIngot'].rate).toBe(3)
      expect(summary['ironIngot'].fromBuildingNum).toBe(3)
    })

    it('should handle production speed multiplier', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'assemblingMachineMk1', num: 2 },
          output: [{ name: 'magneticCoil', rate: 2 }],
          input: [{ name: 'magnet', rate: 2 }],
          acceleratorMode: 0
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['magneticCoil'].rate).toBe(3)
      expect(summary['magnet'].inputRate).toBe(3)
    })
  })

  describe('sortItemSummary', () => {
    it('should sort by fromBuildingNum descending', () => {
      const summary = {
        itemA: { rate: 10, fromBuildingNum: 5, toBuildingNum: 0 },
        itemB: { rate: 20, fromBuildingNum: 10, toBuildingNum: 0 },
        itemC: { rate: 15, fromBuildingNum: 3, toBuildingNum: 0 }
      }

      const sorted = calculator.sortItemSummary(summary)
      const keys = Object.keys(sorted)

      expect(keys[0]).toBe('itemB')
      expect(keys[1]).toBe('itemA')
      expect(keys[2]).toBe('itemC')
    })

    it('should sort by toBuildingNum when fromBuildingNum is equal', () => {
      const summary = {
        itemA: { rate: 10, fromBuildingNum: 5, toBuildingNum: 3 },
        itemB: { rate: 20, fromBuildingNum: 5, toBuildingNum: 8 },
        itemC: { rate: 15, fromBuildingNum: 5, toBuildingNum: 1 }
      }

      const sorted = calculator.sortItemSummary(summary)
      const keys = Object.keys(sorted)

      expect(keys[0]).toBe('itemB')
      expect(keys[1]).toBe('itemA')
      expect(keys[2]).toBe('itemC')
    })

    it('should sort by rate when both building counts are equal', () => {
      const summary = {
        itemA: { rate: 10, fromBuildingNum: 5, toBuildingNum: 3 },
        itemB: { rate: 20, fromBuildingNum: 5, toBuildingNum: 3 },
        itemC: { rate: 15, fromBuildingNum: 5, toBuildingNum: 3 }
      }

      const sorted = calculator.sortItemSummary(summary)
      const keys = Object.keys(sorted)

      expect(keys[0]).toBe('itemB')
      expect(keys[1]).toBe('itemC')
      expect(keys[2]).toBe('itemA')
    })
  })

  describe('with stackLayers config', () => {
    it('should multiply rates by stackLayers', () => {
      const stackedCalc = new ItemSummaryCalculator({ stackLayers: 2 })
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const summary = stackedCalc.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironIngot'].rate).toBe(2)
      expect(summary['ironOre'].inputRate).toBe(2)
    })
  })

  describe('needProliferator flag', () => {
    it('should set needProliferator for accelerator mode 1', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 1
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironOre'].needProliferator).toBe(true)
    })

    it('should not set needProliferator for accelerator mode 0', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironOre'].needProliferator).toBe(true)
    })
  })
})
