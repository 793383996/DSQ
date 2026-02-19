import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LayoutCalculator } from '../LayoutCalculator'
import type { IBuildingData } from '../../../types/blueprint'

describe('LayoutCalculator', () => {
  let calculator: LayoutCalculator

  const mockBuilding: IBuildingData = {
    index: 0,
    areaIndex: 0,
    localOffset: { x: 0, y: 0, z: 0 },
    yaw: 0,
    itemId: 0,
    outputObjIdx: 0,
    inputObjIdx: 0,
    outputToSlot: 0,
    inputFromSlot: 0,
    outputFromSlot: 0,
    inputToSlot: 0,
    outputOffset: 0,
    inputOffset: 0,
    recipeId: 0,
    filterId: 0,
    size: { x: 3, y: 3 }
  }

  beforeEach(() => {
    calculator = new LayoutCalculator()
  })

  describe('calculateBuildingArea', () => {
    it('should return 1x1 for building without size', () => {
      const building: IBuildingData = { ...mockBuilding, size: undefined }
      const result = calculator.calculateBuildingArea(building, 0)
      expect(result).toEqual({ width: 1, height: 1 })
    })

    it('should return correct area for yaw 0', () => {
      const result = calculator.calculateBuildingArea(mockBuilding, 0)
      expect(result).toEqual({ width: 3, height: 3 })
    })

    it('should swap width and height for yaw 1', () => {
      const result = calculator.calculateBuildingArea(mockBuilding, 1)
      expect(result).toEqual({ width: 3, height: 3 })
    })

    it('should swap width and height for yaw 3', () => {
      const result = calculator.calculateBuildingArea(mockBuilding, 3)
      expect(result).toEqual({ width: 3, height: 3 })
    })

    it('should add spacing for non-compact layout', () => {
      const result = calculator.calculateBuildingArea(mockBuilding, 0, false)
      expect(result).toEqual({ width: 4, height: 4 })
    })

    it('should handle rectangular building', () => {
      const rectBuilding: IBuildingData = {
        ...mockBuilding,
        size: { x: 5, y: 3 }
      }
      const result = calculator.calculateBuildingArea(rectBuilding, 0)
      expect(result).toEqual({ width: 5, height: 3 })
    })

    it('should rotate rectangular building for yaw 1', () => {
      const rectBuilding: IBuildingData = {
        ...mockBuilding,
        size: { x: 5, y: 3 }
      }
      const result = calculator.calculateBuildingArea(rectBuilding, 1)
      expect(result).toEqual({ width: 3, height: 5 })
    })
  })

  describe('calculateBlueprintArea', () => {
    it('should calculate total area for multiple buildings', () => {
      const buildings = [{ building: mockBuilding, count: 2, yaw: 0 }]
      const result = calculator.calculateBlueprintArea(buildings, 1)
      expect(result.x).toBe(7)
      expect(result.y).toBe(3)
    })

    it('should handle multiple building types', () => {
      const smallBuilding: IBuildingData = {
        ...mockBuilding,
        size: { x: 2, y: 2 }
      }
      const buildings = [
        { building: mockBuilding, count: 1, yaw: 0 },
        { building: smallBuilding, count: 2, yaw: 0 }
      ]
      const result = calculator.calculateBlueprintArea(buildings, 1)
      expect(result.x).toBe(8)
      expect(result.y).toBe(3)
    })
  })

  describe('calculateLayout', () => {
    it('should calculate layout with offset', () => {
      const result = calculator.calculateLayout(mockBuilding, 0, 0, 5, 10)
      expect(result.x).toBe(5)
      expect(result.y).toBe(10)
      expect(result.area).toBe(9)
      expect(result.yaw).toEqual([0, 0])
    })

    it('should calculate center point', () => {
      const result = calculator.calculateLayout(mockBuilding, 0, 0, 0, 0)
      expect(result.centerPoint[0]).toBe(1.5)
      expect(result.centerPoint[1]).toBe(1.5)
    })
  })

  describe('isAreaAvailable', () => {
    it('should return true for empty area', () => {
      expect(calculator.isAreaAvailable(0, 0, 3, 3)).toBe(true)
    })

    it('should return false for occupied area', () => {
      calculator.occupyArea(0, 0, 3, 3)
      expect(calculator.isAreaAvailable(0, 0, 3, 3)).toBe(false)
    })

    it('should return true for non-overlapping area', () => {
      calculator.occupyArea(0, 0, 3, 3)
      expect(calculator.isAreaAvailable(5, 5, 3, 3)).toBe(true)
    })
  })

  describe('areasOverlap', () => {
    it('should return true for overlapping areas', () => {
      const a = { x1: 0, y1: 0, x2: 3, y2: 3 }
      const b = { x1: 2, y1: 2, x2: 5, y2: 5 }
      expect(calculator.areasOverlap(a, b)).toBe(true)
    })

    it('should return false for non-overlapping areas', () => {
      const a = { x1: 0, y1: 0, x2: 3, y2: 3 }
      const b = { x1: 4, y1: 4, x2: 7, y2: 7 }
      expect(calculator.areasOverlap(a, b)).toBe(false)
    })

    it('should return false for adjacent areas', () => {
      const a = { x1: 0, y1: 0, x2: 3, y2: 3 }
      const b = { x1: 4, y1: 0, x2: 7, y2: 3 }
      expect(calculator.areasOverlap(a, b)).toBe(false)
    })
  })

  describe('occupyArea', () => {
    it('should add area to occupied list', () => {
      const area = calculator.occupyArea(0, 0, 3, 3)
      expect(area).toEqual({ x1: 0, y1: 0, x2: 2, y2: 2 })
      expect(calculator.getOccupiedArea().length).toBe(1)
    })
  })

  describe('reset', () => {
    it('should clear occupied areas', () => {
      calculator.occupyArea(0, 0, 3, 3)
      calculator.reset()
      expect(calculator.getOccupiedArea().length).toBe(0)
    })
  })

  describe('setOccupiedArea', () => {
    it('should set occupied areas', () => {
      const areas = [{ x1: 0, y1: 0, x2: 3, y2: 3 }]
      calculator.setOccupiedArea(areas)
      expect(calculator.getOccupiedArea()).toEqual(areas)
    })
  })

  describe('findNextAvailablePosition', () => {
    it('should find position in empty area', () => {
      const result = calculator.findNextAvailablePosition(3, 3)
      expect(result).toEqual({ x: 0, y: 0 })
    })

    it('should find position after occupied area', () => {
      calculator.occupyArea(0, 0, 3, 3)
      const result = calculator.findNextAvailablePosition(3, 3)
      expect(result).toEqual({ x: 3, y: 0 })
    })
  })
})
