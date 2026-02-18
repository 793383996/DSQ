import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CalculatorService } from '../services/CalculatorService'
import { recipeAdapter } from '../adapters/RecipeAdapter'
import { settingsAdapter } from '../adapters/SettingsAdapter'
import type { IDemand } from '../types/recipe'
import { testRecipeData } from './test-data'

declare global {
  interface Window {
    data: typeof testRecipeData
    recipeIndexByProduct: Record<string, number[]>
    defaultAccType?: string
    defaultAccValue?: string
    hideSource?: { checked: boolean }
    pointLength?: { value: string }
  }
}

vi.mock('../adapters/SettingsAdapter', () => ({
  settingsAdapter: {
    getAllRecipeSettings: vi.fn(() => ({})),
    getAllSpeedSettings: vi.fn(() => ({})),
    getAllProductivitySettings: vi.fn(() => ({}))
  }
}))

function buildRecipeIndexByProduct(data: typeof testRecipeData): Record<string, number[]> {
  const index: Record<string, number[]> = {}
  data.forEach((recipe, idx) => {
    if (recipe.s) {
      recipe.s.forEach(output => {
        if (!index[output.name]) {
          index[output.name] = []
        }
        index[output.name].push(idx)
      })
    }
  })
  return index
}

describe('CalculatorService', () => {
  let service: CalculatorService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new CalculatorService()

    window.data = testRecipeData
    window.recipeIndexByProduct = buildRecipeIndexByProduct(testRecipeData)
    window.defaultAccType = '增产剂Mk.Ⅰ'
    window.defaultAccValue = '无'
    window.hideSource = { checked: false }
    window.pointLength = { value: '3' }

    if (!recipeAdapter.isLoaded()) {
      recipeAdapter.loadFromRawData(testRecipeData as unknown as Record<string, unknown>[])
    }
  })

  describe('getVersion', () => {
    it('should start at version 0', () => {
      expect(service.getVersion()).toBe(0)
    })

    it('should increment version after each calculation', async () => {
      await service.calculate([])
      expect(service.getVersion()).toBe(1)

      await service.calculate([])
      expect(service.getVersion()).toBe(2)
    })
  })

  describe('calculate', () => {
    it('should return demands in result.xqs', async () => {
      const demands: IDemand[] = [{ name: '铁块', num: 60 }]

      const result = await service.calculate(demands)

      expect(result.xqs).toHaveLength(1)
      expect(result.xqs[0].name).toBe('铁块')
      expect(result.xqs[0].num).toBe(60)
    })

    it('should return excludes in result.ig_names', async () => {
      const demands: IDemand[] = [{ name: '铁块', num: 60 }]

      const result = await service.calculate(demands, ['铜矿'])

      expect(result.ig_names).toContain('铜矿')
    })

    it('should return items array', async () => {
      const result = await service.calculate([{ name: '铁块', num: 60 }])

      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should return totalEnergy as string', async () => {
      const result = await service.calculate([])

      expect(typeof result.totalEnergy).toBe('string')
    })

    it('should return totalSpace as number', async () => {
      const result = await service.calculate([])

      expect(typeof result.totalSpace).toBe('number')
    })

    it('should return totalAcc as string', async () => {
      const result = await service.calculate([])

      expect(typeof result.totalAcc).toBe('string')
    })
  })

  describe('calculateWithOptions', () => {
    it('should call onStateSnapshot callback', async () => {
      const snapshotCallback = vi.fn().mockReturnValue({
        demandVersion: 0,
        demandList: [],
        excludeList: []
      })

      await service.calculateWithOptions([], {
        onStateSnapshot: snapshotCallback
      })

      expect(snapshotCallback).toHaveBeenCalled()
    })

    it('should call validateState callback', async () => {
      const validateCallback = vi.fn().mockReturnValue(true)

      await service.calculateWithOptions([], {
        onStateSnapshot: () => ({ demandVersion: 0, demandList: [], excludeList: [] }),
        validateState: validateCallback
      })

      expect(validateCallback).toHaveBeenCalled()
    })

    it('should pass excludes from options', async () => {
      const result = await service.calculateWithOptions([{ name: '铁块', num: 60 }], {
        excludes: ['铜矿', '铁矿']
      })

      expect(result.ig_names).toEqual(['铜矿', '铁矿'])
    })
  })

  describe('getContext', () => {
    it('should return CalculationContext instance', () => {
      const context = service.getContext()

      expect(context).toBeDefined()
      expect(context.consumptionMap).toBeInstanceOf(Map)
      expect(context.productionMap).toBeInstanceOf(Map)
    })
  })

  describe('getConsumption', () => {
    it('should return consumption map', () => {
      const consumption = service.getConsumption()

      expect(consumption).toBeInstanceOf(Map)
    })
  })

  describe('getProduction', () => {
    it('should return production map', () => {
      const production = service.getProduction()

      expect(production).toBeInstanceOf(Map)
    })
  })

  describe('getStats', () => {
    it('should return stats object', () => {
      const stats = service.getStats()

      expect(stats).toHaveProperty('consumptionCount')
      expect(stats).toHaveProperty('productionCount')
      expect(stats).toHaveProperty('resultCount')
      expect(stats).toHaveProperty('elapsedTime')
    })

    it('should return zero counts initially', () => {
      const stats = service.getStats()

      expect(stats.consumptionCount).toBe(0)
      expect(stats.productionCount).toBe(0)
      expect(stats.resultCount).toBe(0)
    })
  })

  describe('multiple calculations', () => {
    it('should reset context between calculations', async () => {
      await service.calculate([{ name: '铁块', num: 60 }])
      const sizeAfterFirst = service.getConsumption().size

      await service.calculate([])
      const sizeAfterSecond = service.getConsumption().size

      expect(sizeAfterFirst).toBeGreaterThanOrEqual(0)
      expect(sizeAfterSecond).toBe(0)
    })
  })

  describe('calculateWithEngine', () => {
    it('should return success result', async () => {
      const result = await service.calculateWithEngine([{ name: '铁块', num: 60 }])

      expect(result.success).toBe(true)
      expect(result.xh_list).toBeDefined()
      expect(result.out_list).toBeDefined()
    })

    it('should return xhMap and outMap', async () => {
      const result = await service.calculateWithEngine([{ name: '铁块', num: 60 }])

      expect(result.xhMap).toBeDefined()
      expect(result.outMap).toBeDefined()
    })

    it('should increment version after calculation', async () => {
      const initialVersion = service.getVersion()
      await service.calculateWithEngine([{ name: '铁块', num: 60 }])

      expect(service.getVersion()).toBe(initialVersion + 1)
    })
  })
})
