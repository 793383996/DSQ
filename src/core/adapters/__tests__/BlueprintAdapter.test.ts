import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateBlueprintWithNewService,
  isBlueprintServiceAvailable,
  convertLegacyRecipe,
  convertLegacyConfig,
  ILegacyRecipe,
  ILegacyBlueprintConfig
} from '../BlueprintAdapter'

const mockBuildingMap = {
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
  conveyorBeltMk1: {
    name: 'conveyorBeltMk1',
    itemId: 2001,
    modelIndex: 2100,
    transportSpeed: 6,
    type: 5,
    remark: ''
  },
  conveyorBeltMK3: {
    name: 'conveyorBeltMK3',
    itemId: 2003,
    modelIndex: 2102,
    transportSpeed: 30,
    type: 5,
    remark: ''
  },
  sprayCoater: {
    name: 'sprayCoater',
    itemId: 2313,
    modelIndex: 481,
    remark: ''
  },
  sorterMk1: {
    name: 'sorterMk1',
    itemId: 2011,
    modelIndex: 2110,
    sortingSpeed: 6,
    remark: ''
  },
  sorterMk3: {
    name: 'sorterMk3',
    itemId: 2013,
    modelIndex: 2112,
    sortingSpeed: 30,
    remark: ''
  }
}

const mockItemMap = {
  ironOre: { iconId: 1001, name: 'ironOre' },
  ironIngot: { iconId: 1003, name: 'ironIngot' }
}

describe('BlueprintAdapter', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      buildingMap: { ...mockBuildingMap },
      itemMap: { ...mockItemMap }
    })
  })

  describe('isBlueprintServiceAvailable', () => {
    it('should return true when buildingMap and itemMap are available', () => {
      expect(isBlueprintServiceAvailable()).toBe(true)
    })

    it('should return false when buildingMap is empty', () => {
      vi.stubGlobal('window', { buildingMap: {}, itemMap: mockItemMap })
      expect(isBlueprintServiceAvailable()).toBe(false)
    })

    it('should return false when itemMap is empty', () => {
      vi.stubGlobal('window', { buildingMap: mockBuildingMap, itemMap: {} })
      expect(isBlueprintServiceAvailable()).toBe(false)
    })
  })

  describe('convertLegacyRecipe', () => {
    it('should convert legacy recipe to ISubRecipe format', () => {
      const legacyRecipe: ILegacyRecipe = {
        proliferator: 'proliferatorMk1',
        subRecipes: [
          {
            building: { name: 'arcSmelter', num: 2 },
            output: [{ name: 'ironIngot', rate: 1 }],
            input: [{ name: 'ironOre', rate: 1 }],
            acceleratorMode: 0
          }
        ]
      }

      const result = convertLegacyRecipe(legacyRecipe)

      expect(result.length).toBe(1)
      expect(result[0].building).toEqual({ name: 'arcSmelter', num: 2 })
      expect(result[0].output).toEqual([{ name: 'ironIngot', rate: 1 }])
      expect(result[0].input).toEqual([{ name: 'ironOre', rate: 1 }])
    })

    it('should handle null building', () => {
      const legacyRecipe: ILegacyRecipe = {
        subRecipes: [
          {
            building: null,
            output: [{ name: 'ironOre', rate: 1 }],
            input: null,
            acceleratorMode: 0
          }
        ]
      }

      const result = convertLegacyRecipe(legacyRecipe)

      expect(result[0].building).toBeUndefined()
    })

    it('should return empty array for null subRecipes', () => {
      const legacyRecipe = { subRecipes: null } as unknown as ILegacyRecipe
      const result = convertLegacyRecipe(legacyRecipe)
      expect(result).toEqual([])
    })
  })

  describe('convertLegacyConfig', () => {
    it('should convert legacy config to service config format', () => {
      const legacyConfig: ILegacyBlueprintConfig = {
        maxSorterNumOneBelt: 8,
        conveyorBeltStackLayer: 4,
        x_y_ratio: 1,
        compactLayout: true,
        upgradeConveyorBelt: true,
        onlyConveyorBeltMk3: false,
        onlySorterMk3: false,
        useSorterMk4: false,
        maxLabLayers: 4,
        selfSpray: false,
        generateTeslaTower: false,
        teslaTowerInterval: 10,
        teslaTowerLineInterval: 2,
        onlyConveyorBeltMk3Downgrade: false,
        stackLayers: 1
      }

      const result = convertLegacyConfig(legacyConfig)

      expect(result.conveyorBeltStackLayer).toBe(4)
      expect(result.onlyConveyorBeltMk3).toBe(false)
      expect(result.compactLayout).toBe(true)
      expect(result.xYRatio).toBe(1)
    })
  })

  describe('generateBlueprintWithNewService', () => {
    it('should return error when buildingMap is not loaded', () => {
      vi.stubGlobal('window', { buildingMap: {}, itemMap: mockItemMap })

      const legacyRecipe: ILegacyRecipe = {
        subRecipes: [
          {
            building: { name: 'arcSmelter', num: 2 },
            output: [{ name: 'ironIngot', rate: 1 }],
            input: [{ name: 'ironOre', rate: 1 }],
            acceleratorMode: 0
          }
        ]
      }

      const result = generateBlueprintWithNewService(legacyRecipe, {} as ILegacyBlueprintConfig)

      expect(result.success).toBe(false)
      expect(result.error).toContain('buildingMap')
    })

    it('should generate blueprint successfully', () => {
      const legacyRecipe: ILegacyRecipe = {
        proliferator: undefined,
        subRecipes: [
          {
            building: { name: 'arcSmelter', num: 2 },
            output: [{ name: 'ironIngot', rate: 1 }],
            input: [{ name: 'ironOre', rate: 1 }],
            acceleratorMode: 0
          }
        ]
      }

      const legacyConfig: ILegacyBlueprintConfig = {
        maxSorterNumOneBelt: 8,
        conveyorBeltStackLayer: 4,
        x_y_ratio: 1,
        compactLayout: true,
        upgradeConveyorBelt: true,
        onlyConveyorBeltMk3: false,
        onlySorterMk3: false,
        useSorterMk4: false,
        maxLabLayers: 4,
        selfSpray: false,
        generateTeslaTower: false,
        teslaTowerInterval: 10,
        teslaTowerLineInterval: 2,
        onlyConveyorBeltMk3Downgrade: false,
        stackLayers: 1
      }

      const result = generateBlueprintWithNewService(legacyRecipe, legacyConfig)

      expect(result.success).toBe(true)
      expect(result.blueprintString).toBeDefined()
      expect(result.blueprintData).toBeDefined()
    })

    it('should handle empty subRecipes', () => {
      const legacyRecipe: ILegacyRecipe = {
        subRecipes: []
      }

      const legacyConfig: ILegacyBlueprintConfig = {
        maxSorterNumOneBelt: 8,
        conveyorBeltStackLayer: 4,
        x_y_ratio: 1,
        compactLayout: true,
        upgradeConveyorBelt: true,
        onlyConveyorBeltMk3: false,
        onlySorterMk3: false,
        useSorterMk4: false,
        maxLabLayers: 4,
        selfSpray: false,
        generateTeslaTower: false,
        teslaTowerInterval: 10,
        teslaTowerLineInterval: 2,
        onlyConveyorBeltMk3Downgrade: false,
        stackLayers: 1
      }

      const result = generateBlueprintWithNewService(legacyRecipe, legacyConfig)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No recipes provided')
    })
  })
})
