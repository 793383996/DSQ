import { describe, it, expect, beforeEach } from 'vitest'
import { ConveyorGenerator, BUILDING_TYPE } from '../generators/ConveyorGenerator'
import {
  ItemSummaryCalculator,
  DEFAULT_ITEM_SUMMARY_CONFIG
} from '../generators/ItemSummaryCalculator'
import { PRODUCTION_CATEGORY } from '../generators/SorterGenerator'
import type { IItemSummary, IItemSummaryEntry } from '../types/conveyorGenerator'
import type { ISubRecipe } from '../types/buildingGenerator'
import type { IBuildingData } from '../../types/blueprint'

const mockBuildingMap: Record<string, IBuildingData> = {
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
  assemblingMachineMk1: {
    name: 'assemblingMachineMk1',
    itemId: 1001,
    modelIndex: 2303,
    productionSpeed: 0.75,
    category: 1,
    size: { x: 3, y: 3 },
    remark: ''
  },
  arcSmelter: {
    name: 'arcSmelter',
    itemId: 1002,
    modelIndex: 2302,
    productionSpeed: 1,
    category: 0,
    size: { x: 3, y: 3 },
    remark: ''
  },
  lab: {
    name: 'lab',
    itemId: 1003,
    modelIndex: 2310,
    productionSpeed: 1,
    category: 5,
    size: { x: 3, y: 3 },
    remark: ''
  }
}

const mockItemMap: Record<string, { iconId: number }> = {
  ironOre: { iconId: 1001 },
  copperOre: { iconId: 1002 },
  ironIngot: { iconId: 1003 },
  copperIngot: { iconId: 1004 }
}

describe('ConveyorGenerator', () => {
  let generator: ConveyorGenerator

  beforeEach(() => {
    generator = new ConveyorGenerator(mockBuildingMap)
  })

  describe('BUILDING_TYPE constants', () => {
    it('should have correct type values', () => {
      expect(BUILDING_TYPE.conveyor).toBe(5)
    })
  })

  describe('selectConveyorBelt', () => {
    it('should select MK3 when onlyConveyorBeltMk3 is true', () => {
      const gen = new ConveyorGenerator(mockBuildingMap, { onlyConveyorBeltMk3: true })
      const belt = gen.selectConveyorBelt(5, 1)

      expect(belt.itemId).toBe(mockBuildingMap.conveyorBeltMK3.itemId)
      expect(belt.transportSpeed).toBe(30)
    })

    it('should select MK3 when rate >= MK1 speed', () => {
      const belt = generator.selectConveyorBelt(6, 1)

      expect(belt.itemId).toBe(mockBuildingMap.conveyorBeltMK3.itemId)
    })

    it('should select MK1 when rate < MK1 speed', () => {
      const belt = generator.selectConveyorBelt(4, 1)

      expect(belt.itemId).toBe(mockBuildingMap.conveyorBeltMk1.itemId)
      expect(belt.transportSpeed).toBe(6)
    })

    it('should upgrade conveyor belt when upgradeConveyorBelt is true', () => {
      const gen = new ConveyorGenerator(mockBuildingMap, { upgradeConveyorBelt: true })
      const belt = gen.selectConveyorBelt(6, 1)

      expect(belt.itemId).toBe(mockBuildingMap.conveyorBeltMK3.itemId)
    })
  })

  describe('calculateMaxTransportSpeed', () => {
    it('should return MK3 speed * stackLayer when fromBuildingNum is 0', () => {
      const gen = new ConveyorGenerator(mockBuildingMap, { conveyorBeltStackLayer: 4 })
      const speed = gen.calculateMaxTransportSpeed(0)

      expect(speed).toBe(30 * 4)
    })

    it('should return MK3 speed when fromBuildingNum > 0', () => {
      const speed = generator.calculateMaxTransportSpeed(5)

      expect(speed).toBe(30)
    })
  })

  describe('calculateSortersPerNode', () => {
    it('should return maxSorterNumOneBelt when stackLayers is 1', () => {
      const gen = new ConveyorGenerator(mockBuildingMap, { maxSorterNumOneBelt: 8, stackLayers: 1 })
      expect(gen.calculateSortersPerNode()).toBe(8)
    })

    it('should divide by stackLayers when stackLayers > 1', () => {
      const gen = new ConveyorGenerator(mockBuildingMap, { maxSorterNumOneBelt: 8, stackLayers: 4 })
      expect(gen.calculateSortersPerNode()).toBe(2)
    })

    it('should return at least 1', () => {
      const gen = new ConveyorGenerator(mockBuildingMap, {
        maxSorterNumOneBelt: 2,
        stackLayers: 10
      })
      expect(gen.calculateSortersPerNode()).toBe(1)
    })
  })

  describe('newConveyorNode', () => {
    it('should create a valid conveyor node', () => {
      const offset = { x: 5, y: 0, z: 0 }
      const yaw = [0, 0]
      const conveyor = { itemId: 2003, modelIndex: 2102 }

      const node = generator.newConveyorNode(offset, yaw, conveyor, 10, 1, {
        iconId: 1001,
        count: '10.0'
      })

      expect(node.index).toBe(1)
      expect(node.areaIndex).toBe(0)
      expect(node.itemId).toBe(2003)
      expect(node.modelIndex).toBe(2102)
      expect(node.outputObjIdx).toBe(10)
      expect(node.outputToSlot).toBe(1)
      expect(node.parameters).toEqual({ iconId: 1001, count: '10.0' })
    })

    it('should increment building index on each call', () => {
      const offset = { x: 5, y: 0, z: 0 }
      const conveyor = { itemId: 2003, modelIndex: 2102 }

      const node1 = generator.newConveyorNode(offset, [0, 0], conveyor, 10, 1, null)
      const node2 = generator.newConveyorNode(offset, [0, 0], conveyor, 11, 1, null)

      expect(node1.index).toBe(1)
      expect(node2.index).toBe(2)
    })
  })

  describe('generateConveyorBelt', () => {
    it('should generate conveyor nodes for item', () => {
      const itemEntry: IItemSummaryEntry = {
        rate: 10,
        fromBuildingNum: 2,
        toBuildingNum: 1
      }
      const sorters = {}
      const nodes = generator.generateConveyorBelt('ironOre', itemEntry, sorters, mockItemMap)

      expect(nodes.length).toBeGreaterThan(0)
      expect(nodes[0].itemId).toBe(mockBuildingMap.conveyorBeltMK3.itemId)
    })

    it('should create parameters with iconId', () => {
      const itemEntry: IItemSummaryEntry = {
        rate: 5,
        fromBuildingNum: 1,
        toBuildingNum: 1
      }
      const nodes = generator.generateConveyorBelt('ironOre', itemEntry, {}, mockItemMap)

      expect(nodes[0].parameters).not.toBeNull()
      expect((nodes[0].parameters as { iconId: number }).iconId).toBe(1001)
    })

    it('should return null parameters for unknown item', () => {
      const itemEntry: IItemSummaryEntry = {
        rate: 5,
        fromBuildingNum: 1,
        toBuildingNum: 1
      }
      const nodes = generator.generateConveyorBelt('unknownItem', itemEntry, {}, mockItemMap)

      expect(nodes[0].parameters).toBeNull()
    })
  })

  describe('generateConveyorBelts', () => {
    it('should generate conveyors for multiple items', () => {
      const itemSummary: IItemSummary = {
        ironOre: { rate: 10, fromBuildingNum: 2, toBuildingNum: 1 },
        copperOre: { rate: 8, fromBuildingNum: 1, toBuildingNum: 1 }
      }

      const nodes = generator.generateConveyorBelts(itemSummary, {}, mockItemMap)

      expect(nodes.length).toBeGreaterThan(0)
    })
  })

  describe('reset', () => {
    it('should clear buildings', () => {
      generator.newConveyorNode(
        { x: 0, y: 0, z: 0 },
        [0, 0],
        { itemId: 2003, modelIndex: 2102 },
        10,
        1,
        null
      )
      expect(generator.getBuildings().length).toBe(0)

      generator.reset()
      expect(generator.getBuildingIndex()).toBe(1)
    })
  })

  describe('setBuildingIndex', () => {
    it('should set building index', () => {
      generator.setBuildingIndex(100)
      expect(generator.getBuildingIndex()).toBe(100)
    })
  })

  describe('setOccupiedAreaX', () => {
    it('should set occupied area X', () => {
      generator.setOccupiedAreaX(50)
      generator.generateConveyorBelt(
        'ironOre',
        { rate: 5, fromBuildingNum: 1, toBuildingNum: 1 },
        {},
        mockItemMap
      )
    })
  })
})

describe('ItemSummaryCalculator', () => {
  let calculator: ItemSummaryCalculator

  beforeEach(() => {
    calculator = new ItemSummaryCalculator()
  })

  describe('DEFAULT_ITEM_SUMMARY_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_ITEM_SUMMARY_CONFIG.stackLayers).toBe(1)
      expect(DEFAULT_ITEM_SUMMARY_CONFIG.maxLabLayers).toBe(4)
      expect(DEFAULT_ITEM_SUMMARY_CONFIG.extraRate).toBe(1.25)
    })
  })

  describe('calculate', () => {
    it('should calculate item summary from subRecipes', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironIngot']).toBeDefined()
      expect(summary['ironOre']).toBeDefined()
      expect(summary['ironIngot'].rate).toBe(2)
      expect(summary['ironOre'].toBuildingNum).toBe(2)
    })

    it('should skip subRecipe without building', () => {
      const subRecipes: ISubRecipe[] = [
        {
          output: [{ name: 'ironOre', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(Object.keys(summary).length).toBe(0)
    })

    it('should skip unknown building', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'unknownBuilding', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(Object.keys(summary).length).toBe(0)
    })

    it('should apply extra rate for accelerator mode 1', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 1
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironIngot'].rate).toBe(1.25)
    })

    it('should handle lab category with maxLabLayers', () => {
      const calc = new ItemSummaryCalculator({ maxLabLayers: 4 })
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'lab', num: 8 },
          output: [{ name: 'sciencePack', rate: 1 }],
          input: [{ name: 'ironIngot', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const summary = calc.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironIngot'].toBuildingNum).toBe(2)
    })

    it('should accumulate rates for same item', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: null,
          acceleratorMode: 0
        },
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 0.5 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironIngot'].rate).toBe(1.5)
      expect(summary['ironIngot'].fromBuildingNum).toBe(2)
    })
  })

  describe('applyStackLayers', () => {
    it('should multiply rates by stackLayers', () => {
      const calc = new ItemSummaryCalculator({ stackLayers: 4 })
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const summary = calc.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironIngot'].rate).toBe(4)
      expect(summary['ironOre'].inputRate).toBe(4)
    })

    it('should not multiply when stackLayers is 1', () => {
      const calc = new ItemSummaryCalculator({ stackLayers: 1 })
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const summary = calc.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironIngot'].rate).toBe(1)
    })
  })

  describe('sortItemSummary', () => {
    it('should sort by fromBuildingNum descending', () => {
      const summary: IItemSummary = {
        ironOre: { rate: 5, fromBuildingNum: 1, toBuildingNum: 0 },
        copperOre: { rate: 3, fromBuildingNum: 3, toBuildingNum: 0 },
        coal: { rate: 2, fromBuildingNum: 2, toBuildingNum: 0 }
      }

      const sorted = calculator.sortItemSummary(summary)
      const keys = Object.keys(sorted)

      expect(keys[0]).toBe('copperOre')
      expect(keys[1]).toBe('coal')
      expect(keys[2]).toBe('ironOre')
    })

    it('should sort by toBuildingNum when fromBuildingNum is equal', () => {
      const summary: IItemSummary = {
        ironOre: { rate: 5, fromBuildingNum: 2, toBuildingNum: 1 },
        copperOre: { rate: 3, fromBuildingNum: 2, toBuildingNum: 3 },
        coal: { rate: 2, fromBuildingNum: 2, toBuildingNum: 2 }
      }

      const sorted = calculator.sortItemSummary(summary)
      const keys = Object.keys(sorted)

      expect(keys[0]).toBe('copperOre')
      expect(keys[1]).toBe('coal')
      expect(keys[2]).toBe('ironOre')
    })

    it('should sort by rate when fromBuildingNum and toBuildingNum are equal', () => {
      const summary: IItemSummary = {
        ironOre: { rate: 5, fromBuildingNum: 1, toBuildingNum: 1 },
        copperOre: { rate: 10, fromBuildingNum: 1, toBuildingNum: 1 },
        coal: { rate: 3, fromBuildingNum: 1, toBuildingNum: 1 }
      }

      const sorted = calculator.sortItemSummary(summary)
      const keys = Object.keys(sorted)

      expect(keys[0]).toBe('copperOre')
      expect(keys[1]).toBe('ironOre')
      expect(keys[2]).toBe('coal')
    })
  })

  describe('needProliferator flag', () => {
    it('should set needProliferator when acceleratorMode is not -1', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironOre'].needProliferator).toBe(true)
    })

    it('should not set needProliferator when acceleratorMode is -1', () => {
      const subRecipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: -1
        }
      ]

      const summary = calculator.calculate(subRecipes, mockBuildingMap, PRODUCTION_CATEGORY)

      expect(summary['ironOre'].needProliferator).toBeFalsy()
    })
  })
})
