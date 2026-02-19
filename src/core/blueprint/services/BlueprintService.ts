/**
 * BlueprintService - 蓝图生成服务
 *
 * 功能：
 * - 协调建筑生成器、传送带生成器、分拣器生成器
 * - 计算建筑布局和物品摘要
 * - 生成完整的蓝图数据结构
 * - 支持堆叠层和特斯拉塔生成
 *
 * 主要方法：
 * - generate(options): 生成蓝图数据
 * - generateBuildings(recipes, buildingMap, itemMap): 生成建筑
 * - generateConveyors(): 生成传送带和分拣器
 * - generateTeslaTowers(): 生成特斯拉塔
 * - getBlueprintData(): 获取蓝图数据
 *
 * 上游调用：
 * - core/adapters/BlueprintAdapter.ts: 蓝图适配器
 *
 * 下游依赖：
 * - generators/LayoutCalculator.ts: 布局计算器
 * - generators/ItemSummaryCalculator.ts: 物品摘要计算器
 * - generators/ConveyorGenerator.ts: 传送带生成器
 * - generators/building/BuildingGeneratorFactory.ts: 建筑生成器工厂
 * - types/blueprint.ts: 蓝图类型定义
 *
 * 生成流程：
 * 1. 初始化各生成器
 * 2. 计算建筑布局
 * 3. 生成生产建筑
 * 4. 计算物品摘要
 * 5. 生成传送带和分拣器
 * 6. 生成特斯拉塔（可选）
 * 7. 组装蓝图数据
 */
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
  BuildingArray,
  ISorterEntry
} from '../types/buildingGenerator'
import type { IItemSummary } from '../types/conveyorGenerator'
import { DEFAULT_BUILDING_GENERATOR_CONFIG as defaultBuildingConfig } from '../types/buildingGenerator'
import { LayoutCalculator } from '../generators/LayoutCalculator'
import { PRODUCTION_CATEGORY, type ProductionCategory } from '../generators/SorterGenerator'
import { ItemSummaryCalculator } from '../generators/ItemSummaryCalculator'
import { ConveyorGenerator } from '../generators/ConveyorGenerator'
import { BuildingGeneratorFactory } from '../generators/building/BuildingGeneratorFactory'
import { logger } from '../../../utils/logger'
import recipeMapData from '../../data/recipeMap.json'

const LAB_CATEGORY = PRODUCTION_CATEGORY.lab

export interface IBlueprintServiceConfig extends IBuildingGeneratorConfig {
  xYRatio: number
  extraRate: number
}

export interface IBlueprintGenerateOptions {
  recipes: ISubRecipe[]
  buildingMap: Record<string, IBuildingData>
  itemMap: Record<string, { iconId: number; name: string }>
  proliferator?: string
  title?: string
  iconId?: number
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
  compactLayout: false,
  maxLabLayers: 4,
  stackLayers: 1,
  upgradeConveyorBelt: true,
  onlyConveyorBeltMk3Downgrade: false,
  xYRatio: 2,
  extraRate: 1.25
}

export class BlueprintService {
  private config: IBlueprintServiceConfig
  private layoutCalculator: LayoutCalculator
  private itemSummaryCalculator: ItemSummaryCalculator
  private conveyorGenerator: ConveyorGenerator
  private buildingGeneratorFactory: BuildingGeneratorFactory
  private buildings: IBlueprintBuilding[] = []
  private sorters: ISorterMap = {}
  private buildingIndex: number = -1
  private occupiedArea: IOccupiedArea[] = []
  private blueprintSize: { x: number; y: number } = { x: 0, y: 0 }
  private sprayCoaterOffsetList: ICoordinate[] = []
  private lastProductionBuildingType: number = 0
  private buildingArray: BuildingArray = []

  constructor(config: Partial<IBlueprintServiceConfig> = {}) {
    this.config = { ...DEFAULT_BLUEPRINT_SERVICE_CONFIG, ...config }

    this.layoutCalculator = new LayoutCalculator()
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
    this.buildingGeneratorFactory = new BuildingGeneratorFactory({
      compactLayout: this.config.compactLayout,
      onlySorterMk3: this.config.onlySorterMk3,
      useSorterMk4: this.config.useSorterMk4,
      maxLabLayers: this.config.maxLabLayers
    })
  }

  generate(options: IBlueprintGenerateOptions): IBlueprintData {
    const { recipes, buildingMap, itemMap, proliferator } = options

    this.reset()

    this.itemSummaryCalculator.updateConfig({
      stackLayers: this.config.stackLayers,
      maxLabLayers: this.config.maxLabLayers,
      extraRate: this.config.extraRate,
      proliferator,
      itemMap: itemMap as any
    })

    this.mapRecipeIDs(recipes)

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

    this.buildings.push(...conveyorBuildings, ...sprayCoaterBuildings)

    if (this.config.stackLayers > 1) {
      this.cloneToStackLayers(buildingMap)
    }

    return this.createBlueprintData(this.buildings, options.title, options.iconId)
  }

  private mapRecipeIDs(recipes: ISubRecipe[]): void {
    const recipeMap = recipeMapData as Record<string, number>
    const specialRecipeIds = [58, 121]

    for (const subRecipe of recipes) {
      if (!subRecipe.input) {
        continue
      }

      const inputNames = subRecipe.input.map(item => item.name).join('+')
      const outputNames = subRecipe.output.map(item => item.name).join('+')
      const recipeStr = `${inputNames}=${outputNames}`

      const recipeId = recipeMap[recipeStr]
      if (!recipeId || recipeId === -1) {
        logger.warn(
          `[BlueprintService] 不支持的配方: ${recipeStr.replace('=', '->')}，请排除对应物品`
        )
        subRecipe.recipeID = -1
        continue
      }

      subRecipe.recipeID = recipeId

      if (specialRecipeIds.includes(recipeId)) {
        logger.warn(
          `[BlueprintService] X射线裂解(制氢)与重整精炼(制精炼油)可能需手动提供初始启动的精炼油/氢`
        )
      }
    }
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

      const building = buildingMap?.[recipe.building.name]
      const isLab = building?.category === LAB_CATEGORY

      return {
        ...recipe,
        building: {
          ...recipe.building,
          num: isLab
            ? recipe.building.num
            : Math.ceil(recipe.building.num / this.config.stackLayers)
        }
      }
    })
  }

  private reset(): void {
    this.layoutCalculator.reset()
    this.conveyorGenerator.reset()
    this.buildings = []
    this.sorters = {}
    this.buildingIndex = -1
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
    // 必须初始化2个元素，因为generateBuildings中访问occupiedArea[length-2]
    // 老代码：this.occupiedArea = [{ x1: -1, y1: -1, x2: this.blueprintSize.x, y2: -1 }, { x1: -1, y1: -1, x2: this.blueprintSize.x, y2: -1 }]
    this.occupiedArea = [
      { x1: -1, y1: -1, x2: this.blueprintSize.x, y2: -1 },
      { x1: -1, y1: -1, x2: this.blueprintSize.x, y2: -1 }
    ]
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
    return this.buildingGeneratorFactory.calculateBuildingAreaForRecipe(
      category,
      this.config.compactLayout,
      subRecipe
    )
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

    if (subRecipe.recipeID === -1 || subRecipe.recipeID === undefined) {
      logger.warn(`[BlueprintService] 跳过无效配方的建筑生成: ${buildingName}`)
      return
    }

    const num = Math.ceil(subRecipe.building!.num)
    const buildingArea = this.calculateBuildingArea(building, subRecipe)
    const category = building.category ?? 0
    const productionCategory = category as ProductionCategory

    let hasTeslaTowerThisLine = false
    let teslaTowerDistance = 0

    for (let i = 0; i < num; ) {
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

      const actualBuildingNum = Math.min(1, num - i)
      const result = this.buildingGeneratorFactory.generateSingleBuilding(category, {
        subRecipe,
        position: { x: buildingX, y: buildingY, z: buildingZ },
        buildingMap,
        itemMap,
        proliferator,
        buildingIndex: this.buildingIndex,
        num,
        currentIndex: i,
        actualBuildingNum
      })

      this.buildings.push(...result.buildings)
      this.buildingIndex = result.nextBuildingIndex

      for (const entry of result.sorterEntries) {
        this.addSorterEntry(entry.itemName, entry.type, {
          index: entry.index,
          rate: entry.rate,
          ownerObjIdx: entry.ownerObjIdx,
          ownerName: entry.ownerName,
          ownerOffset: entry.ownerOffset,
          recipeID: entry.recipeID
        })
      }

      const nowBuildingIndex = result.buildings[0].index

      if (this.config.generateTeslaTower && buildingMap.teslaTower) {
        const shouldGenerateTeslaTower =
          (this.config.teslaTowerLineInterval > 1 &&
            ((this.buildingArray.length > 0 && this.buildingArray.length % 2 === 0) ||
              (needNewLine && this.buildingArray.length % 2 === 1))) ||
          (this.config.teslaTowerLineInterval === 1 && this.buildingArray.length > 0)

        if (shouldGenerateTeslaTower) {
          const teslaTowerOffset = this.calculateTeslaTowerOffset(
            { x: buildingX, y: buildingY, z: buildingZ },
            category
          )
          teslaTowerDistance += teslaTowerOffset.distance

          const teslaTowerInterval = this.config.teslaTowerInterval || 10
          if (
            (hasTeslaTowerThisLine && teslaTowerDistance >= teslaTowerInterval) ||
            (!hasTeslaTowerThisLine && teslaTowerDistance >= teslaTowerInterval / 2) ||
            (teslaTowerDistance >= teslaTowerInterval / 2 &&
              this.blueprintSize.x - buildingX < teslaTowerInterval)
          ) {
            const teslaTower = this.getBuildingTemplate()
            teslaTower.itemId = buildingMap.teslaTower.itemId
            teslaTower.modelIndex = buildingMap.teslaTower.modelIndex
            teslaTower.localOffset = [teslaTowerOffset.offset, teslaTowerOffset.offset]
            teslaTowerDistance = 0
            hasTeslaTowerThisLine = true

            if (this.buildingArray.length > 0) {
              this.buildingArray[this.buildingArray.length - 1].push({
                index: teslaTower.index,
                sorterList: []
              })
            }
            this.buildings.push(teslaTower)
          }
        }
      }

      const sorterList = result.sorterEntries.map(e => e.index)

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

      for (const labIndex of result.stackedBuildingIndices) {
        this.buildingArray[this.buildingArray.length - 1].push({ index: labIndex, sorterList: [] })
      }

      i += result.processedBuildingCount
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

  private calculateTeslaTowerOffset(
    buildingOffset: ICoordinate,
    category: number
  ): { offset: ICoordinate; distance: number } {
    switch (category) {
      case PRODUCTION_CATEGORY.smelter:
        return {
          offset: { x: buildingOffset.x - 1, y: buildingOffset.y - 2, z: 0 },
          distance: 3
        }
      case PRODUCTION_CATEGORY.assembling:
        return {
          offset: { x: buildingOffset.x + 2, y: buildingOffset.y - 2, z: 0 },
          distance: 3
        }
      case PRODUCTION_CATEGORY.plant:
        return {
          offset: { x: buildingOffset.x + 3, y: buildingOffset.y - 2, z: 0 },
          distance: 7
        }
      case PRODUCTION_CATEGORY.refinery:
        return {
          offset: { x: buildingOffset.x - 3, y: buildingOffset.y - 2, z: 0 },
          distance: 7
        }
      case PRODUCTION_CATEGORY.collider:
        return {
          offset: { x: buildingOffset.x + 1, y: buildingOffset.y - 3, z: 0 },
          distance: 10
        }
      case PRODUCTION_CATEGORY.lab:
        return {
          offset: { x: buildingOffset.x + 3, y: buildingOffset.y - 3, z: 0 },
          distance: 6
        }
      default:
        logger.warn(`[BlueprintService] 未知的建筑类型: ${category}`)
        return {
          offset: { x: buildingOffset.x, y: buildingOffset.y, z: 0 },
          distance: 0
        }
    }
  }

  private generateConveyors(
    itemSummary: IItemSummary,
    buildingMap: Record<string, IBuildingData>,
    itemMap: Record<string, { iconId: number; name: string }>
  ): IBlueprintBuilding[] {
    this.conveyorGenerator.updateConfig({
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
    this.conveyorGenerator.updateBuildingMap(buildingMap)
    this.conveyorGenerator.setBuildingIndex(this.buildingIndex)
    // 防御性编程：确保occupiedArea至少有2个元素
    if (this.occupiedArea.length < 2) {
      this.occupiedArea.push({ x1: -1, y1: -1, x2: this.blueprintSize.x, y2: -1 })
    }
    const lastOccupiedArea = this.occupiedArea[this.occupiedArea.length - 1]
    const prevOccupiedArea =
      this.occupiedArea.length >= 2
        ? this.occupiedArea[this.occupiedArea.length - 2]
        : lastOccupiedArea
    const conveyorStartOffsetX = lastOccupiedArea?.x2 || 0
    this.conveyorGenerator.setConveyorStartOffsetX(conveyorStartOffsetX)
    this.conveyorGenerator.setOccupiedAreaX((lastOccupiedArea?.x2 || 0) + 1)
    lastOccupiedArea.x2++
    if (prevOccupiedArea && this.occupiedArea.length >= 2) {
      prevOccupiedArea.y2++
    }
    this.conveyorGenerator.setOccupiedAreaY(prevOccupiedArea?.y2 || 0)
    this.conveyorGenerator.setBuildingArray(this.buildingArray)
    this.conveyorGenerator.setSprayCoaterOffsetList(this.sprayCoaterOffsetList)
    this.conveyorGenerator.setLastProductionBuildingType(this.lastProductionBuildingType)
    this.conveyorGenerator.setAllBuildings(this.buildings)

    ItemSummaryCalculator.applyStackLayersToSorters(this.sorters, this.config.stackLayers)

    const conveyorBuildings = this.conveyorGenerator.generateConveyorBelts(
      itemSummary,
      this.sorters,
      itemMap
    )

    this.buildingIndex = this.conveyorGenerator.getBuildingIndex()
    this.sprayCoaterOffsetList = this.conveyorGenerator.getSprayCoaterOffsetList()
    const updatedOccupiedAreaX = this.conveyorGenerator.getOccupiedAreaX()
    const updatedOccupiedAreaY = this.conveyorGenerator.getOccupiedAreaY()
    if (lastOccupiedArea && updatedOccupiedAreaX > 0) {
      lastOccupiedArea.x2 = updatedOccupiedAreaX
    }
    if (prevOccupiedArea && updatedOccupiedAreaY > prevOccupiedArea.y2) {
      prevOccupiedArea.y2 = updatedOccupiedAreaY
    }

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
    const beltItemIds = new Set<number>()
    if (buildingMap.conveyorBeltMk1) beltItemIds.add(buildingMap.conveyorBeltMk1.itemId)
    if (buildingMap.conveyorBeltMk2) beltItemIds.add(buildingMap.conveyorBeltMk2.itemId)
    if (buildingMap.conveyorBeltMK3) beltItemIds.add(buildingMap.conveyorBeltMK3.itemId)
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
    this.buildingIndex = foundationStartIndex + stackLayers

    for (let layer = 1; layer < stackLayers; layer++) {
      const zOffset = layer * zStep
      const indexMap = new Map<number, number>()
      let nextIndex = this.buildingIndex + 1
      for (const base of cloneableBuildings) {
        indexMap.set(base.index, nextIndex)
        nextIndex++
      }

      for (const base of cloneableBuildings) {
        const newIndex = indexMap.get(base.index)!
        const clone: IBlueprintBuilding = {
          index: newIndex,
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

      this.buildingIndex = nextIndex - 1
    }
  }

  private createBlueprintData(
    buildings: IBlueprintBuilding[],
    title?: string,
    iconId?: number
  ): IBlueprintData {
    const iconValue = iconId ?? 0
    return {
      version: 1,
      cursorOffset: { x: 0, y: 0 },
      cursorTargetArea: 0,
      dragBoxSize: { x: 1, y: 1 },
      primaryAreaIdx: 0,
      areas: [
        {
          index: 0,
          parentIndex: -1,
          tropicAnchor: 0,
          areaSegments: 200,
          anchorLocalOffset: { x: 0, y: 0 },
          size: { x: 1, y: 1 }
        }
      ],
      buildings,
      header: {
        layout: 10,
        icons: [iconValue, 0, 0, 0, 0],
        time: new Date(),
        gameVersion: '0.9.26.13026',
        shortDesc: title ?? '',
        desc: ''
      }
    }
  }

  updateConfig(config: Partial<IBlueprintServiceConfig>): void {
    this.config = { ...this.config, ...config }

    this.buildingGeneratorFactory.updateConfig({
      compactLayout: this.config.compactLayout,
      onlySorterMk3: this.config.onlySorterMk3,
      useSorterMk4: this.config.useSorterMk4,
      maxLabLayers: this.config.maxLabLayers
    })
    this.itemSummaryCalculator.updateConfig({
      stackLayers: this.config.stackLayers,
      maxLabLayers: this.config.maxLabLayers,
      extraRate: this.config.extraRate
    })
    this.conveyorGenerator.updateConfig({
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
  }

  getConfig(): IBlueprintServiceConfig {
    return { ...this.config }
  }
}
