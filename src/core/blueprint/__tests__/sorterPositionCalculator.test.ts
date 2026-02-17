import { describe, it, expect } from 'vitest'
import {
  SorterPositionCalculator,
  createSorterPositionCalculator
} from '../generators/sorter/SorterPositionCalculator'
import { SmelterAssemblerSorterStrategy } from '../generators/sorter/SmelterAssemblerSorterStrategy'
import { PlantSorterStrategy } from '../generators/sorter/PlantSorterStrategy'
import { RefinerySorterStrategy } from '../generators/sorter/RefinerySorterStrategy'
import { ColliderSorterStrategy } from '../generators/sorter/ColliderSorterStrategy'
import { LabSorterStrategy } from '../generators/sorter/LabSorterStrategy'
import { PRODUCTION_CATEGORY } from '../generators/SorterGenerator'

describe('SorterPositionCalculator', () => {
  let calculator: SorterPositionCalculator

  beforeEach(() => {
    calculator = createSorterPositionCalculator()
  })

  describe('smelter', () => {
    it('should calculate correct offset for slot 8', () => {
      const result = calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.smelter, 8, 0)
      expect(result.offset).toHaveLength(2)
      expect(result.offset[0]).toEqual({ x: -0.9, y: -1, z: 0 })
      expect(result.offset[1]).toEqual({ x: -0.9, y: -2, z: 0 })
      expect(result.yaw).toEqual([180, 180])
    })

    it('should calculate correct offset for slot 3', () => {
      const result = calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.smelter, 3, 0)
      expect(result.offset).toHaveLength(2)
      expect(result.offset[0]).toEqual({ x: 1, y: 0.8, z: 0 })
      expect(result.offset[1]).toEqual({ x: 2, y: 0.8, z: 0 })
      expect(result.yaw).toEqual([90, 90])
    })

    it('should apply rotate correctly', () => {
      const result = calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.smelter, 8, 1)
      expect(result.offset).toHaveLength(2)
      expect(result.offset[0]).toEqual({ x: -0.9, y: -2, z: 0 })
      expect(result.offset[1]).toEqual({ x: -0.9, y: -1, z: 0 })
      expect(result.yaw).toEqual([0, 0])
    })
  })

  describe('assembling', () => {
    it('should have same logic as smelter', () => {
      const smelterResult = calculator.calculate(
        { x: 5, y: 5, z: 0 },
        PRODUCTION_CATEGORY.smelter,
        5,
        0
      )
      const assemblingResult = calculator.calculate(
        { x: 5, y: 5, z: 0 },
        PRODUCTION_CATEGORY.assembling,
        5,
        0
      )
      expect(smelterResult.offset).toEqual(assemblingResult.offset)
      expect(smelterResult.yaw).toEqual(assemblingResult.yaw)
    })
  })

  describe('plant', () => {
    it('should calculate correct offset for slot 6', () => {
      const result = calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.plant, 6, 0)
      expect(result.offset).toHaveLength(2)
      expect(result.offset[0]).toEqual({ x: -0.8, y: -1, z: 0 })
      expect(result.offset[1]).toEqual({ x: -0.8, y: -2, z: 0 })
      expect(result.yaw).toEqual([180, 180])
    })

    it('should calculate correct offset for slot 0', () => {
      const result = calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.plant, 0, 0)
      expect(result.offset).toHaveLength(2)
      expect(result.offset[0]).toEqual({ x: -0.8, y: 2, z: 0 })
      expect(result.offset[1]).toEqual({ x: -0.8, y: 3, z: 0 })
      expect(result.yaw).toEqual([0, 0])
    })
  })

  describe('refinery', () => {
    it('should calculate correct offset for slot 8', () => {
      const result = calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.refinery, 8, 0)
      expect(result.offset).toHaveLength(2)
      expect(result.offset[0]).toEqual({ x: -3, y: -1, z: 0 })
      expect(result.offset[1]).toEqual({ x: -4, y: -1, z: 0 })
      expect(result.yaw).toEqual([270, 270])
    })

    it('should calculate correct offset for slot 0', () => {
      const result = calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.refinery, 0, 0)
      expect(result.offset).toHaveLength(2)
      expect(result.offset[0]).toEqual({ x: -0.8, y: -1, z: 0 })
      expect(result.offset[1]).toEqual({ x: -0.8, y: -2, z: 0 })
      expect(result.yaw).toEqual([180, 180])
    })
  })

  describe('collider', () => {
    it('should calculate correct offset for slot 8', () => {
      const result = calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.collider, 8, 0)
      expect(result.offset).toHaveLength(2)
      expect(result.offset[0]).toEqual({ x: -0.8, y: -2, z: 0 })
      expect(result.offset[1]).toEqual({ x: -0.8, y: -3, z: 0 })
      expect(result.yaw).toEqual([180, 180])
    })

    it('should calculate correct offset for slot 0', () => {
      const result = calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.collider, 0, 0)
      expect(result.offset).toHaveLength(2)
      expect(result.offset[0]).toEqual({ x: -0.8, y: 2, z: 0 })
      expect(result.offset[1]).toEqual({ x: -0.8, y: 3, z: 0 })
      expect(result.yaw).toEqual([0, 0])
    })
  })

  describe('lab', () => {
    it('should calculate correct offset for slot 11', () => {
      const result = calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.lab, 11, 0)
      expect(result.offset).toHaveLength(2)
      expect(result.offset[0]).toEqual({ x: 2, y: 0.8, z: 0 })
      expect(result.offset[1]).toEqual({ x: 3, y: 0.8, z: 0 })
      expect(result.yaw).toEqual([90, 90])
    })

    it('should calculate correct offset for slot 3', () => {
      const result = calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.lab, 3, 0)
      expect(result.offset).toHaveLength(2)
      expect(result.offset[0]).toEqual({ x: -2, y: 0.8, z: 0 })
      expect(result.offset[1]).toEqual({ x: -3, y: 0.8, z: 0 })
      expect(result.yaw).toEqual([270, 270])
    })
  })

  describe('error handling', () => {
    it('should throw error for unsupported category', () => {
      expect(() => {
        calculator.calculate({ x: 0, y: 0, z: 0 }, 999 as any, 8, 0)
      }).toThrow('unsupported production category')
    })

    it('should throw error for invalid slot index', () => {
      expect(() => {
        calculator.calculate({ x: 0, y: 0, z: 0 }, PRODUCTION_CATEGORY.smelter, 0, 0)
      }).toThrow()
    })
  })

  describe('getStrategy', () => {
    it('should return strategy for each category', () => {
      expect(calculator.getStrategy(PRODUCTION_CATEGORY.smelter)).toBeDefined()
      expect(calculator.getStrategy(PRODUCTION_CATEGORY.assembling)).toBeDefined()
      expect(calculator.getStrategy(PRODUCTION_CATEGORY.plant)).toBeDefined()
      expect(calculator.getStrategy(PRODUCTION_CATEGORY.refinery)).toBeDefined()
      expect(calculator.getStrategy(PRODUCTION_CATEGORY.collider)).toBeDefined()
      expect(calculator.getStrategy(PRODUCTION_CATEGORY.lab)).toBeDefined()
    })

    it('should return undefined for unknown category', () => {
      expect(calculator.getStrategy(999 as any)).toBeUndefined()
    })
  })
})

describe('SmelterAssemblerSorterStrategy', () => {
  it('should return correct category for smelter', () => {
    const strategy = new SmelterAssemblerSorterStrategy(PRODUCTION_CATEGORY.smelter)
    expect(strategy.getCategory()).toBe(PRODUCTION_CATEGORY.smelter)
  })

  it('should return correct category for assembling', () => {
    const strategy = new SmelterAssemblerSorterStrategy(PRODUCTION_CATEGORY.assembling)
    expect(strategy.getCategory()).toBe(PRODUCTION_CATEGORY.assembling)
  })
})
