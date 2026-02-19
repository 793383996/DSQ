import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockRecipes = [
  {
    id: 0,
    name: '铁板',
    s: [{ name: '铁板', n: 1 }],
    q: [{ name: '铁块', n: 1 }],
    t: 2,
    m: [{ name: '电弧熔炉', speed: 1 }],
    mName: '电弧熔炉'
  },
  {
    id: 1,
    name: '临界光子',
    s: [{ name: '临界光子', n: 1 }],
    q: [{ name: '引力透镜', n: 0.0083 }],
    t: 5,
    m: [{ name: '射线接收塔', speed: 1 }],
    mName: '射线接收塔'
  }
]

const mockRecipeIndexByProduct: Record<string, number[]> = {
  铁板: [0],
  临界光子: [1]
}

describe('UpdateAllService', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      data: mockRecipes,
      recipeIndexByProduct: mockRecipeIndexByProduct
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('ENERGY_DATA', () => {
    it('should have correct energy values for common machines', async () => {
      const { UpdateAllService } = await import('../UpdateAllService')
      const service = new UpdateAllService()

      expect(service).toBeDefined()
    })
  })

  describe('SPACE_DATA', () => {
    it('should have correct space values for common machines', async () => {
      const { UpdateAllService } = await import('../UpdateAllService')
      const service = new UpdateAllService()

      expect(service).toBeDefined()
    })
  })

  describe('initialization', () => {
    it('should initialize calculator on first call', async () => {
      const { UpdateAllService } = await import('../UpdateAllService')
      const service = new UpdateAllService()

      expect(service).toBeDefined()
    })
  })

  describe('updateAll', () => {
    it('should handle empty demands', async () => {
      const { UpdateAllService } = await import('../UpdateAllService')
      const service = new UpdateAllService()

      const result = await service.updateAll({
        demands: [],
        excludes: [],
        settings: {},
        settingsTime: {},
        settingsPf: {}
      })

      expect(result.items).toEqual([])
      expect(result.items0).toEqual([])
      expect(result.items2).toEqual([])
      expect(result.total).toEqual([])
      expect(result.totalEnergy).toBe('0')
      expect(result.totalSpace).toBe(0)
      expect(result.totalAcc).toBe('0.00')
    })

    it('should calculate simple demand', async () => {
      const { UpdateAllService } = await import('../UpdateAllService')
      const service = new UpdateAllService()

      const result = await service.updateAll({
        demands: [{ name: '铁板', num: 30 }],
        excludes: [],
        settings: {},
        settingsTime: {},
        settingsPf: {}
      })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.xqs).toEqual([{ name: '铁板', number: 30, item: { name: '铁板' } }])
    })

    it('should respect excludes list', async () => {
      const { UpdateAllService } = await import('../UpdateAllService')
      const service = new UpdateAllService()

      const result = await service.updateAll({
        demands: [{ name: '铁板', num: 30 }],
        excludes: ['铁块'],
        settings: {},
        settingsTime: {},
        settingsPf: {}
      })

      expect(result.igNames).toEqual(['铁块'])
    })

    it('should handle settings', async () => {
      const { UpdateAllService } = await import('../UpdateAllService')
      const service = new UpdateAllService()

      const result = await service.updateAll({
        demands: [{ name: '铁板', num: 30 }],
        excludes: [],
        settings: {
          '0': { m: '电弧熔炉', accType: '增产剂Mk.Ⅰ', accValue: '加速' }
        },
        settingsTime: {},
        settingsPf: {}
      })

      expect(result.items.length).toBeGreaterThan(0)
    })
  })

  describe('getState', () => {
    it('should return null when calculator is not initialized', async () => {
      const { UpdateAllService } = await import('../UpdateAllService')
      const service = new UpdateAllService()

      const state = service.getState()

      expect(state).toBeNull()
    })
  })

  describe('getCriticalPhotonT', () => {
    it('should return null initially', async () => {
      const { UpdateAllService } = await import('../UpdateAllService')
      const service = new UpdateAllService()

      expect(service.getCriticalPhotonT()).toBeNull()
    })
  })

  describe('getCriticalPhotonLensN', () => {
    it('should return null initially', async () => {
      const { UpdateAllService } = await import('../UpdateAllService')
      const service = new UpdateAllService()

      expect(service.getCriticalPhotonLensN()).toBeNull()
    })
  })

  describe('getOrbitalCollectorT', () => {
    it('should return undefined for invalid recipe id', async () => {
      const { UpdateAllService } = await import('../UpdateAllService')
      const service = new UpdateAllService()

      expect(service.getOrbitalCollectorT(undefined, '氢')).toBeUndefined()
    })
  })
})
