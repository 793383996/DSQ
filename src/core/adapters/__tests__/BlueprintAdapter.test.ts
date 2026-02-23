import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateBlueprintWithNewService,
  isBlueprintServiceAvailable,
  convertLegacyRecipe,
  convertLegacyConfig,
  ILegacyRecipe,
  ILegacyBlueprintConfig
} from '../BlueprintAdapter'

describe('BlueprintAdapter', () => {
  describe('isBlueprintServiceAvailable', () => {
    it('should return true when buildingMap and itemMap JSON files are loaded', () => {
      expect(isBlueprintServiceAvailable()).toBe(true)
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
