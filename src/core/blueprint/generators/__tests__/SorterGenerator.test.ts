import { describe, it, expect, beforeEach } from 'vitest'
import { SorterGenerator, PRODUCTION_CATEGORY } from '../SorterGenerator'
import type { ICoordinate } from '../../../types/blueprint'

describe('SorterGenerator', () => {
  let generator: SorterGenerator

  beforeEach(() => {
    generator = new SorterGenerator()
  })

  describe('PRODUCTION_CATEGORY', () => {
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
    const buildingOffset: ICoordinate = { x: 0, y: 0, z: 0 }

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
          PRODUCTION_CATEGORY.smelter,
          7,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(180)
      })

      it('should calculate offset for slot 6', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.smelter,
          6,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(180)
      })

      it('should calculate offset for slot 5', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.smelter,
          5,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(90)
      })

      it('should calculate offset for slot 4', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.smelter,
          4,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(90)
      })

      it('should calculate offset for slot 3', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.smelter,
          3,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(90)
      })

      it('should throw error for slot < 3', () => {
        expect(() => {
          generator.calculateSorterLocalOffsetAndYaw(
            buildingOffset,
            PRODUCTION_CATEGORY.smelter,
            2,
            0
          )
        }).toThrow('unsupported slotIndex')
      })

      it('should handle rotation', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.smelter,
          8,
          1
        )

        expect(result.yaw[0]).toBe(0)
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
        expect(result.yaw[0]).toBe(0)
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
        expect(result.yaw[0]).toBe(270)
      })

      it('should calculate offset for slot 0', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.refinery,
          0,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(180)
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
        expect(result.yaw[0]).toBe(180)
      })

      it('should calculate offset for slot 0', () => {
        const result = generator.calculateSorterLocalOffsetAndYaw(
          buildingOffset,
          PRODUCTION_CATEGORY.collider,
          0,
          0
        )

        expect(result.offset.length).toBe(2)
        expect(result.yaw[0]).toBe(0)
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

      it('should throw error for slot < 3', () => {
        expect(() => {
          generator.calculateSorterLocalOffsetAndYaw(buildingOffset, PRODUCTION_CATEGORY.lab, 2, 0)
        }).toThrow('unsupported: lab slot < 3')
      })
    })

    describe('unknown category', () => {
      it('should throw error for unsupported category', () => {
        expect(() => {
          generator.calculateSorterLocalOffsetAndYaw(buildingOffset, 99 as any, 8, 0)
        }).toThrow('unsupported production category')
      })
    })

    describe('with building offset', () => {
      it('should apply building offset to result', () => {
        const offset: ICoordinate = { x: 10, y: 20, z: 5 }
        const result = generator.calculateSorterLocalOffsetAndYaw(
          offset,
          PRODUCTION_CATEGORY.smelter,
          8,
          0
        )

        expect(result.offset[0].x).toBe(offset.x - 0.9)
        expect(result.offset[0].y).toBe(offset.y - 1)
        expect(result.offset[0].z).toBe(offset.z)
      })
    })

    describe('rotation handling', () => {
      it('should reverse offset array when rotate is 1', () => {
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
  })
})
