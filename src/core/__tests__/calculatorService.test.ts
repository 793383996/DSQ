import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CalculatorService } from '../services/CalculatorService'
import { recipeAdapter } from '../adapters/RecipeAdapter'
import type { IDemand } from '../types/recipe'
import { testRecipeData } from './test-data'

declare global {
  interface Window {
    data: unknown[]
    update_all: () => void
    app: {
      items: unknown[]
      items2: unknown[]
      items0: unknown[]
      total: unknown[]
      totalEnergy: string
      totalSpace: number
      totalAcc: string
      xqs: unknown[]
    }
    xqs: Array<{ name: string; number: number; item: { name: string } }>
    ig_names: string[]
    xh_list: Array<{ name: string; value: number }>
    out_list: Array<{ name: string; value: number }>
    xhMap: Record<string, unknown>
    outMap: Record<string, unknown>
    total: unknown[]
    totalAcc: number
    createCalculator: (options?: {
      maxDepth?: number
      defaultAccType?: string
      defaultAccValue?: string
    }) => {
      calculate: (
        demands: Array<{ name: string; num?: number; item?: { name: string }; number?: number }>,
        excludes: string[],
        singleMakes: Array<{ id: number; number: number }>
      ) => {
        success: boolean
        xh_list: Array<{ name: string; value: number }>
        out_list: Array<{ name: string; value: number }>
        xhMap: Record<string, { name: string; value: number }>
        outMap: Record<string, { name: string; value: number }>
        error?: unknown
      }
    }
    defaultAccType?: string
    defaultAccValue?: string
  }
}

describe('CalculatorService', () => {
  let service: CalculatorService

  beforeEach(() => {
    service = new CalculatorService()
    if (!recipeAdapter.isLoaded()) {
      recipeAdapter.loadFromRawData(testRecipeData as Record<string, unknown>)
    }
    window.xh_list = []
    window.out_list = []
    window.xhMap = {}
    window.outMap = {}
    window.total = []
    window.totalAcc = 0
  })

  describe('getVersion', () => {
    it('should start at version 0', () => {
      expect(service.getVersion()).toBe(0)
    })

    it('should increment version after each calculation', async () => {
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      await service.calculate([])
      expect(service.getVersion()).toBe(1)

      await service.calculate([])
      expect(service.getVersion()).toBe(2)
    })
  })

  describe('calculate', () => {
    it('should throw error when update_all is not a function', async () => {
      window.update_all = undefined as unknown as typeof window.update_all

      await expect(service.calculate([])).rejects.toThrow('计算引擎未初始化')
    })

    it('should return demands in result.xqs', async () => {
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      const demands: IDemand[] = [{ name: '铁块', num: 60 }]

      const result = await service.calculate(demands)

      expect(result.xqs).toHaveLength(1)
      expect(result.xqs[0].name).toBe('铁块')
      expect(result.xqs[0].num).toBe(60)
    })

    it('should set window.xqs with demands', async () => {
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      const demands: IDemand[] = [{ name: '铜块', num: 30 }]

      await service.calculate(demands)

      expect(window.xqs).toHaveLength(1)
      expect(window.xqs[0].name).toBe('铜块')
      expect(window.xqs[0].number).toBe(30)
    })

    it('should set window.ig_names with excludes', async () => {
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      const demands: IDemand[] = [{ name: '铁块', num: 60 }]

      await service.calculate(demands, ['铜矿'])

      expect(window.ig_names).toContain('铜矿')
    })

    it('should clear legacy global state before calculation', async () => {
      window.xh_list = [{ name: 'old', value: 100 }]
      window.out_list = [{ name: 'old2', value: 200 }]
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      await service.calculate([{ name: '铁块', num: 60 }])

      expect(window.xh_list).toEqual([])
      expect(window.out_list).toEqual([])
    })

    it('should return items from window.app', async () => {
      window.update_all = vi.fn()
      window.app = {
        items: [{ name: '铁块', num: 60 }],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      const result = await service.calculate([{ name: '铁块', num: 60 }])

      expect(result.items).toHaveLength(1)
    })

    it('should return totalEnergy from window.app', async () => {
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '100.5',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      const result = await service.calculate([])

      expect(result.totalEnergy).toBe('100.5')
    })

    it('should return totalSpace from window.app', async () => {
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 50,
        totalAcc: '0',
        xqs: []
      }

      const result = await service.calculate([])

      expect(result.totalSpace).toBe(50)
    })

    it('should return totalAcc from window.app', async () => {
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '10',
        xqs: []
      }

      const result = await service.calculate([])

      expect(result.totalAcc).toBe('10')
    })
  })

  describe('calculateWithOptions', () => {
    it('should call onStateSnapshot callback', async () => {
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

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
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      const validateCallback = vi.fn().mockReturnValue(true)

      await service.calculateWithOptions([], {
        onStateSnapshot: () => ({ demandVersion: 0, demandList: [], excludeList: [] }),
        validateState: validateCallback
      })

      expect(validateCallback).toHaveBeenCalled()
    })

    it('should pass excludes from options', async () => {
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      await service.calculateWithOptions([{ name: '铁块', num: 60 }], {
        excludes: ['铜矿', '铁矿']
      })

      expect(window.ig_names).toEqual(['铜矿', '铁矿'])
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

  describe('fillContext', () => {
    it('should add consumption items from xh_list', async () => {
      window.update_all = vi.fn().mockImplementation(() => {
        window.xh_list = [
          { name: '铁矿', value: 60 },
          { name: '铜矿', value: 30 }
        ]
      })
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      await service.calculate([{ name: '铁块', num: 60 }])

      const consumption = service.getConsumption()
      expect(consumption.get('铁矿')).toBe(60)
      expect(consumption.get('铜矿')).toBe(30)
    })

    it('should add production items from out_list', async () => {
      window.update_all = vi.fn().mockImplementation(() => {
        window.out_list = [
          { name: '铁块', value: 60 },
          { name: '铜块', value: 30 }
        ]
      })
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      await service.calculate([{ name: '铁块', num: 60 }])

      const production = service.getProduction()
      expect(production.get('铁块')).toBe(60)
      expect(production.get('铜块')).toBe(30)
    })

    it('should only add consumption items with positive value', async () => {
      window.update_all = vi.fn().mockImplementation(() => {
        window.xh_list = [
          { name: '铁矿', value: 60 },
          { name: '无效', value: 0 },
          { name: '负值', value: -10 }
        ]
      })
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      await service.calculate([])

      const consumption = service.getConsumption()
      expect(consumption.has('铁矿')).toBe(true)
      expect(consumption.has('无效')).toBe(false)
      expect(consumption.has('负值')).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should throw error when update_all throws', async () => {
      window.update_all = vi.fn().mockImplementation(() => {
        throw new Error('计算错误')
      })

      await expect(service.calculate([])).rejects.toThrow('计算错误')
    })
  })

  describe('multiple calculations', () => {
    it('should reset context between calculations', async () => {
      window.update_all = vi.fn().mockImplementation(() => {
        window.xh_list = [{ name: '铁矿', value: 60 }]
        window.out_list = [{ name: '铁块', value: 60 }]
      })
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      await service.calculate([{ name: '铁块', num: 60 }])
      expect(service.getConsumption().size).toBe(1)

      window.xh_list = []
      window.out_list = []
      window.update_all = vi.fn()

      await service.calculate([])
      expect(service.getConsumption().size).toBe(0)
    })
  })

  describe('calculateWithEngine', () => {
    it('should return success result when createCalculator is available', async () => {
      const mockCalculator = {
        calculate: vi.fn().mockReturnValue({
          success: true,
          xh_list: [{ name: '铁矿', value: 60 }],
          out_list: [{ name: '铁块', value: 60 }],
          xhMap: { 铁矿: { name: '铁矿', value: 60 } },
          outMap: { 铁块: { name: '铁块', value: 60 } }
        })
      }

      window.createCalculator = vi.fn().mockReturnValue(mockCalculator)

      const result = await service.calculateWithEngine([{ name: '铁块', num: 60 }])

      expect(result.success).toBe(true)
      expect(result.xh_list).toHaveLength(1)
      expect(result.out_list).toHaveLength(1)
    })

    it('should fallback to legacy when createCalculator not available', async () => {
      window.createCalculator = undefined as unknown as typeof window.createCalculator
      window.update_all = vi.fn()
      window.app = {
        items: [],
        items2: [],
        items0: [],
        total: [],
        totalEnergy: '0',
        totalSpace: 0,
        totalAcc: '0',
        xqs: []
      }

      const result = await service.calculateWithEngine([{ name: '铁块', num: 60 }])

      expect(result).toBeDefined()
      expect(result.items).toBeDefined()
    })

    it('should pass excludes to calculator', async () => {
      const mockCalculator = {
        calculate: vi.fn().mockReturnValue({
          success: true,
          xh_list: [],
          out_list: [],
          xhMap: {},
          outMap: {}
        })
      }

      window.createCalculator = vi.fn().mockReturnValue(mockCalculator)

      await service.calculateWithEngine([{ name: '铁块', num: 60 }], ['铜矿'])

      expect(mockCalculator.calculate).toHaveBeenCalledWith(expect.any(Array), ['铜矿'], [])
    })

    it('should pass singleMakes to calculator', async () => {
      const mockCalculator = {
        calculate: vi.fn().mockReturnValue({
          success: true,
          xh_list: [],
          out_list: [],
          xhMap: {},
          outMap: {}
        })
      }

      window.createCalculator = vi.fn().mockReturnValue(mockCalculator)

      await service.calculateWithEngine([], [], [{ id: 0, number: 60 }])

      expect(mockCalculator.calculate).toHaveBeenCalledWith(
        expect.any(Array),
        [],
        [{ id: 0, number: 60 }]
      )
    })

    it('should fill context with consumption and production', async () => {
      const mockCalculator = {
        calculate: vi.fn().mockReturnValue({
          success: true,
          xh_list: [
            { name: '铁矿', value: 60 },
            { name: '铜矿', value: 30 }
          ],
          out_list: [{ name: '铁块', value: 60 }],
          xhMap: {},
          outMap: {}
        })
      }

      window.createCalculator = vi.fn().mockReturnValue(mockCalculator)

      await service.calculateWithEngine([{ name: '铁块', num: 60 }])

      const consumption = service.getConsumption()
      const production = service.getProduction()

      expect(consumption.get('铁矿')).toBe(60)
      expect(consumption.get('铜矿')).toBe(30)
      expect(production.get('铁块')).toBe(60)
    })

    it('should return failure result when calculation fails', async () => {
      const mockCalculator = {
        calculate: vi.fn().mockReturnValue({
          success: false,
          xh_list: [],
          out_list: [],
          xhMap: {},
          outMap: {},
          error: new Error('计算失败')
        })
      }

      window.createCalculator = vi.fn().mockReturnValue(mockCalculator)

      const result = await service.calculateWithEngine([{ name: '铁块', num: 60 }])

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should increment version after calculation', async () => {
      const mockCalculator = {
        calculate: vi.fn().mockReturnValue({
          success: true,
          xh_list: [],
          out_list: [],
          xhMap: {},
          outMap: {}
        })
      }

      window.createCalculator = vi.fn().mockReturnValue(mockCalculator)

      const initialVersion = service.getVersion()
      await service.calculateWithEngine([{ name: '铁块', num: 60 }])

      expect(service.getVersion()).toBe(initialVersion + 1)
    })
  })
})
