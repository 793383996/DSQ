import { describe, it, expect, beforeEach } from 'vitest'
import {
  ConveyorGeneratorFacade,
  createConveyorGeneratorFacade
} from '../generators/conveyor/ConveyorGeneratorFacade'
import type { IBuildingMapForConveyor } from '../generators/conveyor/ConveyorNodeBuilder'
import type { IItemSummary } from '../types/conveyorGenerator'
import type { ISorterMap } from '../types/buildingGenerator'

describe('ConveyorGeneratorFacade', () => {
  let facade: ConveyorGeneratorFacade
  const mockBuildingMap: IBuildingMapForConveyor & {
    sprayCoater: { itemId: number; modelIndex: number }
  } = {
    conveyorBeltMk1: { itemId: 2001, modelIndex: 1, transportSpeed: 6 },
    conveyorBeltMK3: { itemId: 2003, modelIndex: 3, transportSpeed: 30 },
    sprayCoater: { itemId: 2901, modelIndex: 1 }
  }

  beforeEach(() => {
    facade = createConveyorGeneratorFacade(mockBuildingMap, {
      selfSpray: false,
      stackLayers: 1
    })
  })

  describe('generateConveyors', () => {
    it('should return empty buildings when no items', () => {
      const result = facade.generateConveyors({
        itemSummary: {},
        sorters: {},
        itemMap: {},
        sprayCoaterOffsetList: [],
        lastProductionBuildingType: 0,
        proliferator: null,
        occupiedAreaX: 10
      })

      expect(result.buildings).toEqual([])
      expect(result.buildingIndex).toBe(0)
    })

    it('should generate conveyor nodes for items', () => {
      const itemSummary: IItemSummary = {
        'iron-ore': {
          rate: 30,
          fromBuildingNum: 1,
          outputSorters: [
            {
              index: 1,
              rate: 30,
              ownerObjIdx: 1,
              ownerName: 'smelter',
              ownerOffset: { x: 0, y: 0, z: 0 },
              recipeID: 0
            }
          ],
          inputSorters: []
        }
      }

      const sorters: ISorterMap = {
        'iron-ore': {
          output: [
            {
              index: 1,
              rate: 30,
              ownerObjIdx: 1,
              ownerName: 'smelter',
              ownerOffset: { x: 0, y: 0, z: 0 },
              recipeID: 0
            }
          ]
        }
      }

      const itemMap = {
        'iron-ore': { iconId: 1001, name: '铁矿石' }
      }

      const result = facade.generateConveyors({
        itemSummary,
        sorters,
        itemMap,
        sprayCoaterOffsetList: [],
        lastProductionBuildingType: 0,
        proliferator: null,
        occupiedAreaX: 10
      })

      expect(result.buildings.length).toBeGreaterThan(0)
      expect(result.buildingIndex).toBeGreaterThan(0)
    })
  })
})
