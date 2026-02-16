import { describe, it, expect } from 'vitest'
import {
  adaptBuildingMapForConveyor,
  hasRequiredConveyorBuildings,
  hasRequiredSprayCoaterBuilding
} from '../adapters/buildingMapAdapter'
import type { IBuildingData } from '../../types/blueprint'

describe('buildingMapAdapter', () => {
  const createMockBuildingMap = (): Record<string, IBuildingData> => ({
    '传送带MK.I': {
      name: '传送带MK.I',
      itemId: 2001,
      modelIndex: 1,
      remark: '',
      transportSpeed: 6
    },
    '传送带MK.III': {
      name: '传送带MK.III',
      itemId: 2003,
      modelIndex: 3,
      remark: '',
      transportSpeed: 30
    },
    喷涂机: {
      name: '喷涂机',
      itemId: 2901,
      modelIndex: 1,
      remark: ''
    }
  })

  describe('adaptBuildingMapForConveyor', () => {
    it('should adapt building map for conveyor generator', () => {
      const buildingMap = createMockBuildingMap()
      const result = adaptBuildingMapForConveyor(buildingMap)

      expect(result.conveyorBeltMk1.itemId).toBe(2001)
      expect(result.conveyorBeltMk1.transportSpeed).toBe(6)
      expect(result.conveyorBeltMK3.itemId).toBe(2003)
      expect(result.conveyorBeltMK3.transportSpeed).toBe(30)
      expect(result.sprayCoater.itemId).toBe(2901)
    })

    it('should throw error when missing conveyor belt MK.I', () => {
      const buildingMap = createMockBuildingMap()
      delete buildingMap['传送带MK.I']

      expect(() => adaptBuildingMapForConveyor(buildingMap)).toThrow(
        'Missing required conveyor belt definitions in buildingMap'
      )
    })

    it('should throw error when missing conveyor belt MK.III', () => {
      const buildingMap = createMockBuildingMap()
      delete buildingMap['传送带MK.III']

      expect(() => adaptBuildingMapForConveyor(buildingMap)).toThrow(
        'Missing required conveyor belt definitions in buildingMap'
      )
    })

    it('should throw error when missing spray coater', () => {
      const buildingMap = createMockBuildingMap()
      delete buildingMap['喷涂机']

      expect(() => adaptBuildingMapForConveyor(buildingMap)).toThrow(
        'Missing required spray coater definition in buildingMap'
      )
    })
  })

  describe('hasRequiredConveyorBuildings', () => {
    it('should return true when all conveyor buildings exist', () => {
      const buildingMap = createMockBuildingMap()
      expect(hasRequiredConveyorBuildings(buildingMap)).toBe(true)
    })

    it('should return false when missing MK.I', () => {
      const buildingMap = createMockBuildingMap()
      delete buildingMap['传送带MK.I']
      expect(hasRequiredConveyorBuildings(buildingMap)).toBe(false)
    })

    it('should return false when missing MK.III', () => {
      const buildingMap = createMockBuildingMap()
      delete buildingMap['传送带MK.III']
      expect(hasRequiredConveyorBuildings(buildingMap)).toBe(false)
    })
  })

  describe('hasRequiredSprayCoaterBuilding', () => {
    it('should return true when spray coater exists', () => {
      const buildingMap = createMockBuildingMap()
      expect(hasRequiredSprayCoaterBuilding(buildingMap)).toBe(true)
    })

    it('should return false when spray coater missing', () => {
      const buildingMap = createMockBuildingMap()
      delete buildingMap['喷涂机']
      expect(hasRequiredSprayCoaterBuilding(buildingMap)).toBe(false)
    })
  })
})
