import { describe, it, expect } from 'vitest'
import { StackService, createStackService } from '../services/StackService'
import type { ISubRecipe, IItemSummary, ISorterMap } from '../types/stack'
import type { IBlueprintBuilding } from '../types/blueprint'

describe('StackService', () => {
  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const service = new StackService()
      const config = service.getConfig()

      expect(config.stackLayers).toBe(1)
      expect(config.maxLabLayers).toBe(4)
      expect(config.maxSorterNumOneBelt).toBe(8)
      expect(config.zStep).toBe(10)
    })

    it('should merge provided config with defaults', () => {
      const service = new StackService({ stackLayers: 4 })
      const config = service.getConfig()

      expect(config.stackLayers).toBe(4)
      expect(config.maxLabLayers).toBe(4)
    })

    it('should not mutate original config', () => {
      const service = new StackService({ stackLayers: 2 })
      const config1 = service.getConfig()
      config1.stackLayers = 10
      const config2 = service.getConfig()

      expect(config2.stackLayers).toBe(2)
    })
  })

  describe('reduceBuildingNum', () => {
    it('should not modify when stackLayers is 1', () => {
      const service = new StackService({ stackLayers: 1 })
      const subRecipes: ISubRecipe[] = [{ building: { name: 'assemblingMachineMk1', num: 60 } }]

      service.reduceBuildingNum(subRecipes)

      expect(subRecipes[0].building!.num).toBe(60)
    })

    it('should reduce non-lab building num by stackLayers', () => {
      const service = new StackService({ stackLayers: 4 })
      const subRecipes: ISubRecipe[] = [{ building: { name: 'assemblingMachineMk1', num: 60 } }]

      service.reduceBuildingNum(subRecipes)

      expect(subRecipes[0].building!.num).toBe(15)
    })

    it('should use ceil for non-divisible numbers', () => {
      const service = new StackService({ stackLayers: 4 })
      const subRecipes: ISubRecipe[] = [{ building: { name: 'assemblingMachineMk1', num: 61 } }]

      service.reduceBuildingNum(subRecipes)

      expect(subRecipes[0].building!.num).toBe(16)
    })

    it('should not reduce lab building num', () => {
      const service = new StackService({ stackLayers: 4 })
      const subRecipes: ISubRecipe[] = [{ building: { name: 'lab', num: 12 } }]

      service.reduceBuildingNum(subRecipes)

      expect(subRecipes[0].building!.num).toBe(12)
    })

    it('should handle multiple subRecipes', () => {
      const service = new StackService({ stackLayers: 4 })
      const subRecipes: ISubRecipe[] = [
        { building: { name: 'assemblingMachineMk1', num: 60 } },
        { building: { name: 'lab', num: 8 } },
        { building: { name: 'arcSmelter', num: 32 } }
      ]

      service.reduceBuildingNum(subRecipes)

      expect(subRecipes[0].building!.num).toBe(15)
      expect(subRecipes[1].building!.num).toBe(8)
      expect(subRecipes[2].building!.num).toBe(8)
    })

    it('should handle subRecipe without building', () => {
      const service = new StackService({ stackLayers: 4 })
      const subRecipes: ISubRecipe[] = [{ building: { name: 'assemblingMachineMk1', num: 60 } }, {}]

      service.reduceBuildingNum(subRecipes)

      expect(subRecipes[0].building!.num).toBe(15)
    })
  })

  describe('scaleItemSummary', () => {
    it('should not modify when stackLayers is 1', () => {
      const service = new StackService({ stackLayers: 1 })
      const itemSummary: IItemSummary = {
        ironOre: { rate: 100 }
      }

      service.scaleItemSummary(itemSummary)

      expect(itemSummary['ironOre'].rate).toBe(100)
    })

    it('should scale rate by stackLayers', () => {
      const service = new StackService({ stackLayers: 4 })
      const itemSummary: IItemSummary = {
        ironOre: { rate: 100 }
      }

      service.scaleItemSummary(itemSummary)

      expect(itemSummary['ironOre'].rate).toBe(400)
    })

    it('should scale inputRate when present', () => {
      const service = new StackService({ stackLayers: 4 })
      const itemSummary: IItemSummary = {
        ironOre: { rate: 100, inputRate: 50 }
      }

      service.scaleItemSummary(itemSummary)

      expect(itemSummary['ironOre'].rate).toBe(400)
      expect(itemSummary['ironOre'].inputRate).toBe(200)
    })

    it('should handle multiple items', () => {
      const service = new StackService({ stackLayers: 2 })
      const itemSummary: IItemSummary = {
        ironOre: { rate: 100 },
        copperOre: { rate: 200, inputRate: 150 }
      }

      service.scaleItemSummary(itemSummary)

      expect(itemSummary['ironOre'].rate).toBe(200)
      expect(itemSummary['copperOre'].rate).toBe(400)
      expect(itemSummary['copperOre'].inputRate).toBe(300)
    })
  })

  describe('scaleSorters', () => {
    it('should not modify when stackLayers is 1', () => {
      const service = new StackService({ stackLayers: 1 })
      const sorters: ISorterMap = {
        ironOre: {
          output: [{ rate: 10 }]
        }
      }

      service.scaleSorters(sorters)

      expect(sorters['ironOre'].output![0].rate).toBe(10)
    })

    it('should scale output sorter rates', () => {
      const service = new StackService({ stackLayers: 4 })
      const sorters: ISorterMap = {
        ironOre: {
          output: [{ rate: 10 }, { rate: 20 }]
        }
      }

      service.scaleSorters(sorters)

      expect(sorters['ironOre'].output![0].rate).toBe(40)
      expect(sorters['ironOre'].output![1].rate).toBe(80)
    })

    it('should scale input sorter rates', () => {
      const service = new StackService({ stackLayers: 4 })
      const sorters: ISorterMap = {
        ironOre: {
          input: [{ rate: 15 }]
        }
      }

      service.scaleSorters(sorters)

      expect(sorters['ironOre'].input![0].rate).toBe(60)
    })

    it('should handle both input and output', () => {
      const service = new StackService({ stackLayers: 2 })
      const sorters: ISorterMap = {
        ironOre: {
          output: [{ rate: 10 }],
          input: [{ rate: 5 }]
        }
      }

      service.scaleSorters(sorters)

      expect(sorters['ironOre'].output![0].rate).toBe(20)
      expect(sorters['ironOre'].input![0].rate).toBe(10)
    })
  })

  describe('getSortersPerNode', () => {
    it('should return maxSorterNumOneBelt when stackLayers is 1', () => {
      const service = new StackService({ stackLayers: 1, maxSorterNumOneBelt: 8 })

      expect(service.getSortersPerNode()).toBe(8)
    })

    it('should divide by stackLayers when greater than 1', () => {
      const service = new StackService({ stackLayers: 4, maxSorterNumOneBelt: 8 })

      expect(service.getSortersPerNode()).toBe(2)
    })

    it('should return at least 1', () => {
      const service = new StackService({ stackLayers: 10, maxSorterNumOneBelt: 8 })

      expect(service.getSortersPerNode()).toBe(1)
    })
  })

  describe('getZOffset', () => {
    it('should return layer * zStep', () => {
      const service = new StackService({ zStep: 10 })

      expect(service.getZOffset(0)).toBe(0)
      expect(service.getZOffset(1)).toBe(10)
      expect(service.getZOffset(3)).toBe(30)
    })
  })
})

describe('createStackService', () => {
  it('should create StackService instance', () => {
    const service = createStackService({ stackLayers: 4 })

    expect(service).toBeInstanceOf(StackService)
    expect(service.getConfig().stackLayers).toBe(4)
  })
})

function createTestBuilding(
  index: number,
  itemId: number = 2303,
  inputObjIdx: number = -1,
  outputObjIdx: number = -1
): IBlueprintBuilding {
  return {
    index,
    areaIndex: 0,
    localOffset: [
      { x: index * 3, y: 0, z: 0 },
      { x: index * 3, y: 0, z: 0 }
    ],
    yaw: [0, 0],
    itemId,
    modelIndex: 0,
    outputObjIdx,
    inputObjIdx,
    outputToSlot: 0,
    inputFromSlot: 0,
    outputFromSlot: 0,
    inputToSlot: 0,
    outputOffset: 0,
    inputOffset: 0,
    recipeId: 1,
    filterId: 0,
    parameters: null
  }
}

describe('StackService cloneToStackLayers', () => {
  describe('createCloneFilter', () => {
    it('should identify lab indices', () => {
      const service = new StackService({ stackLayers: 4 })
      const buildings = [
        createTestBuilding(0, 2303),
        createTestBuilding(1, 2901),
        createTestBuilding(2, 2304)
      ]

      const filter = service.createCloneFilter(buildings)

      expect(filter.labIndices.has(1)).toBe(true)
      expect(filter.labIndices.has(0)).toBe(false)
    })

    it('should include lab and belt item ids', () => {
      const service = new StackService({ stackLayers: 4 })
      const buildings = [createTestBuilding(0, 2303)]

      const filter = service.createCloneFilter(buildings)

      expect(filter.beltItemIds.has(2001)).toBe(true)
      expect(filter.beltItemIds.has(2002)).toBe(true)
      expect(filter.beltItemIds.has(2003)).toBe(true)
    })
  })

  describe('isCloneable', () => {
    it('should not clone lab buildings', () => {
      const service = new StackService({ stackLayers: 4 })
      const filter = service.createCloneFilter([])
      const labBuilding = createTestBuilding(0, 2901)

      expect(service.isCloneable(labBuilding, filter)).toBe(false)
    })

    it('should not clone belt buildings', () => {
      const service = new StackService({ stackLayers: 4 })
      const filter = service.createCloneFilter([])
      const beltBuilding = createTestBuilding(0, 2001)

      expect(service.isCloneable(beltBuilding, filter)).toBe(false)
    })

    it('should not clone buildings connected to lab', () => {
      const service = new StackService({ stackLayers: 4 })
      const buildings = [createTestBuilding(0, 2901), createTestBuilding(1, 2011, 0)]
      const filter = service.createCloneFilter(buildings)
      const sorterConnectedToLab = buildings[1]

      expect(service.isCloneable(sorterConnectedToLab, filter)).toBe(false)
    })

    it('should clone regular production buildings', () => {
      const service = new StackService({ stackLayers: 4 })
      const filter = service.createCloneFilter([])
      const assemblerBuilding = createTestBuilding(0, 2303)

      expect(service.isCloneable(assemblerBuilding, filter)).toBe(true)
    })
  })

  describe('cloneToStackLayers', () => {
    it('should return empty result when stackLayers is 1', () => {
      const service = new StackService({ stackLayers: 1 })
      const buildings = [createTestBuilding(0, 2303)]

      const result = service.cloneToStackLayers(buildings, 0)

      expect(result.buildings.length).toBe(0)
      expect(result.foundations.length).toBe(0)
    })

    it('should generate correct number of foundations', () => {
      const service = new StackService({ stackLayers: 4 })
      const buildings = [createTestBuilding(0, 2303)]

      const result = service.cloneToStackLayers(buildings, 0)

      expect(result.foundations.length).toBe(4)
    })

    it('should generate foundations with correct z positions', () => {
      const service = new StackService({ stackLayers: 4, zStep: 10 })
      const buildings = [createTestBuilding(0, 2303)]

      const result = service.cloneToStackLayers(buildings, 0)

      expect(result.foundations[0].localOffset![0].z).toBe(-10)
      expect(result.foundations[1].localOffset![0].z).toBe(0)
      expect(result.foundations[2].localOffset![0].z).toBe(10)
      expect(result.foundations[3].localOffset![0].z).toBe(20)
    })

    it('should clone buildings to multiple layers', () => {
      const service = new StackService({ stackLayers: 4 })
      const buildings = [createTestBuilding(0, 2303), createTestBuilding(1, 2304)]

      const result = service.cloneToStackLayers(buildings, 1)

      expect(result.buildings.length).toBe(6)
    })

    it('should apply correct z offset to cloned buildings', () => {
      const service = new StackService({ stackLayers: 4, zStep: 10 })
      const buildings = [createTestBuilding(0, 2303)]

      const result = service.cloneToStackLayers(buildings, 0)

      const layer1Building = result.buildings.find(b => b.localOffset![0].z === 10)
      const layer2Building = result.buildings.find(b => b.localOffset![0].z === 20)
      const layer3Building = result.buildings.find(b => b.localOffset![0].z === 30)

      expect(layer1Building).toBeDefined()
      expect(layer2Building).toBeDefined()
      expect(layer3Building).toBeDefined()
    })

    it('should not clone lab buildings', () => {
      const service = new StackService({ stackLayers: 4 })
      const buildings = [createTestBuilding(0, 2303), createTestBuilding(1, 2901)]

      const result = service.cloneToStackLayers(buildings, 1)

      const clonedLab = result.buildings.find(b => b.itemId === 2901)
      expect(clonedLab).toBeUndefined()
    })

    it('should not clone belt buildings', () => {
      const service = new StackService({ stackLayers: 4 })
      const buildings = [createTestBuilding(0, 2303), createTestBuilding(1, 2001)]

      const result = service.cloneToStackLayers(buildings, 1)

      const clonedBelt = result.buildings.find(b => b.itemId === 2001)
      expect(clonedBelt).toBeUndefined()
    })

    it('should remap inputObjIdx to foundation', () => {
      const service = new StackService({ stackLayers: 4 })
      const buildings = [createTestBuilding(0, 2303, -1, -1)]

      const result = service.cloneToStackLayers(buildings, 0)

      const foundationStartIndex = 1
      const layer1Building = result.buildings[0]
      expect(layer1Building.inputObjIdx).toBe(foundationStartIndex + 1)
    })

    it('should preserve building properties', () => {
      const service = new StackService({ stackLayers: 4 })
      const building = createTestBuilding(0, 2303)
      building.recipeId = 42
      building.filterId = 100

      const result = service.cloneToStackLayers([building], 0)

      expect(result.buildings[0].itemId).toBe(2303)
      expect(result.buildings[0].recipeId).toBe(42)
      expect(result.buildings[0].filterId).toBe(100)
    })

    it('should update buildingIndex after cloning', () => {
      const service = new StackService({ stackLayers: 4 })
      const buildings = [createTestBuilding(0, 2303)]

      service.cloneToStackLayers(buildings, 0)

      const newIndex = service.getBuildingIndex()
      expect(newIndex).toBeGreaterThan(0)
    })

    it('should store indexMap per layer', () => {
      const service = new StackService({ stackLayers: 4 })
      const buildings = [createTestBuilding(0, 2303)]

      const result = service.cloneToStackLayers(buildings, 0)

      expect(result.indexMap.size).toBe(3)
      expect(result.indexMap.has(1)).toBe(true)
      expect(result.indexMap.has(2)).toBe(true)
      expect(result.indexMap.has(3)).toBe(true)
    })

    it('should deep clone parameters', () => {
      const service = new StackService({ stackLayers: 4 })
      const building = createTestBuilding(0, 2303)
      building.parameters = { test: { nested: 'value' } }

      const result = service.cloneToStackLayers([building], 0)

      expect(result.buildings[0].parameters).toEqual({ test: { nested: 'value' } })
      result.buildings[0].parameters!.test.nested = 'modified'
      expect(building.parameters!.test.nested).toBe('value')
    })

    it('should deep clone yaw array', () => {
      const service = new StackService({ stackLayers: 4 })
      const building = createTestBuilding(0, 2303)
      building.yaw = [45, 90]

      const result = service.cloneToStackLayers([building], 0)

      expect(result.buildings[0].yaw).toEqual([45, 90])
      result.buildings[0].yaw![0] = 180
      expect(building.yaw![0]).toBe(45)
    })

    it('should handle empty buildings array', () => {
      const service = new StackService({ stackLayers: 4 })

      const result = service.cloneToStackLayers([], 0)

      expect(result.buildings.length).toBe(0)
      expect(result.foundations.length).toBe(0)
    })

    it('should auto-correct currentBuildingIndex if too small', () => {
      const service = new StackService({ stackLayers: 4 })
      const buildings = [createTestBuilding(100, 2303), createTestBuilding(200, 2304)]

      const result = service.cloneToStackLayers(buildings, 50)

      expect(result.foundations[0].index).toBe(201)
      expect(result.foundations[1].index).toBe(202)
    })
  })
})
