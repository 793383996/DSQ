import type { IBlueprintBuilding, ICoordinate } from '../../../types/blueprint'
import type { IBuildingLayout, ISubRecipe, ISorterMap } from '../../types/buildingGenerator'
import {
  BaseBuildingGenerator,
  type IBuildingGenerateParams,
  type IBuildingContext,
  type IBuildingGeneratorConfig,
  type ISorterInfo
} from './BaseBuildingGenerator'
import { SorterGenerator, PRODUCTION_CATEGORY } from '../SorterGenerator'

export class LabGenerator extends BaseBuildingGenerator {
  private sorterGenerator: SorterGenerator

  constructor(config: Partial<IBuildingGeneratorConfig> = {}) {
    super(config)
    this.sorterGenerator = new SorterGenerator()
  }

  getCategory(): number {
    return PRODUCTION_CATEGORY.lab
  }

  calculateBuildingArea(compactLayout: boolean): IBuildingLayout {
    return {
      area: 42,
      x: 7,
      y: 6,
      centerPoint: [3, 3, 2, 3],
      yaw: [0, 0]
    }
  }

  generate(params: IBuildingGenerateParams): IBlueprintBuilding[] {
    const { subRecipe, context, position, buildingMap, itemMap, proliferator } = params
    const buildings: IBlueprintBuilding[] = []
    const buildingName = subRecipe.building!.name
    const buildingData = buildingMap[buildingName]
    const labHeight = buildingData.height || 3

    context.buildingIndex++
    const baseBuilding = this.getBuildingTemplate(context.buildingIndex)

    baseBuilding.localOffset = [
      { x: position.x, y: position.y, z: position.z || 0 },
      { x: position.x, y: position.y, z: position.z || 0 }
    ]
    baseBuilding.yaw = [0, 0]
    baseBuilding.itemId = buildingData.itemId
    baseBuilding.modelIndex = buildingData.modelIndex
    baseBuilding.recipeId = parseInt(String(subRecipe.recipeID))
    baseBuilding.outputToSlot = 14
    baseBuilding.inputFromSlot = 15
    baseBuilding.outputFromSlot = 15
    baseBuilding.inputToSlot = 14
    baseBuilding.parameters = {
      acceleratorMode: subRecipe.acceleratorMode === 1 ? 1 : 0,
      researchMode: 1
    }

    buildings.push(baseBuilding)
    context.buildings.push(baseBuilding)
    context.lastProductionBuildingType = buildingData.category

    const stackedLabIndices: number[] = []
    const maxLayers = this.config.maxLabLayers || 4
    const totalLabNum = Math.ceil(subRecipe.building!.num)
    let layers = 1

    for (let layer = 1; layer < Math.min(totalLabNum, maxLayers); layer++) {
      context.buildingIndex++
      const labBuilding = this.getBuildingTemplate(context.buildingIndex)

      labBuilding.localOffset = [
        { x: position.x, y: position.y, z: labHeight * layer },
        { x: position.x, y: position.y, z: labHeight * layer }
      ]
      labBuilding.yaw = [0, 0]
      labBuilding.itemId = buildingData.itemId
      labBuilding.modelIndex = buildingData.modelIndex
      labBuilding.recipeId = parseInt(String(subRecipe.recipeID))
      labBuilding.inputObjIdx = context.buildingIndex - 1
      labBuilding.outputToSlot = 14
      labBuilding.inputFromSlot = 15
      labBuilding.outputFromSlot = 15
      labBuilding.inputToSlot = 14
      labBuilding.parameters = {
        acceleratorMode: subRecipe.acceleratorMode === 1 ? 1 : 0,
        researchMode: 1
      }

      buildings.push(labBuilding)
      context.buildings.push(labBuilding)
      stackedLabIndices.push(context.buildingIndex)
      layers++
    }

    const extraRate = this.calculateExtraRate(subRecipe, proliferator, itemMap)
    const productionSpeed = buildingData.productionSpeed
    const actualBuildingNum = layers

    let slotIndex = buildingData.slotMaxIndex
    for (const outputItem of subRecipe.output) {
      const actualRate = outputItem.rate * productionSpeed * actualBuildingNum * extraRate
      this.generateOutputSorter({
        buildingIndex: baseBuilding.index,
        buildingPosition: position,
        slotIndex,
        itemName: outputItem.name,
        rate: actualRate,
        recipeId: baseBuilding.recipeId,
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
          inputItem.rate *
          productionSpeed *
          actualBuildingNum *
          (subRecipe.acceleratorMode === 1 ? extraRate : 1)
        this.generateInputSorter({
          buildingIndex: baseBuilding.index,
          buildingPosition: position,
          slotIndex,
          itemName: inputItem.name,
          rate: actualRate,
          recipeId: baseBuilding.recipeId,
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

    if (rate > sorter.sortingSpeed) {
      context.buildingIndex++
      const extraSorter = this.getBuildingTemplate(context.buildingIndex)
      extraSorter.itemId = sorter.itemId
      extraSorter.modelIndex = sorter.modelIndex
      extraSorter.inputObjIdx = buildingIndex
      extraSorter.outputToSlot = -1
      extraSorter.inputToSlot = 1
      extraSorter.inputFromSlot = slotIndex - 3
      extraSorter.filterId = itemMap[itemName]?.iconId || 0
      extraSorter.parameters = { length: 1 }

      const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
        buildingPosition,
        PRODUCTION_CATEGORY.lab,
        slotIndex - 3,
        0
      )
      extraSorter.localOffset = offsetInfo.offset
      extraSorter.yaw = offsetInfo.yaw

      context.buildings.push(extraSorter)

      const extraSorterInfo: ISorterInfo = {
        index: extraSorter.index,
        rate: sorter.sortingSpeed,
        ownerObjIdx: buildingIndex,
        ownerName: buildingName,
        ownerOffset: { ...buildingPosition },
        recipeID: recipeId
      }
      this.addSorterEntry(context.sorters, itemName, 'output', extraSorterInfo)

      const remainingRate = rate - sorter.sortingSpeed
      this.generateSingleOutputSorter({
        buildingIndex,
        buildingPosition,
        slotIndex,
        itemName,
        rate: remainingRate,
        recipeId,
        buildingName,
        context,
        buildingMap,
        itemMap
      })
    } else {
      this.generateSingleOutputSorter(params)
    }
  }

  private generateSingleOutputSorter(params: {
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
      PRODUCTION_CATEGORY.lab,
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

    if (rate > sorter.sortingSpeed) {
      context.buildingIndex++
      const extraSorter = this.getBuildingTemplate(context.buildingIndex)
      extraSorter.itemId = sorter.itemId
      extraSorter.modelIndex = sorter.modelIndex
      extraSorter.inputObjIdx = buildingIndex
      extraSorter.outputToSlot = slotIndex - 3
      extraSorter.inputToSlot = 1
      extraSorter.filterId = itemMap[itemName]?.iconId || 0
      extraSorter.parameters = { length: 1 }

      const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
        buildingPosition,
        PRODUCTION_CATEGORY.lab,
        slotIndex - 3,
        1
      )
      extraSorter.localOffset = offsetInfo.offset
      extraSorter.yaw = offsetInfo.yaw

      context.buildings.push(extraSorter)

      const extraSorterInfo: ISorterInfo = {
        index: extraSorter.index,
        rate: sorter.sortingSpeed,
        ownerObjIdx: buildingIndex,
        ownerName: buildingName,
        ownerOffset: { ...buildingPosition },
        recipeID: recipeId
      }
      this.addSorterEntry(context.sorters, itemName, 'input', extraSorterInfo)

      const remainingRate = rate - sorter.sortingSpeed
      this.generateSingleInputSorter({
        buildingIndex,
        buildingPosition,
        slotIndex,
        itemName,
        rate: remainingRate,
        recipeId,
        buildingName,
        context,
        buildingMap,
        itemMap
      })
    } else {
      this.generateSingleInputSorter(params)
    }
  }

  private generateSingleInputSorter(params: {
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
      PRODUCTION_CATEGORY.lab,
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
