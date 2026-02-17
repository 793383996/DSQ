import { describe, it, expect, beforeEach } from 'vitest'
import { ConnectionBuilder, DEFAULT_CONNECTION_CONFIG } from '../ConnectionBuilder'
import type { IBlueprintBuilding } from '../../../types/blueprint'
import type { ISorterMap } from '../../types/buildingGenerator'

describe('ConnectionBuilder', () => {
  let builder: ConnectionBuilder

  const createMockBuilding = (index: number): IBlueprintBuilding => ({
    index,
    localOffset: null,
    yaw: [],
    itemId: 1001,
    outputObjIdx: -1,
    inputObjIdx: -1,
    outputToSlot: 0,
    inputFromSlot: 0,
    outputFromSlot: 0,
    inputToSlot: 0,
    outputOffset: 0,
    inputOffset: 0,
    recipeId: 0,
    filterId: 0,
    parameters: null
  })

  beforeEach(() => {
    builder = new ConnectionBuilder()
  })

  describe('DEFAULT_CONNECTION_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CONNECTION_CONFIG.maxSorterNumOneBelt).toBe(8)
      expect(DEFAULT_CONNECTION_CONFIG.stackLayers).toBe(1)
    })
  })

  describe('connectSortersToConveyor', () => {
    it('should connect output sorters to conveyor nodes', () => {
      const buildings: IBlueprintBuilding[] = [createMockBuilding(0), createMockBuilding(1)]

      const sorters: ISorterMap = {
        ironOre: {
          output: [
            {
              index: 0,
              rate: 10,
              ownerObjIdx: 0,
              ownerName: 'arcSmelter',
              ownerOffset: { x: 0, y: 0, z: 0 },
              recipeID: 0
            },
            {
              index: 1,
              rate: 10,
              ownerObjIdx: 1,
              ownerName: 'arcSmelter',
              ownerOffset: { x: 3, y: 0, z: 0 },
              recipeID: 0
            }
          ]
        }
      }

      const itemSummary = {
        ironOre: { rate: 20, fromBuildingNum: 2 }
      }

      builder.connectSortersToConveyor(buildings, sorters, 10, itemSummary)

      expect(buildings[0].outputObjIdx).toBe(10)
      expect(buildings[1].outputObjIdx).toBe(10)
    })

    it('should connect input sorters to conveyor nodes', () => {
      const buildings: IBlueprintBuilding[] = [createMockBuilding(0), createMockBuilding(1)]

      const sorters: ISorterMap = {
        ironOre: {
          input: [
            {
              index: 0,
              rate: 10,
              ownerObjIdx: 0,
              ownerName: 'arcSmelter',
              ownerOffset: { x: 0, y: 0, z: 0 },
              recipeID: 0
            },
            {
              index: 1,
              rate: 10,
              ownerObjIdx: 1,
              ownerName: 'arcSmelter',
              ownerOffset: { x: 3, y: 0, z: 0 },
              recipeID: 0
            }
          ]
        }
      }

      const itemSummary = {
        ironOre: { rate: 20, fromBuildingNum: 0, toBuildingNum: 2 }
      }

      builder.connectSortersToConveyor(buildings, sorters, 10, itemSummary)

      expect(buildings[0].inputObjIdx).toBe(11)
      expect(buildings[1].inputObjIdx).toBe(11)
    })

    it('should skip items not in itemSummary', () => {
      const buildings: IBlueprintBuilding[] = [createMockBuilding(0)]

      const sorters: ISorterMap = {
        ironOre: {
          output: [
            {
              index: 0,
              rate: 10,
              ownerObjIdx: 0,
              ownerName: 'arcSmelter',
              ownerOffset: { x: 0, y: 0, z: 0 },
              recipeID: 0
            }
          ]
        }
      }

      const itemSummary = {}

      builder.connectSortersToConveyor(buildings, sorters, 10, itemSummary)

      expect(buildings[0].outputObjIdx).toBe(-1)
    })
  })

  describe('connectBuildings', () => {
    it('should connect buildings with specified connections', () => {
      const buildings: IBlueprintBuilding[] = [
        createMockBuilding(0),
        createMockBuilding(1),
        createMockBuilding(2)
      ]

      builder.connectBuildings(buildings, [
        { fromIndex: 0, toIndex: 1 },
        { fromIndex: 1, toIndex: 2, fromSlot: 0, toSlot: 1 }
      ])

      expect(buildings[0].outputObjIdx).toBe(1)
      expect(buildings[1].outputObjIdx).toBe(2)
      expect(buildings[1].outputFromSlot).toBe(0)
      expect(buildings[1].outputToSlot).toBe(1)
    })

    it('should skip connections to non-existent buildings', () => {
      const buildings: IBlueprintBuilding[] = [createMockBuilding(0)]

      builder.connectBuildings(buildings, [
        { fromIndex: 0, toIndex: 99 },
        { fromIndex: 99, toIndex: 0 }
      ])

      expect(buildings[0].outputObjIdx).toBe(-1)
    })
  })

  describe('disconnectBuilding', () => {
    it('should disconnect a building', () => {
      const building = createMockBuilding(0)
      building.outputObjIdx = 5
      building.inputObjIdx = 3
      building.outputToSlot = 1
      building.inputFromSlot = 2

      builder.disconnectBuilding(building)

      expect(building.outputObjIdx).toBe(-1)
      expect(building.inputObjIdx).toBe(-1)
      expect(building.outputToSlot).toBe(0)
      expect(building.inputFromSlot).toBe(0)
    })
  })

  describe('validateConnections', () => {
    it('should return valid for correct connections', () => {
      const buildings: IBlueprintBuilding[] = [createMockBuilding(0), createMockBuilding(1)]
      buildings[0].outputObjIdx = 1
      buildings[1].inputObjIdx = 0

      const result = builder.validateConnections(buildings)

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should detect invalid output references', () => {
      const buildings: IBlueprintBuilding[] = [createMockBuilding(0)]
      buildings[0].outputObjIdx = 99

      const result = builder.validateConnections(buildings)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBe(1)
      expect(result.errors[0]).toContain('non-existent output')
    })

    it('should detect invalid input references', () => {
      const buildings: IBlueprintBuilding[] = [createMockBuilding(0)]
      buildings[0].inputObjIdx = 99

      const result = builder.validateConnections(buildings)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBe(1)
      expect(result.errors[0]).toContain('non-existent input')
    })

    it('should ignore -1 references', () => {
      const buildings: IBlueprintBuilding[] = [createMockBuilding(0), createMockBuilding(1)]
      buildings[0].outputObjIdx = -1
      buildings[0].inputObjIdx = -1

      const result = builder.validateConnections(buildings)

      expect(result.valid).toBe(true)
    })
  })

  describe('with stackLayers config', () => {
    it('should adjust sorters per node for stacked layers', () => {
      const stackedBuilder = new ConnectionBuilder({ stackLayers: 2, maxSorterNumOneBelt: 8 })

      const buildings: IBlueprintBuilding[] = [
        createMockBuilding(0),
        createMockBuilding(1),
        createMockBuilding(2),
        createMockBuilding(3)
      ]

      const sorters: ISorterMap = {
        ironOre: {
          output: [
            {
              index: 0,
              rate: 10,
              ownerObjIdx: 0,
              ownerName: 'arcSmelter',
              ownerOffset: { x: 0, y: 0, z: 0 },
              recipeID: 0
            },
            {
              index: 1,
              rate: 10,
              ownerObjIdx: 1,
              ownerName: 'arcSmelter',
              ownerOffset: { x: 3, y: 0, z: 0 },
              recipeID: 0
            },
            {
              index: 2,
              rate: 10,
              ownerObjIdx: 2,
              ownerName: 'arcSmelter',
              ownerOffset: { x: 6, y: 0, z: 0 },
              recipeID: 0
            },
            {
              index: 3,
              rate: 10,
              ownerObjIdx: 3,
              ownerName: 'arcSmelter',
              ownerOffset: { x: 9, y: 0, z: 0 },
              recipeID: 0
            }
          ]
        }
      }

      const itemSummary = {
        ironOre: { rate: 40, fromBuildingNum: 4 }
      }

      stackedBuilder.connectSortersToConveyor(buildings, sorters, 10, itemSummary)

      expect(buildings[0].outputObjIdx).toBe(10)
      expect(buildings[1].outputObjIdx).toBe(10)
      expect(buildings[2].outputObjIdx).toBe(10)
      expect(buildings[3].outputObjIdx).toBe(10)
    })
  })
})
