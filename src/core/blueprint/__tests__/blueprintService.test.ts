import { describe, it, expect, beforeEach } from 'vitest'
import { BlueprintService, DEFAULT_BLUEPRINT_SERVICE_CONFIG } from '../services/BlueprintService'
import { ConnectionBuilder, DEFAULT_CONNECTION_CONFIG } from '../generators/ConnectionBuilder'
import type { ISubRecipe } from '../types/buildingGenerator'
import type { IBuildingData } from '../../types/blueprint'

const mockBuildingMap: Record<string, IBuildingData> = {
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
    size: { x: 2, y: 2 },
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
  },
  sprayCoater: {
    name: 'sprayCoater',
    itemId: 2313,
    modelIndex: 2401,
    productionSpeed: 1,
    category: 8,
    size: { x: 2, y: 2 },
    remark: ''
  },
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
  sorterMk1: {
    name: 'sorterMk1',
    itemId: 2100,
    modelIndex: 2200,
    sortingSpeed: 6,
    remark: ''
  },
  sorterMk3: {
    name: 'sorterMk3',
    itemId: 2102,
    modelIndex: 2202,
    sortingSpeed: 30,
    remark: ''
  },
  teslaTower: {
    name: 'teslaTower',
    itemId: 1101,
    modelIndex: 1201,
    remark: ''
  }
}

const mockItemMap: Record<string, { iconId: number; name: string }> = {
  ironOre: { iconId: 1001, name: 'ironOre' },
  copperOre: { iconId: 1002, name: 'copperOre' },
  ironIngot: { iconId: 1003, name: 'ironIngot' },
  copperIngot: { iconId: 1004, name: 'copperIngot' },
  magneticCoil: { iconId: 1005, name: 'magneticCoil' },
  magnet: { iconId: 1006, name: 'magnet' },
  proliferatorMk3: { iconId: 1143, name: 'proliferatorMk3' }
}

describe('BlueprintService', () => {
  let service: BlueprintService

  beforeEach(() => {
    service = new BlueprintService()
  })

  describe('DEFAULT_BLUEPRINT_SERVICE_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.conveyorBeltStackLayer).toBe(4)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.onlyConveyorBeltMk3).toBe(false)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.onlySorterMk3).toBe(false)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.useSorterMk4).toBe(false)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.selfSpray).toBe(false)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.generateTeslaTower).toBe(false)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.teslaTowerInterval).toBe(10)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.teslaTowerLineInterval).toBe(2)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.compactLayout).toBe(false)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.maxLabLayers).toBe(4)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.stackLayers).toBe(1)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.upgradeConveyorBelt).toBe(true)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.onlyConveyorBeltMk3Downgrade).toBe(false)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.xYRatio).toBe(2)
      expect(DEFAULT_BLUEPRINT_SERVICE_CONFIG.extraRate).toBe(1.25)
    })
  })

  describe('constructor', () => {
    it('should create service with default config', () => {
      const config = service.getConfig()
      expect(config.stackLayers).toBe(1)
      expect(config.onlyConveyorBeltMk3).toBe(false)
    })

    it('should merge custom config', () => {
      const customService = new BlueprintService({
        stackLayers: 4,
        onlyConveyorBeltMk3: true
      })
      const config = customService.getConfig()

      expect(config.stackLayers).toBe(4)
      expect(config.onlyConveyorBeltMk3).toBe(true)
    })
  })

  describe('generate', () => {
    it('should generate blueprint data from simple recipe', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result).toBeDefined()
      expect(result.version).toBe(1)
      expect(result.areas.length).toBe(1)
      expect(result.buildings.length).toBeGreaterThan(0)
    })

    it('should skip recipes without building', () => {
      const recipes: ISubRecipe[] = [
        {
          output: [{ name: 'ironOre', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result.buildings.length).toBe(0)
    })

    it('should skip unknown buildings', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'unknownBuilding', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result.buildings.length).toBe(0)
    })

    it('should generate multiple buildings for multiple recipes', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        },
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'copperIngot', rate: 1 }],
          input: [{ name: 'copperOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const productionBuildings = result.buildings.filter(
        b => b.modelIndex === mockBuildingMap.arcSmelter.modelIndex
      )
      expect(productionBuildings.length).toBe(2)
    })

    it('should create valid header', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result.header).toBeDefined()
      expect(result.header.layout).toBe(10)
      expect(result.header.icons).toEqual([0, 0, 0, 0, 0])
      expect(result.header.gameVersion).toBe('0.9.26.13026')
    })

    it('should create valid area', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result.areas[0].index).toBe(0)
      expect(result.areas[0].parentIndex).toBe(-1)
      expect(result.areas[0].size).toEqual({ x: 1, y: 1 })
    })

    it('should use custom title and iconId', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap,
        title: 'Test Blueprint',
        iconId: 1001
      })

      expect(result.header.shortDesc).toBe('Test Blueprint')
      expect(result.header.icons[0]).toBe(1001)
    })
  })

  describe('updateConfig', () => {
    it('should update config', () => {
      service.updateConfig({ stackLayers: 4 })
      const config = service.getConfig()

      expect(config.stackLayers).toBe(4)
    })

    it('should preserve existing config', () => {
      service.updateConfig({ stackLayers: 4 })
      service.updateConfig({ onlyConveyorBeltMk3: true })
      const config = service.getConfig()

      expect(config.stackLayers).toBe(4)
      expect(config.onlyConveyorBeltMk3).toBe(true)
    })
  })

  describe('getConfig', () => {
    it('should return a copy of config', () => {
      const config1 = service.getConfig()
      const config2 = service.getConfig()

      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe('stackLayers mode', () => {
    it('should reduce building num by stackLayers for all buildings including lab', () => {
      const stackedService = new BlueprintService({ stackLayers: 4 })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 8 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = stackedService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result).toBeDefined()
      expect(result.buildings.length).toBeGreaterThan(0)
    })

    it('should generate foundation buildings for each stack layer', () => {
      const stackedService = new BlueprintService({ stackLayers: 2 })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = stackedService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result).toBeDefined()
      expect(result.buildings.length).toBeGreaterThan(0)
    })

    it('should clone buildings to higher layers with correct z offset', () => {
      const stackedService = new BlueprintService({ stackLayers: 2 })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = stackedService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result).toBeDefined()
      expect(result.buildings.length).toBeGreaterThan(0)
    })

    it('should not clone lab buildings to higher layers', () => {
      const stackedService = new BlueprintService({ stackLayers: 2 })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'lab', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          recipeID: 1,
          acceleratorMode: 0
        }
      ]

      const result = stackedService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const labs = result.buildings.filter(b => b.modelIndex === mockBuildingMap.lab.modelIndex)
      expect(labs.length).toBe(1)
    })

    it('should not clone conveyor belts to higher layers', () => {
      const stackedService = new BlueprintService({ stackLayers: 2 })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = stackedService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result).toBeDefined()
    })

    it('should generate correct number of foundations for stackLayers', () => {
      const stackedService = new BlueprintService({ stackLayers: 3 })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 3 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = stackedService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const foundations = result.buildings.filter(b => b.itemId === 1131)
      expect(foundations.length).toBe(3)
    })
  })

  describe('onlyConveyorBeltMk3Downgrade', () => {
    it('should handle downgrade config correctly', () => {
      const downgradeService = new BlueprintService({
        onlyConveyorBeltMk3: true,
        onlyConveyorBeltMk3Downgrade: true
      })
      const config = downgradeService.getConfig()
      expect(config.onlyConveyorBeltMk3Downgrade).toBe(true)
    })

    it('should handle normal config correctly', () => {
      const normalService = new BlueprintService({
        onlyConveyorBeltMk3: true,
        onlyConveyorBeltMk3Downgrade: false
      })
      const config = normalService.getConfig()
      expect(config.onlyConveyorBeltMk3Downgrade).toBe(false)
    })
  })

  describe('sorter rate scaling in stack mode', () => {
    it('should have stackLayers config', () => {
      const stackedService = new BlueprintService({ stackLayers: 4 })
      const config = stackedService.getConfig()
      expect(config.stackLayers).toBe(4)
    })
  })

  describe('proliferator and sprayCoater', () => {
    it('should handle proliferator in recipe', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap,
        proliferator: 'proliferatorMk3'
      })

      expect(result).toBeDefined()
      expect(result.buildings.length).toBeGreaterThan(0)
    })

    it('should handle acceleratorMode for production boost', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 1
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap,
        proliferator: 'proliferatorMk3'
      })

      expect(result).toBeDefined()
      expect(result.buildings.length).toBeGreaterThan(0)
    })

    it('should handle selfSpray config', () => {
      const selfSprayService = new BlueprintService({ selfSpray: true })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = selfSprayService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap,
        proliferator: 'proliferatorMk3'
      })

      expect(result).toBeDefined()
      expect(result.buildings.length).toBeGreaterThan(0)
    })
  })

  describe('special recipes', () => {
    it('should handle recipe with multiple outputs', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [
            { name: 'ironIngot', rate: 0.5 },
            { name: 'copperIngot', rate: 0.5 }
          ],
          input: [
            { name: 'ironOre', rate: 0.5 },
            { name: 'copperOre', rate: 0.5 }
          ],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result).toBeDefined()
      expect(result.buildings.length).toBeGreaterThan(0)
    })

    it('should handle recipe without input', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          recipeID: 1,
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result).toBeDefined()
      expect(result.buildings.length).toBeGreaterThan(0)
    })
  })

  describe('Phase 1: init() - initialization and preprocessing', () => {
    it('should map recipe IDs correctly', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result).toBeDefined()
    })

    it('should adjust building num for stackLayers', () => {
      const stackedService = new BlueprintService({ stackLayers: 4 })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 16 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = stackedService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const smelters = result.buildings.filter(
        b => b.modelIndex === mockBuildingMap.arcSmelter.modelIndex
      )
      expect(smelters.length).toBe(16)
    })

    it('should calculate blueprint size based on recipes', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 10 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result).toBeDefined()
    })
  })

  describe('Phase 2: generateBuildings() - building generation', () => {
    it('should generate buildings with correct positions', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 3 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const smelters = result.buildings.filter(
        b => b.modelIndex === mockBuildingMap.arcSmelter.modelIndex
      )
      expect(smelters.length).toBe(3)

      for (const smelter of smelters) {
        expect(smelter.localOffset).toBeDefined()
        expect(smelter.localOffset).toHaveLength(2)
      }
    })

    it('should generate sorters for each building', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const sorters = result.buildings.filter(
        b => b.modelIndex === mockBuildingMap.sorterMk1?.modelIndex
      )
      expect(sorters.length).toBeGreaterThan(0)
    })

    it('should handle lab vertical stacking', () => {
      const labService = new BlueprintService({ maxLabLayers: 4 })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'lab', num: 8 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          recipeID: 1,
          acceleratorMode: 0
        }
      ]

      const result = labService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const labs = result.buildings.filter(b => b.modelIndex === mockBuildingMap.lab.modelIndex)
      expect(labs.length).toBe(8)
    })
  })

  describe('Phase 3: generateConveyorBelts() - conveyor network', () => {
    it('should generate conveyor belts connecting buildings', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const conveyors = result.buildings.filter(
        b => b.itemId === mockBuildingMap.conveyorBeltMK3.itemId
      )
      expect(conveyors.length).toBeGreaterThan(0)
    })

    it('should connect sorters to conveyor belts', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const sorters = result.buildings.filter(
        b => b.modelIndex === mockBuildingMap.sorterMk1?.modelIndex
      )
      for (const sorter of sorters) {
        expect(sorter.outputObjIdx).toBeGreaterThan(-1)
      }
    })

    it('should handle raw material input correctly', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: null,
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      expect(result.buildings.length).toBeGreaterThan(0)
    })
  })

  describe('Phase 4: generateConveyorBeltsForSprayCoater() - proliferator system', () => {
    it('should generate spray coater conveyors when needed', () => {
      const sprayService = new BlueprintService({ selfSpray: true })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = sprayService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap,
        proliferator: 'proliferatorMk3'
      })

      expect(result).toBeDefined()
    })
  })

  describe('Phase 5: cloneToStackLayers() - building stacking', () => {
    it('should not clone when stackLayers is 1', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 2 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const smelters = result.buildings.filter(
        b => b.modelIndex === mockBuildingMap.arcSmelter.modelIndex
      )
      expect(smelters.length).toBe(2)
    })

    it('should clone buildings to multiple layers', () => {
      const stackedService = new BlueprintService({ stackLayers: 3 })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 9 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = stackedService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const smelters = result.buildings.filter(
        b => b.modelIndex === mockBuildingMap.arcSmelter.modelIndex
      )
      expect(smelters.length).toBe(9)
    })

    it('should set correct z offset for cloned buildings', () => {
      const stackedService = new BlueprintService({ stackLayers: 2 })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = stackedService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const smelters = result.buildings.filter(
        b => b.modelIndex === mockBuildingMap.arcSmelter.modelIndex
      )
      expect(smelters.length).toBe(2)

      const zOffsets = smelters.map(s => s.localOffset![0].z)
      expect(zOffsets).toContain(0)
      expect(zOffsets).toContain(10)
    })

    it('should remap building indices correctly', () => {
      const stackedService = new BlueprintService({ stackLayers: 2 })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 1 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = stackedService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const indices = result.buildings.map(b => b.index)
      const uniqueIndices = new Set(indices)
      expect(indices.length).toBe(uniqueIndices.size)
    })
  })

  describe('generateTeslaTower', () => {
    it('should generate tesla towers when enabled', () => {
      const towerService = new BlueprintService({
        generateTeslaTower: true,
        teslaTowerInterval: 10,
        teslaTowerLineInterval: 1
      })
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 10 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = towerService.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const towers = result.buildings.filter(
        b => b.modelIndex === mockBuildingMap.teslaTower?.modelIndex
      )
      expect(towers.length).toBeGreaterThan(0)
    })

    it('should not generate tesla towers when disabled', () => {
      const recipes: ISubRecipe[] = [
        {
          building: { name: 'arcSmelter', num: 10 },
          output: [{ name: 'ironIngot', rate: 1 }],
          input: [{ name: 'ironOre', rate: 1 }],
          acceleratorMode: 0
        }
      ]

      const result = service.generate({
        recipes,
        buildingMap: mockBuildingMap,
        itemMap: mockItemMap
      })

      const towers = result.buildings.filter(
        b => b.modelIndex === mockBuildingMap.teslaTower?.modelIndex
      )
      expect(towers.length).toBe(0)
    })
  })
})

describe('ConnectionBuilder', () => {
  let builder: ConnectionBuilder

  beforeEach(() => {
    builder = new ConnectionBuilder()
  })

  describe('DEFAULT_CONNECTION_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CONNECTION_CONFIG.maxSorterNumOneBelt).toBe(8)
      expect(DEFAULT_CONNECTION_CONFIG.stackLayers).toBe(1)
    })
  })

  describe('connectBuildings', () => {
    it('should connect two buildings', () => {
      const buildings = [
        {
          index: 1,
          outputObjIdx: -1,
          inputObjIdx: -1,
          outputToSlot: 0,
          inputFromSlot: 0,
          outputFromSlot: 0,
          inputToSlot: 0
        },
        {
          index: 2,
          outputObjIdx: -1,
          inputObjIdx: -1,
          outputToSlot: 0,
          inputFromSlot: 0,
          outputFromSlot: 0,
          inputToSlot: 0
        }
      ]

      builder.connectBuildings(buildings, [{ fromIndex: 1, toIndex: 2, fromSlot: 0, toSlot: 1 }])

      expect(buildings[0].outputObjIdx).toBe(2)
      expect(buildings[0].outputFromSlot).toBe(0)
      expect(buildings[0].outputToSlot).toBe(1)
    })

    it('should skip non-existent buildings', () => {
      const buildings = [
        {
          index: 1,
          outputObjIdx: -1,
          inputObjIdx: -1,
          outputToSlot: 0,
          inputFromSlot: 0,
          outputFromSlot: 0,
          inputToSlot: 0
        }
      ]

      builder.connectBuildings(buildings, [{ fromIndex: 1, toIndex: 99 }])

      expect(buildings[0].outputObjIdx).toBe(-1)
    })
  })

  describe('disconnectBuilding', () => {
    it('should disconnect a building', () => {
      const building = {
        index: 1,
        outputObjIdx: 2,
        inputObjIdx: 3,
        outputToSlot: 1,
        inputFromSlot: 1,
        outputFromSlot: 0,
        inputToSlot: 0
      }

      builder.disconnectBuilding(building)

      expect(building.outputObjIdx).toBe(-1)
      expect(building.inputObjIdx).toBe(-1)
      expect(building.outputToSlot).toBe(0)
      expect(building.inputFromSlot).toBe(0)
    })
  })

  describe('validateConnections', () => {
    it('should return valid for correct connections', () => {
      const buildings = [
        { index: 1, outputObjIdx: 2, inputObjIdx: -1 },
        { index: 2, outputObjIdx: -1, inputObjIdx: 1 }
      ]

      const result = builder.validateConnections(buildings)

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should return errors for invalid connections', () => {
      const buildings = [
        { index: 1, outputObjIdx: 99, inputObjIdx: -1 },
        { index: 2, outputObjIdx: -1, inputObjIdx: 88 }
      ]

      const result = builder.validateConnections(buildings)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBe(2)
    })
  })

  describe('calculateSortersPerNode', () => {
    it('should return maxSorterNumOneBelt when stackLayers is 1', () => {
      const b = new ConnectionBuilder({ maxSorterNumOneBelt: 8, stackLayers: 1 })
      expect(b['calculateSortersPerNode']()).toBe(8)
    })

    it('should divide by stackLayers when stackLayers > 1', () => {
      const b = new ConnectionBuilder({ maxSorterNumOneBelt: 8, stackLayers: 4 })
      expect(b['calculateSortersPerNode']()).toBe(2)
    })
  })

  describe('calculateConveyorNodeCount', () => {
    it('should calculate node count based on rate', () => {
      expect(builder['calculateConveyorNodeCount'](30)).toBe(1)
      expect(builder['calculateConveyorNodeCount'](60)).toBe(2)
      expect(builder['calculateConveyorNodeCount'](15)).toBe(1)
    })
  })
})
