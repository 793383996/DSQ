import { describe, it, expect, beforeEach } from 'vitest'
import { BuildingGenerator } from '../generators/BuildingGenerator'
import { LayoutCalculator } from '../generators/LayoutCalculator'
import { SorterGenerator, PRODUCTION_CATEGORY } from '../generators/SorterGenerator'
import type { IBuildingData } from '../../types/blueprint'

describe('BuildingGenerator', () => {
  let generator: BuildingGenerator

  beforeEach(() => {
    generator = new BuildingGenerator()
  })

  describe('getBuildingTemplate', () => {
    it('should return a valid building template', () => {
      const template = generator.getBuildingTemplate()

      expect(template).toBeDefined()
      expect(template.index).toBe(1)
      expect(template.areaIndex).toBe(0)
      expect(template.yaw).toEqual([0, 0])
      expect(template.itemId).toBe(0)
      expect(template.modelIndex).toBe(0)
      expect(template.outputObjIdx).toBe(-1)
      expect(template.inputObjIdx).toBe(-1)
      expect(template.parameters).toBeNull()
    })

    it('should increment building index on each call', () => {
      const t1 = generator.getBuildingTemplate()
      const t2 = generator.getBuildingTemplate()
      const t3 = generator.getBuildingTemplate()

      expect(t1.index).toBe(1)
      expect(t2.index).toBe(2)
      expect(t3.index).toBe(3)
    })
  })

  describe('addBuilding', () => {
    it('should add building to the list', () => {
      const building = generator.getBuildingTemplate()
      building.itemId = 1001
      building.modelIndex = 2303

      generator.addBuilding(building)

      const buildings = generator.getBuildings()
      expect(buildings.length).toBe(1)
      expect(buildings[0].itemId).toBe(1001)
      expect(buildings[0].modelIndex).toBe(2303)
    })
  })

  describe('addSorterEntry', () => {
    it('should add sorter entry for output', () => {
      generator.addSorterEntry('ironOre', 'output', {
        index: 1,
        rate: 10,
        ownerObjIdx: 1,
        ownerName: 'arcSmelter',
        ownerOffset: { x: 0, y: 0, z: 0 },
        recipeID: 0
      })

      const sorters = generator.getSorters()
      expect(sorters['ironOre']).toBeDefined()
      expect(sorters['ironOre']['output']).toBeDefined()
      expect(sorters['ironOre']['output']!.length).toBe(1)
    })

    it('should add sorter entry for input', () => {
      generator.addSorterEntry('copperOre', 'input', {
        index: 2,
        rate: 5,
        ownerObjIdx: 2,
        ownerName: 'assemblingMachineMk1',
        ownerOffset: { x: 1, y: 1, z: 0 },
        recipeID: 1
      })

      const sorters = generator.getSorters()
      expect(sorters['copperOre']['input']).toBeDefined()
      expect(sorters['copperOre']['input']!.length).toBe(1)
    })

    it('should accumulate multiple entries for same item', () => {
      generator.addSorterEntry('ironOre', 'output', {
        index: 1,
        rate: 10,
        ownerObjIdx: 1,
        ownerName: 'arcSmelter',
        ownerOffset: { x: 0, y: 0, z: 0 },
        recipeID: 0
      })
      generator.addSorterEntry('ironOre', 'output', {
        index: 2,
        rate: 15,
        ownerObjIdx: 2,
        ownerName: 'arcSmelter',
        ownerOffset: { x: 3, y: 0, z: 0 },
        recipeID: 0
      })

      const sorters = generator.getSorters()
      expect(sorters['ironOre']['output']!.length).toBe(2)
    })
  })

  describe('reset', () => {
    it('should reset all internal state', () => {
      generator.getBuildingTemplate()
      generator.addBuilding(generator.getBuildingTemplate())
      generator.addSorterEntry('ironOre', 'output', {
        index: 1,
        rate: 10,
        ownerObjIdx: 1,
        ownerName: 'arcSmelter',
        ownerOffset: { x: 0, y: 0, z: 0 },
        recipeID: 0
      })
      generator.setBlueprintSize({ x: 100, y: 100 })
      generator.setLastProductionBuildingType(5)

      generator.reset()

      expect(generator.getBuildingIndex()).toBe(0)
      expect(generator.getBuildings().length).toBe(0)
      expect(Object.keys(generator.getSorters()).length).toBe(0)
      expect(generator.getBlueprintSize()).toEqual({ x: 0, y: 0 })
      expect(generator.getLastProductionBuildingType()).toBe(0)
    })
  })

  describe('occupiedArea', () => {
    it('should track occupied areas', () => {
      generator.addOccupiedArea({ x1: 0, y1: 0, x2: 2, y2: 2 })
      generator.addOccupiedArea({ x1: 5, y1: 5, x2: 7, y2: 7 })

      const areas = generator.getOccupiedArea()
      expect(areas.length).toBe(2)
    })
  })

  describe('sprayCoaterOffsetList', () => {
    it('should track spray coater offsets', () => {
      generator.addSprayCoaterOffset({ x: 1, y: 1, z: 0 })
      generator.addSprayCoaterOffset({ x: 2, y: 2, z: 0 })

      const offsets = generator.getSprayCoaterOffsetList()
      expect(offsets.length).toBe(2)
    })
  })
})

describe('LayoutCalculator', () => {
  let calculator: LayoutCalculator

  beforeEach(() => {
    calculator = new LayoutCalculator()
  })

  describe('calculateBuildingArea', () => {
    const mockBuilding: IBuildingData = {
      name: 'testBuilding',
      itemId: 1001,
      modelIndex: 2303,
      size: { x: 3, y: 4 },
      remark: ''
    }

    it('should calculate area with no rotation', () => {
      const area = calculator.calculateBuildingArea(mockBuilding, 0, true)
      expect(area.width).toBe(3)
      expect(area.height).toBe(4)
    })

    it('should swap dimensions for 90/270 degree rotation', () => {
      const area90 = calculator.calculateBuildingArea(mockBuilding, 1, true)
      expect(area90.width).toBe(4)
      expect(area90.height).toBe(3)

      const area270 = calculator.calculateBuildingArea(mockBuilding, 3, true)
      expect(area270.width).toBe(4)
      expect(area270.height).toBe(3)
    })

    it('should add spacing for non-compact layout', () => {
      const area = calculator.calculateBuildingArea(mockBuilding, 0, false)
      expect(area.width).toBe(4)
      expect(area.height).toBe(5)
    })

    it('should return 1x1 for building without size', () => {
      const noSizeBuilding: IBuildingData = {
        name: 'noSizeBuilding',
        itemId: 1001,
        modelIndex: 2303,
        remark: ''
      }
      const area = calculator.calculateBuildingArea(noSizeBuilding, 0, true)
      expect(area.width).toBe(1)
      expect(area.height).toBe(1)
    })
  })

  describe('isAreaAvailable', () => {
    it('should return true for empty area', () => {
      expect(calculator.isAreaAvailable(0, 0, 2, 2)).toBe(true)
    })

    it('should return false for overlapping area', () => {
      calculator.occupyArea(0, 0, 2, 2)
      expect(calculator.isAreaAvailable(1, 1, 2, 2)).toBe(false)
    })

    it('should return true for non-overlapping area', () => {
      calculator.occupyArea(0, 0, 2, 2)
      expect(calculator.isAreaAvailable(3, 3, 2, 2)).toBe(true)
    })
  })

  describe('areasOverlap', () => {
    it('should detect overlapping areas', () => {
      const a = { x1: 0, y1: 0, x2: 2, y2: 2 }
      const b = { x1: 1, y1: 1, x2: 3, y2: 3 }
      expect(calculator.areasOverlap(a, b)).toBe(true)
    })

    it('should not detect non-overlapping areas', () => {
      const a = { x1: 0, y1: 0, x2: 2, y2: 2 }
      const b = { x1: 3, y1: 3, x2: 5, y2: 5 }
      expect(calculator.areasOverlap(a, b)).toBe(false)
    })

    it('should detect adjacent areas as non-overlapping', () => {
      const a = { x1: 0, y1: 0, x2: 2, y2: 2 }
      const b = { x1: 3, y1: 0, x2: 5, y2: 2 }
      expect(calculator.areasOverlap(a, b)).toBe(false)
    })
  })

  describe('findNextAvailablePosition', () => {
    it('should find first available position', () => {
      const pos = calculator.findNextAvailablePosition(2, 2, 0, 0)
      expect(pos).toEqual({ x: 0, y: 0 })
    })

    it('should skip occupied positions', () => {
      calculator.occupyArea(0, 0, 2, 2)
      const pos = calculator.findNextAvailablePosition(2, 2, 0, 0)
      expect(pos.x).toBeGreaterThanOrEqual(2)
    })
  })

  describe('reset', () => {
    it('should clear occupied areas', () => {
      calculator.occupyArea(0, 0, 2, 2)
      calculator.occupyArea(5, 5, 2, 2)
      expect(calculator.getOccupiedArea().length).toBe(2)

      calculator.reset()
      expect(calculator.getOccupiedArea().length).toBe(0)
    })
  })
})

describe('SorterGenerator', () => {
  let generator: SorterGenerator

  beforeEach(() => {
    generator = new SorterGenerator()
  })

  const buildingOffset = { x: 0, y: 0, z: 0 }

  describe('PRODUCTION_CATEGORY constants', () => {
    it('should have correct category values', () => {
      expect(PRODUCTION_CATEGORY.smelter).toBe(0)
      expect(PRODUCTION_CATEGORY.assembling).toBe(1)
      expect(PRODUCTION_CATEGORY.plant).toBe(2)
      expect(PRODUCTION_CATEGORY.refinery).toBe(3)
      expect(PRODUCTION_CATEGORY.collider).toBe(4)
      expect(PRODUCTION_CATEGORY.lab).toBe(5)
    })
  })

  describe('calculateSorterLocalOffsetAndYaw', () => {
    describe('smelter/assembling category', () => {
      it('should calculate offset for slot 8', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.smelter,
          8,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw.length).toBe(2)
        expect(result.yaw[0]).toBe(180)
      })

      it('should calculate offset for slot 7', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.assembling,
          7,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.offset[0].y).toBe(-1)
        expect(result.offset[1].y).toBe(-2)
      })

      it('should throw for invalid slot < 3', () => {
        expect(() => {
          generator.calculateSorterLocalOffsetAndYaw(
            buildingOffset,
            PRODUCTION_CATEGORY.smelter,
            2,
            0
          )
        }).toThrow('unsupported slotIndex < 3')
      })
    })

    describe('plant category', () => {
      it('should calculate offset for slot 6', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.plant,
          6,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(180)
      })

      it('should calculate offset for slot 0', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.plant,
          0,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(270)
      })
    })

    describe('refinery category', () => {
      it('should calculate offset for slot 8', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.refinery,
          8,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(180)
      })

      it('should calculate offset for slot 0', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.refinery,
          0,
          0
        )

        expect(result.offset.length).toBe(2)
      })
    })

    describe('collider category', () => {
      it('should calculate offset for slot 8', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.collider,
          8,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.offset[0].y).toBe(-2)
      })

      it('should calculate offset for slot 0', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.collider,
          0,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.offset[0].y).toBe(2)
      })
    })

    describe('lab category', () => {
      it('should calculate offset for slot 11', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.lab,
          11,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(90)
      })

      it('should calculate offset for slot 3', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.lab,
          3,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(270)
      })

      it('should throw for invalid slot < 3', () => {
        expect(() => {
          generator.calculateSorterLocalOffsetAndYaw(buildingOffset, PRODUCTION_CATEGORY.lab, 2, 0)
        }).toThrow('unsupported: lab slot < 3')
      })
    })

    describe('rotation', () => {
      it('should reverse offsets when rotate is 1', () => {
        const result0 = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.smelter,
          8,
          0
        )
        const result1 = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.smelter,
          8,
          1
        )

        expect(result1.offset[0]).toEqual(result0.offset[1])
        expect(result1.offset[1]).toEqual(result0.offset[0])
      })
    })

    describe('unsupported category', () => {
      it('should throw for unsupported category', () => {
        expect(() => {
          generator.calculateSorterLocalOffsetAndYaw(buildingOffset, 99 as any, 8, 0)
        }).toThrow('unsupported production category')
      })
    })
  })
})
