import type { IBlueprintBuilding, ICoordinate } from '../../../types/blueprint'
import type {
  IBuildingLayout,
  ISubRecipe,
  ISingleBuildingGenerateResult,
  ISorterEntry
} from '../../types/buildingGenerator'
import {
  BaseBuildingGenerator,
  type IBuildingGenerateParams,
  type IBuildingContext,
  type IBuildingGeneratorConfig,
  type IGenerateBuildingParams,
  type ISorterInfo
} from './BaseBuildingGenerator'
import { SorterGenerator, PRODUCTION_CATEGORY } from '../SorterGenerator'

export class AssemblerGenerator extends BaseBuildingGenerator {
  private sorterGenerator: SorterGenerator

  constructor(config: Partial<IBuildingGeneratorConfig> = {}) {
    super(config)
    this.sorterGenerator = new SorterGenerator()
  }

  getCategory(): number {
    return PRODUCTION_CATEGORY.assembling
  }

  calculateBuildingArea(compactLayout: boolean): IBuildingLayout {
    return {
      area: 16,
      x: 4,
      y: 4,
      centerPoint: [2, 2, 1, 1],
      yaw: [0, 0]
    }
  }

  generate(params: IBuildingGenerateParams): IBlueprintBuilding[] {
    const { subRecipe, context, position, buildingMap, itemMap, proliferator } = params
    const buildings: IBlueprintBuilding[] = []
    const buildingName = subRecipe.building!.name
    const buildingData = buildingMap[buildingName]

    context.buildingIndex++
    const building = this.getBuildingTemplate(context.buildingIndex)

    building.localOffset = [
      { x: position.x, y: position.y, z: position.z || 0 },
      { x: position.x, y: position.y, z: position.z || 0 }
    ]
    building.yaw = [0, 0]
    building.itemId = buildingData.itemId
    building.modelIndex = buildingData.modelIndex
    building.recipeId = parseInt(String(subRecipe.recipeID))
    building.parameters = {
      acceleratorMode: subRecipe.acceleratorMode === 1 ? 1 : 0
    }

    buildings.push(building)
    context.buildings.push(building)
    context.lastProductionBuildingType = buildingData.category

    const extraRate = this.calculateExtraRate(subRecipe, proliferator, itemMap)
    const productionSpeed = buildingData.productionSpeed || 1

    let slotIndex = buildingData.slotMaxIndex || 8
    for (const outputItem of subRecipe.output) {
      const actualRate = outputItem.rate * productionSpeed * extraRate
      this.generateOutputSorter({
        buildingIndex: building.index,
        buildingPosition: position,
        slotIndex,
        itemName: outputItem.name,
        rate: actualRate,
        recipeId: building.recipeId,
        buildingName,
        context,
        buildingMap,
        itemMap
      })
      slotIndex--
    }

    if (subRecipe.input) {
      for (const inputItem of subRecipe.input) {
        const actualRate =
          inputItem.rate * productionSpeed * (subRecipe.acceleratorMode === 1 ? extraRate : 1)
        this.generateInputSorter({
          buildingIndex: building.index,
          buildingPosition: position,
          slotIndex,
          itemName: inputItem.name,
          rate: actualRate,
          recipeId: building.recipeId,
          buildingName,
          context,
          buildingMap,
          itemMap
        })
        slotIndex--
      }
    }

    return buildings
  }

  generateSingleBuilding(params: IGenerateBuildingParams): ISingleBuildingGenerateResult {
    const {
      subRecipe,
      position,
      buildingMap,
      itemMap,
      proliferator,
      buildingIndex,
      actualBuildingNum
    } = params

    const buildings: IBlueprintBuilding[] = []
    const sorterEntries: ISorterEntry[] = []

    const buildingName = subRecipe.building!.name
    const buildingData = buildingMap[buildingName]

    let currentBuildingIndex = buildingIndex
    currentBuildingIndex++
    const building = this.getBuildingTemplate(currentBuildingIndex)

    building.localOffset = [
      { x: position.x, y: position.y, z: position.z || 0 },
      { x: position.x, y: position.y, z: position.z || 0 }
    ]
    building.yaw = [0, 0]
    building.itemId = buildingData.itemId
    building.modelIndex = buildingData.modelIndex
    building.recipeId = parseInt(String(subRecipe.recipeID))
    building.parameters = {
      acceleratorMode: subRecipe.acceleratorMode === 1 ? 1 : 0
    }

    buildings.push(building)

    const extraRate = this.calculateExtraRate(subRecipe, proliferator, itemMap)
    const productionSpeed = buildingData.productionSpeed || 1

    let slotIndex = buildingData.slotMaxIndex || 8
    for (const outputItem of subRecipe.output) {
      const rate = outputItem.rate * productionSpeed * actualBuildingNum * extraRate
      const sorter = this.selectSorter(rate, buildingMap)

      currentBuildingIndex++
      const sorterBuilding = this.getBuildingTemplate(currentBuildingIndex)
      sorterBuilding.itemId = sorter.itemId
      sorterBuilding.modelIndex = sorter.modelIndex
      sorterBuilding.inputObjIdx = building.index
      sorterBuilding.outputToSlot = -1
      sorterBuilding.inputToSlot = 1
      sorterBuilding.inputFromSlot = slotIndex
      sorterBuilding.filterId = itemMap[outputItem.name]?.iconId || 0
      sorterBuilding.parameters = { length: 1 }

      const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
        position,
        PRODUCTION_CATEGORY.assembling,
        slotIndex,
        0
      )
      sorterBuilding.localOffset = offsetInfo.offset
      sorterBuilding.yaw = offsetInfo.yaw

      buildings.push(sorterBuilding)
      sorterEntries.push({
        index: sorterBuilding.index,
        rate,
        itemName: outputItem.name,
        type: 'output',
        ownerObjIdx: building.index,
        ownerName: buildingName,
        ownerOffset: { ...position },
        recipeID: building.recipeId
      })
      slotIndex--
    }

    if (subRecipe.input) {
      for (const inputItem of subRecipe.input) {
        const rate =
          inputItem.rate *
          productionSpeed *
          actualBuildingNum *
          (subRecipe.acceleratorMode === 1 ? extraRate : 1)
        const sorter = this.selectSorter(rate, buildingMap)

        currentBuildingIndex++
        const sorterBuilding = this.getBuildingTemplate(currentBuildingIndex)
        sorterBuilding.itemId = sorter.itemId
        sorterBuilding.modelIndex = sorter.modelIndex
        sorterBuilding.outputObjIdx = building.index
        sorterBuilding.outputToSlot = slotIndex
        sorterBuilding.inputToSlot = 1
        sorterBuilding.filterId = itemMap[inputItem.name]?.iconId || 0
        sorterBuilding.parameters = { length: 1 }

        const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
          position,
          PRODUCTION_CATEGORY.assembling,
          slotIndex,
          1
        )
        sorterBuilding.localOffset = offsetInfo.offset
        sorterBuilding.yaw = offsetInfo.yaw

        buildings.push(sorterBuilding)
        sorterEntries.push({
          index: sorterBuilding.index,
          rate,
          itemName: inputItem.name,
          type: 'input',
          ownerObjIdx: building.index,
          ownerName: buildingName,
          ownerOffset: { ...position },
          recipeID: building.recipeId
        })
        slotIndex--
      }
    }

    return {
      buildings,
      sorterEntries,
      stackedBuildingIndices: [],
      processedBuildingCount: 1,
      nextBuildingIndex: currentBuildingIndex
    }
  }

  private generateOutputSorter(params: {
    buildingIndex: number
    buildingPosition: ICoordinate
    slotIndex: number
    itemName: string
    rate: number
    recipeId: number
    buildingName: string
    context: IBuildingContext
    buildingMap: any
    itemMap: any
  }): void {
    const {
      buildingIndex,
      buildingPosition,
      slotIndex,
      itemName,
      rate,
      recipeId,
      buildingName,
      context,
      buildingMap,
      itemMap
    } = params

    const sorter = this.selectSorter(rate, buildingMap)
    context.buildingIndex++

    const sorterBuilding = this.getBuildingTemplate(context.buildingIndex)
    sorterBuilding.itemId = sorter.itemId
    sorterBuilding.modelIndex = sorter.modelIndex
    sorterBuilding.inputObjIdx = buildingIndex
    sorterBuilding.outputToSlot = -1
    sorterBuilding.inputToSlot = 1
    sorterBuilding.inputFromSlot = slotIndex
    sorterBuilding.filterId = itemMap[itemName]?.iconId || 0
    sorterBuilding.parameters = { length: 1 }

    const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
      buildingPosition,
      PRODUCTION_CATEGORY.assembling,
      slotIndex,
      0
    )
    sorterBuilding.localOffset = offsetInfo.offset
    sorterBuilding.yaw = offsetInfo.yaw

    context.buildings.push(sorterBuilding)

    const sorterInfo: ISorterInfo = {
      index: sorterBuilding.index,
      rate,
      ownerObjIdx: buildingIndex,
      ownerName: buildingName,
      ownerOffset: { ...buildingPosition },
      recipeID: recipeId
    }
    this.addSorterEntry(context.sorters, itemName, 'output', sorterInfo)
  }

  private generateInputSorter(params: {
    buildingIndex: number
    buildingPosition: ICoordinate
    slotIndex: number
    itemName: string
    rate: number
    recipeId: number
    buildingName: string
    context: IBuildingContext
    buildingMap: any
    itemMap: any
  }): void {
    const {
      buildingIndex,
      buildingPosition,
      slotIndex,
      itemName,
      rate,
      recipeId,
      buildingName,
      context,
      buildingMap,
      itemMap
    } = params

    const sorter = this.selectSorter(rate, buildingMap)
    context.buildingIndex++

    const sorterBuilding = this.getBuildingTemplate(context.buildingIndex)
    sorterBuilding.itemId = sorter.itemId
    sorterBuilding.modelIndex = sorter.modelIndex
    sorterBuilding.outputObjIdx = buildingIndex
    sorterBuilding.outputToSlot = slotIndex
    sorterBuilding.inputToSlot = 1
    sorterBuilding.filterId = itemMap[itemName]?.iconId || 0
    sorterBuilding.parameters = { length: 1 }

    const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
      buildingPosition,
      PRODUCTION_CATEGORY.assembling,
      slotIndex,
      1
    )
    sorterBuilding.localOffset = offsetInfo.offset
    sorterBuilding.yaw = offsetInfo.yaw

    context.buildings.push(sorterBuilding)

    const sorterInfo: ISorterInfo = {
      index: sorterBuilding.index,
      rate,
      ownerObjIdx: buildingIndex,
      ownerName: buildingName,
      ownerOffset: { ...buildingPosition },
      recipeID: recipeId
    }
    this.addSorterEntry(context.sorters, itemName, 'input', sorterInfo)
  }
}
