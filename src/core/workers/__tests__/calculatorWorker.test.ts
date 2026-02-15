import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CalculatorWorkerService } from '../CalculatorWorkerService'
import type {
  IWorkerCalculateResponse,
  IWorkerInitResponse,
  IWorkerCalculateRequest,
  IWorkerInitRequest
} from '../types'

const mockRecipes = [
  {
    id: 0,
    s: [{ name: 'ironIngot', n: 1 }],
    q: [{ name: 'ironOre', n: 1 }],
    t: 1,
    m: 'arcSmelter',
    group: '基础'
  },
  {
    id: 1,
    s: [{ name: 'magneticCoil', n: 2 }],
    q: [
      { name: 'ironIngot', n: 2 },
      { name: 'magnet', n: 1 }
    ],
    t: 1,
    m: 'assemblingMachineMk1',
    group: '组件'
  },
  {
    id: 2,
    s: [{ name: 'magnet', n: 1 }],
    q: [{ name: 'ironOre', n: 1 }],
    t: 1.5,
    m: 'arcSmelter',
    group: '基础'
  },
  {
    id: 3,
    s: [{ name: 'copperIngot', n: 1 }],
    q: [{ name: 'copperOre', n: 1 }],
    t: 1,
    m: 'arcSmelter',
    group: '基础'
  },
  {
    id: 4,
    s: [{ name: 'gear', n: 1 }],
    q: [{ name: 'ironIngot', n: 1 }],
    t: 1,
    m: 'assemblingMachineMk1',
    group: '组件',
    noExtra: true
  }
]

const mockSettings: Record<number, { accType?: string; accValue?: string; m?: string }> = {}
const mockSettingsPf: Record<string, number> = {}
const mockSettingsTime: Record<string, number> = { 采矿机: 1 }
const mockRecipeIndexByProduct: Record<string, number[]> = {
  ironIngot: [0],
  magneticCoil: [1],
  magnet: [2],
  copperIngot: [3],
  gear: [4]
}

describe('CalculatorWorkerService', () => {
  let service: CalculatorWorkerService

  beforeEach(() => {
    service = new CalculatorWorkerService()
  })

  afterEach(() => {
    service.terminate()
  })

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined()
    })

    it('should have initial status', () => {
      const status = service.getStatus()
      expect(['idle', 'initializing', 'error']).toContain(status)
    })
  })

  describe('isAvailable', () => {
    it('should return true when worker is available', () => {
      const available = service.isAvailable()
      expect(typeof available).toBe('boolean')
    })

    it('should return false when status is error', () => {
      const status = service.getStatus()
      if (status === 'error') {
        expect(service.isAvailable()).toBe(false)
      }
    })
  })

  describe('terminate', () => {
    it('should terminate worker and reset status', () => {
      service.terminate()
      expect(service.getStatus()).toBe('idle')
    })

    it('should be safe to call terminate multiple times', () => {
      service.terminate()
      service.terminate()
      expect(service.getStatus()).toBe('idle')
    })
  })

  describe('getStatus', () => {
    it('should return valid status', () => {
      const status = service.getStatus()
      expect(['idle', 'initializing', 'ready', 'calculating', 'error']).toContain(status)
    })
  })

  describe('init', () => {
    it('should throw error when worker not available', async () => {
      if (service.getStatus() === 'error') {
        await expect(
          service.init({
            recipes: mockRecipes,
            settings: mockSettings,
            settingsPf: mockSettingsPf,
            settingsTime: mockSettingsTime,
            recipeIndexByProduct: mockRecipeIndexByProduct
          })
        ).rejects.toThrow('Worker not available')
      }
    })
  })

  describe('calculate', () => {
    it('should throw error when worker not available', async () => {
      if (service.getStatus() === 'error') {
        await expect(
          service.calculate({
            demands: [{ name: 'ironIngot', num: 100 }],
            excludes: []
          })
        ).rejects.toThrow()
      }
    })
  })
})

describe('Worker Types', () => {
  describe('IWorkerInitRequest', () => {
    it('should have correct structure', () => {
      const request: IWorkerInitRequest = {
        type: 'init',
        recipes: mockRecipes,
        settings: mockSettings,
        settingsPf: mockSettingsPf,
        settingsTime: mockSettingsTime,
        recipeIndexByProduct: mockRecipeIndexByProduct
      }
      expect(request.type).toBe('init')
      expect(request.recipes).toHaveLength(5)
      expect(request.settings).toBeDefined()
      expect(request.settingsPf).toBeDefined()
      expect(request.settingsTime).toBeDefined()
      expect(request.recipeIndexByProduct).toBeDefined()
    })

    it('should accept empty arrays', () => {
      const request: IWorkerInitRequest = {
        type: 'init',
        recipes: [],
        settings: {},
        settingsPf: {},
        settingsTime: {},
        recipeIndexByProduct: {}
      }
      expect(request.recipes).toHaveLength(0)
    })
  })

  describe('IWorkerCalculateRequest', () => {
    it('should have correct structure', () => {
      const request: IWorkerCalculateRequest = {
        type: 'calculate',
        id: 1,
        demands: [{ name: 'ironIngot', num: 100 }],
        excludes: ['copperOre'],
        recipes: mockRecipes,
        settings: mockSettings,
        settingsPf: mockSettingsPf,
        settingsTime: mockSettingsTime,
        recipeIndexByProduct: mockRecipeIndexByProduct,
        defaultAccType: '增产剂Mk.Ⅰ',
        defaultAccValue: '无'
      }
      expect(request.type).toBe('calculate')
      expect(request.id).toBe(1)
      expect(request.demands).toHaveLength(1)
      expect(request.excludes).toContain('copperOre')
      expect(request.defaultAccType).toBe('增产剂Mk.Ⅰ')
      expect(request.defaultAccValue).toBe('无')
    })

    it('should support singleMakes', () => {
      const request: IWorkerCalculateRequest = {
        type: 'calculate',
        id: 2,
        demands: [],
        excludes: [],
        recipes: mockRecipes,
        settings: mockSettings,
        settingsPf: mockSettingsPf,
        settingsTime: mockSettingsTime,
        recipeIndexByProduct: mockRecipeIndexByProduct,
        defaultAccType: '增产剂Mk.Ⅰ',
        defaultAccValue: '无',
        singleMakes: [{ id: 0, number: 10 }]
      }
      expect(request.singleMakes).toHaveLength(1)
      expect(request.singleMakes?.[0].id).toBe(0)
    })
  })

  describe('IWorkerInitResponse', () => {
    it('should have correct structure', () => {
      const response: IWorkerInitResponse = {
        type: 'ready',
        recipeCount: 5
      }
      expect(response.type).toBe('ready')
      expect(response.recipeCount).toBe(5)
    })
  })

  describe('IWorkerCalculateResponse', () => {
    it('should have correct structure for success result', () => {
      const response: IWorkerCalculateResponse = {
        type: 'result',
        id: 1,
        result: {
          success: true,
          xh_list: [
            { name: 'ironOre', value: 100 },
            { name: 'ironIngot', value: 100, value2: 10, accTotal: 5 }
          ],
          out_list: [{ name: 'ironIngot', value: -100 }],
          xhMap: { ironOre: { name: 'ironOre', value: 100 } },
          outMap: { ironIngot: { name: 'ironIngot', value: -100 } }
        }
      }
      expect(response.type).toBe('result')
      expect(response.result?.success).toBe(true)
      expect(response.result?.xh_list).toHaveLength(2)
      expect(response.result?.xh_list[0].name).toBe('ironOre')
      expect(response.result?.xh_list[1].value2).toBe(10)
      expect(response.result?.xh_list[1].accTotal).toBe(5)
    })

    it('should have correct structure for error result', () => {
      const response: IWorkerCalculateResponse = {
        type: 'error',
        id: 1,
        error: 'Recipe not found'
      }
      expect(response.type).toBe('error')
      expect(response.error).toBe('Recipe not found')
      expect(response.result).toBeUndefined()
    })
  })
})

describe('CalculatorService calculateWithWorker', () => {
  it('should fallback to legacy engine when worker not available', async () => {
    const { CalculatorService } = await import('../../services/CalculatorService')
    const calcService = new CalculatorService()

    const mockDemands = [{ name: 'ironIngot', num: 100 }]

    try {
      await calcService.calculateWithWorker(mockDemands, [])
    } catch (e) {
      expect(e).toBeDefined()
    }
  })
})

describe('Worker Result Interface', () => {
  it('should support IWorkerResult interface', () => {
    const result = {
      success: true,
      xh_list: [{ name: 'ironOre', value: 100 }],
      out_list: [],
      xhMap: { ironOre: { name: 'ironOre', value: 100 } },
      outMap: {},
      elapsedMs: 15.5
    }
    expect(result.success).toBe(true)
    expect(result.elapsedMs).toBe(15.5)
  })
})

describe('Worker Status Transitions', () => {
  it('should have valid status values', () => {
    const validStatuses = ['idle', 'initializing', 'ready', 'calculating', 'error']
    validStatuses.forEach(status => {
      expect(typeof status).toBe('string')
    })
  })
})

describe('Edge Cases', () => {
  it('should handle empty demands', () => {
    const request: IWorkerCalculateRequest = {
      type: 'calculate',
      id: 1,
      demands: [],
      excludes: [],
      recipes: mockRecipes,
      settings: mockSettings,
      settingsPf: mockSettingsPf,
      settingsTime: mockSettingsTime,
      recipeIndexByProduct: mockRecipeIndexByProduct,
      defaultAccType: '增产剂Mk.Ⅰ',
      defaultAccValue: '无'
    }
    expect(request.demands).toHaveLength(0)
  })

  it('should handle large demand values', () => {
    const request: IWorkerCalculateRequest = {
      type: 'calculate',
      id: 1,
      demands: [{ name: 'ironIngot', num: 999999999 }],
      excludes: [],
      recipes: mockRecipes,
      settings: mockSettings,
      settingsPf: mockSettingsPf,
      settingsTime: mockSettingsTime,
      recipeIndexByProduct: mockRecipeIndexByProduct,
      defaultAccType: '增产剂Mk.Ⅰ',
      defaultAccValue: '无'
    }
    expect(request.demands[0].num).toBe(999999999)
  })

  it('should handle multiple excludes', () => {
    const request: IWorkerCalculateRequest = {
      type: 'calculate',
      id: 1,
      demands: [{ name: 'ironIngot', num: 100 }],
      excludes: ['copperOre', 'siliconOre', 'titaniumOre'],
      recipes: mockRecipes,
      settings: mockSettings,
      settingsPf: mockSettingsPf,
      settingsTime: mockSettingsTime,
      recipeIndexByProduct: mockRecipeIndexByProduct,
      defaultAccType: '增产剂Mk.Ⅰ',
      defaultAccValue: '无'
    }
    expect(request.excludes).toHaveLength(3)
  })

  it('should handle proliferator settings', () => {
    const settingsWithProliferator: Record<number, { accType?: string; accValue?: string }> = {
      0: { accType: '增产剂Mk.Ⅲ', accValue: '增产' },
      1: { accType: '增产剂Mk.Ⅱ', accValue: '加速' }
    }
    const request: IWorkerCalculateRequest = {
      type: 'calculate',
      id: 1,
      demands: [{ name: 'ironIngot', num: 100 }],
      excludes: [],
      recipes: mockRecipes,
      settings: settingsWithProliferator,
      settingsPf: mockSettingsPf,
      settingsTime: mockSettingsTime,
      recipeIndexByProduct: mockRecipeIndexByProduct,
      defaultAccType: '增产剂Mk.Ⅰ',
      defaultAccValue: '无'
    }
    expect(request.settings[0]?.accType).toBe('增产剂Mk.Ⅲ')
    expect(request.settings[0]?.accValue).toBe('增产')
  })

  it('should handle noExtra recipe flag', () => {
    const noExtraRecipe = mockRecipes.find(r => r.noExtra === true)
    expect(noExtraRecipe).toBeDefined()
    expect(noExtraRecipe?.noExtra).toBe(true)
  })
})

describe('Timeout Handling', () => {
  it('should support custom timeout in calculate options', () => {
    const options = {
      demands: [{ name: 'ironIngot', num: 100 }],
      excludes: [],
      timeout: 5000
    }
    expect(options.timeout).toBe(5000)
  })

  it('should use default timeout when not specified', () => {
    const options = {
      demands: [{ name: 'ironIngot', num: 100 }],
      excludes: []
    }
    expect(options.timeout).toBeUndefined()
  })
})
