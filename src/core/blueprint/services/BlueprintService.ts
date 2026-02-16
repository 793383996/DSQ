import type {
  IBlueprintData,
  IBlueprintBuilding,
  IBuildingData,
  ICoordinate
} from '../../types/blueprint'
import type {
  IBuildingGeneratorConfig,
  ISorterMap,
  ISorterInfo,
  ISubRecipe,
  IBuildingLayout,
  IOccupiedArea,
  DEFAULT_BUILDING_GENERATOR_CONFIG
} from '../types/buildingGenerator'
import type { IItemSummary, IConveyorGeneratorConfig } from '../types/conveyorGenerator'
import { DEFAULT_BUILDING_GENERATOR_CONFIG as defaultBuildingConfig } from '../types/buildingGenerator'
import { BuildingGenerator } from '../generators/BuildingGenerator'
import { LayoutCalculator } from '../generators/LayoutCalculator'
import {
  SorterGenerator,
  PRODUCTION_CATEGORY,
  type ProductionCategory
} from '../generators/SorterGenerator'
import { ItemSummaryCalculator } from '../generators/ItemSummaryCalculator'
import { ConveyorGenerator } from '../generators/ConveyorGenerator'
import { ConnectionBuilder } from '../generators/ConnectionBuilder'
import { BuildingGeneratorFactory } from '../generators/building/BuildingGeneratorFactory'
import { logger } from '../../../utils/logger'

export interface IBlueprintServiceConfig extends IBuildingGeneratorConfig {
  xYRatio: number
  extraRate: number
}

export interface IBlueprintGenerateOptions {
  recipes: ISubRecipe[]
  buildingMap: Record<string, IBuildingData>
  itemMap: Record<string, { iconId: number; name: string }>
  proliferator?: string
}

export const DEFAULT_BLUEPRINT_SERVICE_CONFIG: IBlueprintServiceConfig = {
  conveyorBeltStackLayer: 4,
  onlyConveyorBeltMk3: false,
  onlySorterMk3: false,
  useSorterMk4: false,
  selfSpray: false,
  generateTeslaTower: false,
  teslaTowerInterval: 10,
  teslaTowerLineInterval: 2,
  compactLayout: true,
  maxLabLayers: 4,
  stackLayers: 1,
  upgradeConveyorBelt: true,
  onlyConveyorBeltMk3Downgrade: false,
  xYRatio: 1.5,
  extraRate: 1.25
}

export class BlueprintService {
  private config: IBlueprintServiceConfig
  private buildingGenerator: BuildingGenerator
  private layoutCalculator: LayoutCalculator
  private sorterGenerator: SorterGenerator
  private itemSummaryCalculator: ItemSummaryCalculator
  private conveyorGenerator: ConveyorGenerator
  private connectionBuilder: ConnectionBuilder
  private buildingGeneratorFactory: BuildingGeneratorFactory
  private buildings: IBlueprintBuilding[] = []
  private sorters: ISorterMap = {}
  private buildingIndex: number = 0
  private occupiedArea: IOccupiedArea[] = []
  private blueprintSize: { x: number; y: number } = { x: 0, y: 0 }
  private sprayCoaterOffsetList: ICoordinate[] = []
  private lastProductionBuildingType: number = 0
  private buildingArray: Array<Array<{ index: number; sorterList: number[] }>> = []

  constructor(config: Partial<IBlueprintServiceConfig> = {}) {
    this.config = { ...DEFAULT_BLUEPRINT_SERVICE_CONFIG, ...config }

    this.buildingGenerator = new BuildingGenerator(this.config)
    this.layoutCalculator = new LayoutCalculator()
    this.sorterGenerator = new SorterGenerator()
    this.itemSummaryCalculator = new ItemSummaryCalculator({
      stackLayers: this.config.stackLayers,
      maxLabLayers: this.config.maxLabLayers,
      extraRate: this.config.extraRate
    })
    this.conveyorGenerator = new ConveyorGenerator(
      {},
      {
        onlyConveyorBeltMk3: this.config.onlyConveyorBeltMk3,
        onlyConveyorBeltMk3Downgrade: this.config.onlyConveyorBeltMk3Downgrade,
        upgradeConveyorBelt: this.config.upgradeConveyorBelt,
        conveyorBeltStackLayer: this.config.conveyorBeltStackLayer,
        maxSorterNumOneBelt: 8,
        stackLayers: this.config.stackLayers,
        useSorterMk4: this.config.useSorterMk4,
        onlySorterMk3: this.config.onlySorterMk3,
        selfSpray: this.config.selfSpray
      }
    )
    this.connectionBuilder = new ConnectionBuilder({
      maxSorterNumOneBelt: 8,
      stackLayers: this.config.stackLayers
    })
    this.buildingGeneratorFactory = new BuildingGeneratorFactory(this.config)
  }

  generate(options: IBlueprintGenerateOptions): IBlueprintData {
    const { recipes, buildingMap, itemMap, proliferator } = options

    this.reset()

    const adjustedRecipes = this.adjustRecipesForStackLayers(recipes, buildingMap)

    this.calculateBlueprintSize(adjustedRecipes, buildingMap)
    this.initOccupiedArea()

    this.generateBuildings(adjustedRecipes, buildingMap, itemMap, proliferator)

    const itemSummary = this.itemSummaryCalculator.calculate(
      adjustedRecipes,
      buildingMap,
      PRODUCTION_CATEGORY
    )

    const conveyorBuildings = this.generateConveyors(itemSummary, buildingMap, itemMap)

    const sprayCoaterBuildings = this.generateSprayCoaterConveyors(
      itemSummary,
      itemMap,
      proliferator
    )

    const allBuildings = [...this.buildings, ...conveyorBuildings, ...sprayCoaterBuildings]

    if (this.config.stackLayers > 1) {
      this.cloneToStackLayers(buildingMap)
    }

    return this.createBlueprintData(allBuildings)
  }

  private adjustRecipesForStackLayers(
    recipes: ISubRecipe[],
    buildingMap?: Record<string, IBuildingData>
  ): ISubRecipe[] {
    if (this.config.stackLayers <= 1) {
      return recipes
    }

    return recipes.map(recipe => {
      if (!recipe.building) {
        return recipe
      }

      return {
        ...recipe,
        building: {
          ...recipe.building,
          num: Math.ceil(recipe.building.num / this.config.stackLayers)
        }
      }
    })
  }

  private reset(): void {
    this.buildingGenerator.reset()
    this.layoutCalculator.reset()
    this.conveyorGenerator.reset()
    this.buildings = []
    this.sorters = {}
    this.buildingIndex = 0
    this.occupiedArea = []
    this.blueprintSize = { x: 0, y: 0 }
    this.sprayCoaterOffsetList = []
    this.lastProductionBuildingType = 0
    this.buildingArray = []
  }

  private calculateBlueprintSize(
    recipes: ISubRecipe[],
    buildingMap: Record<string, IBuildingData>
  ): void {
    let totalArea = 0

    for (const subRecipe of recipes) {
      if (!subRecipe.building) {
        continue
      }

      const building = buildingMap[subRecipe.building.name]
      if (!building?.size) {
        continue
      }

      const area = building.size.x * building.size.y
      totalArea += area * Math.ceil(subRecipe.building.num)
    }

    const y = Math.ceil(Math.sqrt(totalArea / this.config.xYRatio))
    const x = Math.ceil(this.config.xYRatio * y)

    this.blueprintSize = { x, y }
  }

  private initOccupiedArea(): void {
    this.occupiedArea = [{ x1: -1, y1: -1, x2: this.blueprintSize.x, y2: -1 }]
  }

  private getBuildingTemplate(): IBlueprintBuilding {
    this.buildingIndex++
    return {
      index: this.buildingIndex,
      areaIndex: 0,
      localOffset: null,
      yaw: [0, 0],
      itemId: 0,
      modelIndex: 0,
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
    }
  }

  private calculateBuildingArea(building: IBuildingData, subRecipe: ISubRecipe): IBuildingLayout {
    const category = building.category ?? 0
    const compactLayout = this.config.compactLayout

    switch (category) {
      case PRODUCTION_CATEGORY.smelter:
        if ((subRecipe.output?.length || 0) + (subRecipe.input?.length || 0) <= 2) {
          return { area: 12, x: 3, y: 4, centerPoint: [2, 1, 1, 1], yaw: [0, 0] }
        }
        return { area: 16, x: 4, y: 4, centerPoint: [2, 2, 1, 1], yaw: [0, 0] }
      case PRODUCTION_CATEGORY.assembling:
        return { area: 16, x: 4, y: 4, centerPoint: [2, 2, 1, 1], yaw: [0, 0] }
      case PRODUCTION_CATEGORY.plant:
        return { area: 48, x: 8, y: 6, centerPoint: [2, 4, 3, 3], yaw: [0, 0] }
      case PRODUCTION_CATEGORY.refinery:
        if (compactLayout) {
          return { area: 30, x: 7, y: 5, centerPoint: [2, 3, 2, 3], yaw: [90, 90] }
        }
        return { area: 40, x: 8, y: 5, centerPoint: [2, 3, 2, 4], yaw: [90, 90] }
      case PRODUCTION_CATEGORY.collider:
        if (compactLayout) {
          return { area: 66, x: 11, y: 6, centerPoint: [3, 5, 2, 5], yaw: [0, 0] }
        }
        return { area: 77, x: 11, y: 7, centerPoint: [3, 5, 3, 5], yaw: [0, 0] }
      case PRODUCTION_CATEGORY.lab:
        return { area: 42, x: 7, y: 6, centerPoint: [3, 3, 2, 3], yaw: [0, 0] }
      default:
        return { area: 9, x: 3, y: 3, centerPoint: [1.5, 1.5, 1.5, 1.5], yaw: [0, 0] }
    }
  }

  private generateBuildings(
    recipes: ISubRecipe[],
    buildingMap: Record<string, IBuildingData>,
    itemMap: Record<string, { iconId: number; name: string }>,
    proliferator?: string
  ): void {
    for (const subRecipe of recipes) {
      if (!subRecipe.building) {
        continue
      }

      this.generateSubRecipeBuildings(subRecipe, buildingMap, itemMap, proliferator)
    }
  }

  private generateSubRecipeBuildings(
    subRecipe: ISubRecipe,
    buildingMap: Record<string, IBuildingData>,
    itemMap: Record<string, { iconId: number; name: string }>,
    proliferator?: string
  ): void {
    const buildingName = subRecipe.building!.name
    const building = buildingMap[buildingName]

    if (!building) {
      return
    }

    const num = Math.ceil(subRecipe.building!.num)
    const buildingArea = this.calculateBuildingArea(building, subRecipe)
    const category = building.category ?? 0
    const productionCategory = category as ProductionCategory

    let extraRate = 1
    if (proliferator) {
      const prolifItem = itemMap[proliferator] as any
      if (subRecipe.acceleratorMode === 0) {
        extraRate += prolifItem?.extra_rate || 0
      } else if (subRecipe.acceleratorMode === 1) {
        extraRate += prolifItem?.accelerate || 0
      }
    }

    let hasTeslaTowerThisLine = false
    let teslaTowerDistance = 0

    for (let i = 0; i < num; i++) {
      this.buildingIndex++
      this.lastProductionBuildingType = category

      let buildingX: number, buildingY: number, buildingZ: number
      let needNewLine = false

      const lastOccupied = this.occupiedArea[this.occupiedArea.length - 1]
      const prevOccupied =
        this.occupiedArea.length >= 2
          ? this.occupiedArea[this.occupiedArea.length - 2]
          : lastOccupied

      if (this.blueprintSize.x - lastOccupied.x2 >= buildingArea.x / 2) {
        buildingX = lastOccupied.x2 + 1 + buildingArea.centerPoint[3]
        buildingY = prevOccupied.y2 + 1 + buildingArea.centerPoint[0]
        buildingZ = 0
        lastOccupied.x2 += buildingArea.x
        if (buildingY + buildingArea.centerPoint[2] > lastOccupied.y2) {
          lastOccupied.y2 = buildingY + buildingArea.centerPoint[2]
        }
      } else {
        needNewLine = true
        hasTeslaTowerThisLine = false
        teslaTowerDistance = 0
        buildingX = buildingArea.centerPoint[3]
        buildingY = buildingArea.centerPoint[0] + lastOccupied.y2 + 1
        buildingZ = 0
        this.occupiedArea.push({
          x1: 0,
          y1: buildingY - buildingArea.centerPoint[0],
          x2: buildingX + buildingArea.centerPoint[1],
          y2: buildingY + buildingArea.centerPoint[2]
        })
      }

      const acceleratorMode = subRecipe.acceleratorMode === 1 ? 1 : 0
      const newBuilding = this.getBuildingTemplate()
      newBuilding.localOffset = [
        { x: buildingX, y: buildingY, z: buildingZ },
        { x: buildingX, y: buildingY, z: buildingZ }
      ]
      newBuilding.yaw = buildingArea.yaw
      newBuilding.itemId = building.itemId
      newBuilding.modelIndex = building.modelIndex
      newBuilding.recipeId =
        typeof subRecipe.recipeID === 'string'
          ? parseInt(subRecipe.recipeID)
          : subRecipe.recipeID || 0
      newBuilding.parameters = { acceleratorMode }

      const stackLabBuildingIndexList: number[] = []
      let layers = 1

      if (category === PRODUCTION_CATEGORY.lab) {
        newBuilding.outputToSlot = 14
        newBuilding.inputFromSlot = 15
        newBuilding.outputFromSlot = 15
        newBuilding.inputToSlot = 14
        ;(newBuilding.parameters as any).researchMode = 1
        this.buildings.push(newBuilding)

        const labHeight = building.height || 3
        const maxLayers = this.config.maxLabLayers || 4
        for (i++; i < num && layers < maxLayers; i++, layers++) {
          const labBuilding = this.getBuildingTemplate()
          labBuilding.localOffset = [
            { x: buildingX, y: buildingY, z: buildingZ },
            { x: buildingX, y: buildingY, z: buildingZ }
          ]
          labBuilding.localOffset[0].z = labHeight * layers
          labBuilding.localOffset[1].z = labHeight * layers
          labBuilding.yaw = newBuilding.yaw
          labBuilding.itemId = building.itemId
          labBuilding.modelIndex = building.modelIndex
          labBuilding.recipeId = newBuilding.recipeId
          labBuilding.inputObjIdx = this.buildingIndex - 1
          labBuilding.outputToSlot = 14
          labBuilding.inputFromSlot = 15
          labBuilding.outputFromSlot = 15
          labBuilding.inputToSlot = 14
          labBuilding.parameters = { acceleratorMode, researchMode: 1 }
          this.buildings.push(labBuilding)
          stackLabBuildingIndexList.push(this.buildingIndex)
        }
        i--
      } else {
        this.buildings.push(newBuilding)
      }

      const nowBuildingIndex = newBuilding.index
      const productionSpeed = building.productionSpeed || 1
      const actualBuildingNum = Math.min(1, num - i) + stackLabBuildingIndexList.length
      const slotMaxIndex = building.slotMaxIndex || 8
      let slotIndex = slotMaxIndex
      const sorterList: number[] = []

      for (const outputItem of subRecipe.output || []) {
        let actualRate = outputItem.rate * productionSpeed * actualBuildingNum * extraRate

        const sorterItem = this.selectSorter(actualRate, buildingMap as any)
        if (category === PRODUCTION_CATEGORY.lab && actualRate > sorterItem.sortingSpeed) {
          const extraSorter = this.getBuildingTemplate()
          extraSorter.itemId = sorterItem.itemId
          extraSorter.modelIndex = sorterItem.modelIndex
          extraSorter.inputObjIdx = nowBuildingIndex
          extraSorter.outputToSlot = -1
          extraSorter.inputToSlot = 1
          extraSorter.inputFromSlot = slotIndex - 3
          extraSorter.filterId = itemMap[outputItem.name]?.iconId || 0
          extraSorter.parameters = { length: 1 }
          const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
            { x: buildingX, y: buildingY, z: buildingZ },
            productionCategory,
            slotIndex - 3,
            0
          )
          extraSorter.localOffset = offsetInfo.offset
          extraSorter.yaw = offsetInfo.yaw
          this.buildings.push(extraSorter)
          sorterList.push(this.buildingIndex)

          this.addSorterEntry(outputItem.name, 'output', {
            index: extraSorter.index,
            rate: sorterItem.sortingSpeed,
            ownerObjIdx: nowBuildingIndex,
            ownerName: buildingName,
            ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
            recipeID: newBuilding.recipeId
          })
          actualRate -= sorterItem.sortingSpeed
        }

        const newSorter = this.getBuildingTemplate()
        newSorter.itemId = sorterItem.itemId
        newSorter.modelIndex = sorterItem.modelIndex
        newSorter.inputObjIdx = nowBuildingIndex
        newSorter.outputToSlot = -1
        newSorter.inputToSlot = 1
        newSorter.inputFromSlot = slotIndex
        newSorter.filterId = itemMap[outputItem.name]?.iconId || 0
        newSorter.parameters = { length: 1 }
        const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
          { x: buildingX, y: buildingY, z: buildingZ },
          productionCategory,
          slotIndex,
          0
        )
        newSorter.localOffset = offsetInfo.offset
        newSorter.yaw = offsetInfo.yaw
        this.buildings.push(newSorter)
        sorterList.push(this.buildingIndex)

        this.addSorterEntry(outputItem.name, 'output', {
          index: newSorter.index,
          rate: actualRate,
          ownerObjIdx: nowBuildingIndex,
          ownerName: buildingName,
          ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
          recipeID: newBuilding.recipeId
        })

        slotIndex--
        if (
          !this.config.compactLayout &&
          category === PRODUCTION_CATEGORY.collider &&
          slotIndex === 5
        ) {
          slotIndex = 2
        }
      }

      for (const inputItem of subRecipe.input || []) {
        let actualRate = inputItem.rate * productionSpeed * actualBuildingNum
        if (subRecipe.acceleratorMode === 1) {
          actualRate *= extraRate
        }

        const sorterItem = this.selectSorter(actualRate, buildingMap as any)
        if (category === PRODUCTION_CATEGORY.lab && actualRate > sorterItem.sortingSpeed) {
          const extraSorter = this.getBuildingTemplate()
          extraSorter.itemId = sorterItem.itemId
          extraSorter.modelIndex = sorterItem.modelIndex
          extraSorter.outputObjIdx = nowBuildingIndex
          extraSorter.outputToSlot = slotIndex - 3
          extraSorter.inputToSlot = 1
          extraSorter.filterId = itemMap[inputItem.name]?.iconId || 0
          extraSorter.parameters = { length: 1 }
          const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
            { x: buildingX, y: buildingY, z: buildingZ },
            productionCategory,
            slotIndex - 3,
            1
          )
          extraSorter.localOffset = offsetInfo.offset
          extraSorter.yaw = offsetInfo.yaw
          this.buildings.push(extraSorter)
          sorterList.push(this.buildingIndex)

          this.addSorterEntry(inputItem.name, 'input', {
            index: extraSorter.index,
            rate: sorterItem.sortingSpeed,
            ownerObjIdx: nowBuildingIndex,
            ownerName: buildingName,
            ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
            recipeID: newBuilding.recipeId
          })
          actualRate -= sorterItem.sortingSpeed
        }

        const newSorter = this.getBuildingTemplate()
        newSorter.itemId = sorterItem.itemId
        newSorter.modelIndex = sorterItem.modelIndex
        newSorter.outputObjIdx = nowBuildingIndex
        newSorter.outputToSlot = slotIndex
        newSorter.inputToSlot = 1
        newSorter.filterId = itemMap[inputItem.name]?.iconId || 0
        newSorter.parameters = { length: 1 }
        const offsetInfo2 = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
          { x: buildingX, y: buildingY, z: buildingZ },
          productionCategory,
          slotIndex,
          1
        )
        newSorter.localOffset = offsetInfo2.offset
        newSorter.yaw = offsetInfo2.yaw
        this.buildings.push(newSorter)
        sorterList.push(this.buildingIndex)

        this.addSorterEntry(inputItem.name, 'input', {
          index: newSorter.index,
          rate: actualRate,
          ownerObjIdx: nowBuildingIndex,
          ownerName: buildingName,
          ownerOffset: { x: buildingX, y: buildingY, z: buildingZ },
          recipeID: newBuilding.recipeId
        })

        slotIndex--
        if (
          !this.config.compactLayout &&
          category === PRODUCTION_CATEGORY.collider &&
          slotIndex === 5
        ) {
          slotIndex = 2
        }
      }

      if (needNewLine) {
        this.buildingArray.push([{ index: nowBuildingIndex, sorterList }])
      } else {
        if (this.buildingArray.length === 0) {
          this.buildingArray.push([{ index: nowBuildingIndex, sorterList }])
        } else {
          this.buildingArray[this.buildingArray.length - 1].push({
            index: nowBuildingIndex,
            sorterList
          })
        }
      }

      for (const labIndex of stackLabBuildingIndexList) {
        this.buildingArray[this.buildingArray.length - 1].push({ index: labIndex, sorterList: [] })
      }
    }
  }

  private selectSorter(
    rate: number,
    buildingMap: Record<string, { itemId?: number; modelIndex?: number; sortingSpeed?: number }>
  ): { itemId: number; modelIndex: number; sortingSpeed: number } {
    const mk1 = buildingMap.sorterMk1 || {}
    const mk3 = buildingMap.sorterMk3 || {}
    const mk4 = buildingMap.sorterMk4 || {}

    if (this.config.useSorterMk4 && mk4.sortingSpeed) {
      return {
        itemId: mk4.itemId || 2014,
        modelIndex: mk4.modelIndex || 483,
        sortingSpeed: mk4.sortingSpeed || 120
      }
    }

    if (this.config.onlySorterMk3 || rate > (mk1.sortingSpeed || 1.5)) {
      return {
        itemId: mk3.itemId || 2013,
        modelIndex: mk3.modelIndex || 43,
        sortingSpeed: mk3.sortingSpeed || 6
      }
    }

    return {
      itemId: mk1.itemId || 2011,
      modelIndex: mk1.modelIndex || 41,
      sortingSpeed: mk1.sortingSpeed || 1.5
    }
  }

  private addSorterEntry(itemName: string, type: 'output' | 'input', info: ISorterInfo): void {
    if (!this.sorters[itemName]) {
      this.sorters[itemName] = {}
    }
    if (!this.sorters[itemName][type]) {
      this.sorters[itemName][type] = []
    }
    this.sorters[itemName][type]!.push(info)
  }

  private generateConveyors(
    itemSummary: IItemSummary,
    buildingMap: Record<string, IBuildingData>,
    itemMap: Record<string, { iconId: number; name: string }>
  ): IBlueprintBuilding[] {
    this.conveyorGenerator = new ConveyorGenerator(buildingMap, {
      onlyConveyorBeltMk3: this.config.onlyConveyorBeltMk3,
      onlyConveyorBeltMk3Downgrade: this.config.onlyConveyorBeltMk3Downgrade,
      upgradeConveyorBelt: this.config.upgradeConveyorBelt,
      conveyorBeltStackLayer: this.config.conveyorBeltStackLayer,
      maxSorterNumOneBelt: 8,
      stackLayers: this.config.stackLayers,
      useSorterMk4: this.config.useSorterMk4,
      onlySorterMk3: this.config.onlySorterMk3,
      selfSpray: this.config.selfSpray
    })
    this.conveyorGenerator.setBuildingIndex(this.buildingIndex)
    const lastOccupiedArea = this.occupiedArea[this.occupiedArea.length - 1]
    this.conveyorGenerator.setOccupiedAreaX(lastOccupiedArea?.x2 || 0)
    this.conveyorGenerator.setBuildingArray(this.buildingArray)
    this.conveyorGenerator.setSprayCoaterOffsetList(this.sprayCoaterOffsetList)
    this.conveyorGenerator.setLastProductionBuildingType(this.lastProductionBuildingType)

    if (this.config.stackLayers > 1) {
      for (const itemName in this.sorters) {
        const sorter = this.sorters[itemName]
        if (sorter.output) {
          for (const s of sorter.output) {
            s.rate *= this.config.stackLayers
          }
        }
        if (sorter.input) {
          for (const s of sorter.input) {
            s.rate *= this.config.stackLayers
          }
        }
      }
    }

    const conveyorBuildings = this.conveyorGenerator.generateConveyorBelts(
      itemSummary,
      this.sorters,
      itemMap
    )

    this.buildingIndex = this.conveyorGenerator.getBuildingIndex()

    return conveyorBuildings
  }

  private generateSprayCoaterConveyors(
    itemSummary: IItemSummary,
    itemMap: Record<string, { iconId: number; name: string }>,
    proliferator?: string
  ): IBlueprintBuilding[] {
    const sprayCoaterOffsetList = this.conveyorGenerator.getSprayCoaterOffsetList()
    if (sprayCoaterOffsetList.length === 0) {
      return []
    }

    this.conveyorGenerator.setBuildingIndex(this.buildingIndex)

    const sprayCoaterBuildings = this.conveyorGenerator.generateConveyorBeltsForSprayCoater(
      itemSummary,
      itemMap,
      proliferator
    )

    this.buildingIndex = this.conveyorGenerator.getBuildingIndex()

    return sprayCoaterBuildings
  }

  private cloneToStackLayers(buildingMap: Record<string, IBuildingData>): void {
    const stackLayers = this.config.stackLayers || 1
    if (stackLayers <= 1) {
      return
    }

    const zStep = 10
    const labItemIds = new Set<number>()
    if (buildingMap.lab) labItemIds.add(buildingMap.lab.itemId)
    if (buildingMap['自演化研究站']) labItemIds.add(buildingMap['自演化研究站'].itemId)
    const beltItemIds = new Set([2001, 2002, 2003])
    const sprayCoaterItemId = buildingMap.sprayCoater?.itemId ?? 2313

    const labIndices = new Set<number>()
    for (const b of this.buildings) {
      if (labItemIds.has(b.itemId)) {
        labIndices.add(b.index)
      }
    }

    const cloneableBuildings = this.buildings.filter(b => {
      if (labItemIds.has(b.itemId)) return false
      if (labIndices.has(b.inputObjIdx) || labIndices.has(b.outputObjIdx)) return false
      if (beltItemIds.has(b.itemId)) return false
      if (b.itemId === sprayCoaterItemId) return false
      return true
    })

    const foundationStartIndex = this.buildingIndex + 1
    for (let layer = 0; layer < stackLayers; layer++) {
      const foundationZ = (layer - 1) * zStep
      const foundation: IBlueprintBuilding = {
        index: foundationStartIndex + layer,
        areaIndex: 0,
        localOffset: [
          { x: 0, y: 0, z: foundationZ },
          { x: 0, y: 0, z: foundationZ }
        ],
        yaw: [0, 0],
        itemId: 1131,
        modelIndex: 37,
        outputObjIdx: -1,
        inputObjIdx: -1,
        outputToSlot: 0,
        inputFromSlot: 0,
        outputFromSlot: 0,
        inputToSlot: 1,
        outputOffset: 0,
        inputOffset: 0,
        recipeId: 0,
        filterId: 0,
        parameters: null
      }
      this.buildings.push(foundation)
    }
    this.buildingIndex = foundationStartIndex + stackLayers - 1

    for (let layer = 1; layer < stackLayers; layer++) {
      const zOffset = layer * zStep

      const indexMap = new Map<number, number>()
      let nextIndex = this.buildingIndex + 1
      for (const base of cloneableBuildings) {
        indexMap.set(base.index, nextIndex)
        nextIndex++
      }

      for (const base of cloneableBuildings) {
        this.buildingIndex++
        const clone: IBlueprintBuilding = {
          index: this.buildingIndex,
          areaIndex: base.areaIndex,
          localOffset: base.localOffset
            ? [
                {
                  x: base.localOffset[0].x,
                  y: base.localOffset[0].y,
                  z: base.localOffset[0].z + zOffset
                },
                {
                  x: base.localOffset[1].x,
                  y: base.localOffset[1].y,
                  z: base.localOffset[1].z + zOffset
                }
              ]
            : null,
          yaw: base.yaw ? base.yaw.slice() : [0, 0],
          itemId: base.itemId,
          modelIndex: base.modelIndex,
          outputObjIdx: indexMap.has(base.outputObjIdx)
            ? indexMap.get(base.outputObjIdx)!
            : base.outputObjIdx,
          inputObjIdx:
            base.inputObjIdx === -1
              ? foundationStartIndex + layer
              : indexMap.has(base.inputObjIdx)
                ? indexMap.get(base.inputObjIdx)!
                : base.inputObjIdx,
          outputToSlot: base.outputToSlot,
          inputFromSlot: base.inputFromSlot,
          outputFromSlot: base.outputFromSlot,
          inputToSlot: base.inputToSlot,
          outputOffset: base.outputOffset,
          inputOffset: base.inputOffset,
          recipeId: base.recipeId,
          filterId: base.filterId,
          parameters: base.parameters != null ? JSON.parse(JSON.stringify(base.parameters)) : null
        }

        this.buildings.push(clone)
      }
    }
  }

  private createBlueprintData(buildings: IBlueprintBuilding[]): IBlueprintData {
    return {
      version: 1,
      cursorOffset: { x: 0, y: 0 },
      cursorTargetArea: 0,
      dragBoxSize: { x: 0, y: 0 },
      primaryAreaIdx: 0,
      areas: [
        {
          index: 0,
          parentIndex: -1,
          tropicAnchor: 0,
          areaSegments: 0,
          anchorLocalOffset: { x: 0, y: 0 },
          size: { x: 100, y: 100 }
        }
      ],
      buildings,
      header: {
        layout: 1,
        icons: [0, 0, 0, 0, 0],
        time: new Date(),
        gameVersion: '0.10.28',
        shortDesc: '',
        desc: ''
      }
    }
  }

  updateConfig(config: Partial<IBlueprintServiceConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): IBlueprintServiceConfig {
    return { ...this.config }
  }
}
