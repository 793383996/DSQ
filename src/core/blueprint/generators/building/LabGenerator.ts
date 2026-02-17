import type { IBlueprintBuilding, ICoordinate } from '../../../types/blueprint'
import type {
  IBuildingLayout,
  ISubRecipe,
  ISorterMap,
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
import { logger } from '../../../../utils/logger'

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
    const productionSpeed = buildingData.productionSpeed || 1
    const actualBuildingNum = layers

    let slotIndex = buildingData.slotMaxIndex || 11
    const sorterList: number[] = []

    for (const outputItem of subRecipe.output) {
      const actualRate = outputItem.rate * productionSpeed * actualBuildingNum * extraRate
      const result = this.generateOutputSorter({
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
      sorterList.push(...result)
      slotIndex--
    }

    if (subRecipe.input) {
      for (const inputItem of subRecipe.input) {
        const actualRate =
          inputItem.rate *
          productionSpeed *
          actualBuildingNum *
          (subRecipe.acceleratorMode === 1 ? extraRate : 1)
        const result = this.generateInputSorter({
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
        sorterList.push(...result)
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
      num,
      currentIndex,
      actualBuildingNum
    } = params

    const buildings: IBlueprintBuilding[] = []
    const sorterEntries: ISorterEntry[] = []
    const stackedBuildingIndices: number[] = []

    const buildingName = subRecipe.building!.name
    const buildingData = buildingMap[buildingName]
    const labHeight = buildingData.height || 3
    const maxLayers = this.config.maxLabLayers || 4

    let currentBuildingIndex = buildingIndex
    currentBuildingIndex++
    const baseBuilding = this.getBuildingTemplate(currentBuildingIndex)

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

    let layers = 1
    const remainingBuildings = num - currentIndex

    for (let layer = 1; layer < Math.min(remainingBuildings, maxLayers); layer++) {
      currentBuildingIndex++
      const labBuilding = this.getBuildingTemplate(currentBuildingIndex)

      labBuilding.localOffset = [
        { x: position.x, y: position.y, z: labHeight * layer },
        { x: position.x, y: position.y, z: labHeight * layer }
      ]
      labBuilding.yaw = [0, 0]
      labBuilding.itemId = buildingData.itemId
      labBuilding.modelIndex = buildingData.modelIndex
      labBuilding.recipeId = parseInt(String(subRecipe.recipeID))
      labBuilding.inputObjIdx = currentBuildingIndex - 1
      labBuilding.outputToSlot = 14
      labBuilding.inputFromSlot = 15
      labBuilding.outputFromSlot = 15
      labBuilding.inputToSlot = 14
      labBuilding.parameters = {
        acceleratorMode: subRecipe.acceleratorMode === 1 ? 1 : 0,
        researchMode: 1
      }

      buildings.push(labBuilding)
      stackedBuildingIndices.push(currentBuildingIndex)
      layers++
    }

    const extraRate = this.calculateExtraRate(subRecipe, proliferator, itemMap)
    const productionSpeed = buildingData.productionSpeed || 1
    const finalActualBuildingNum = Math.min(1, num - currentIndex) + stackedBuildingIndices.length

    let slotIndex = buildingData.slotMaxIndex || 11

    for (const outputItem of subRecipe.output) {
      if (slotIndex < 3) {
        break
      }
      const rate = outputItem.rate * productionSpeed * finalActualBuildingNum * extraRate
      const sorter = this.selectSorter(rate, buildingMap)

      if (rate > sorter.sortingSpeed && slotIndex >= 6) {
        currentBuildingIndex++
        const extraSorter = this.getBuildingTemplate(currentBuildingIndex)
        extraSorter.itemId = sorter.itemId
        extraSorter.modelIndex = sorter.modelIndex
        extraSorter.inputObjIdx = baseBuilding.index
        extraSorter.outputToSlot = -1
        extraSorter.inputToSlot = 1
        extraSorter.inputFromSlot = slotIndex - 3
        extraSorter.filterId = itemMap[outputItem.name]?.iconId || 0
        extraSorter.parameters = { length: 1 }

        const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
          position,
          PRODUCTION_CATEGORY.lab,
          slotIndex - 3,
          0
        )
        extraSorter.localOffset = offsetInfo.offset
        extraSorter.yaw = offsetInfo.yaw

        buildings.push(extraSorter)
        sorterEntries.push({
          index: extraSorter.index,
          rate: sorter.sortingSpeed,
          itemName: outputItem.name,
          type: 'output',
          ownerObjIdx: baseBuilding.index,
          ownerName: buildingName,
          ownerOffset: { ...position },
          recipeID: baseBuilding.recipeId
        })
      }

      currentBuildingIndex++
      const newSorter = this.getBuildingTemplate(currentBuildingIndex)
      newSorter.itemId = sorter.itemId
      newSorter.modelIndex = sorter.modelIndex
      newSorter.inputObjIdx = baseBuilding.index
      newSorter.outputToSlot = -1
      newSorter.inputToSlot = 1
      newSorter.inputFromSlot = slotIndex
      newSorter.filterId = itemMap[outputItem.name]?.iconId || 0
      newSorter.parameters = { length: 1 }

      const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
        position,
        PRODUCTION_CATEGORY.lab,
        slotIndex,
        0
      )
      newSorter.localOffset = offsetInfo.offset
      newSorter.yaw = offsetInfo.yaw

      buildings.push(newSorter)
      const actualRate = rate > sorter.sortingSpeed ? rate - sorter.sortingSpeed : rate
      sorterEntries.push({
        index: newSorter.index,
        rate: actualRate,
        itemName: outputItem.name,
        type: 'output',
        ownerObjIdx: baseBuilding.index,
        ownerName: buildingName,
        ownerOffset: { ...position },
        recipeID: baseBuilding.recipeId
      })
      slotIndex--
    }

    if (subRecipe.input) {
      for (const inputItem of subRecipe.input) {
        if (slotIndex < 3) {
          break
        }
        const rate =
          inputItem.rate *
          productionSpeed *
          finalActualBuildingNum *
          (subRecipe.acceleratorMode === 1 ? extraRate : 1)
        const sorter = this.selectSorter(rate, buildingMap)

        if (rate > sorter.sortingSpeed && slotIndex >= 6) {
          currentBuildingIndex++
          const extraSorter = this.getBuildingTemplate(currentBuildingIndex)
          extraSorter.itemId = sorter.itemId
          extraSorter.modelIndex = sorter.modelIndex
          extraSorter.outputObjIdx = baseBuilding.index
          extraSorter.outputToSlot = slotIndex - 3
          extraSorter.inputToSlot = 1
          extraSorter.filterId = itemMap[inputItem.name]?.iconId || 0
          extraSorter.parameters = { length: 1 }

          const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
            position,
            PRODUCTION_CATEGORY.lab,
            slotIndex - 3,
            1
          )
          extraSorter.localOffset = offsetInfo.offset
          extraSorter.yaw = offsetInfo.yaw

          buildings.push(extraSorter)
          sorterEntries.push({
            index: extraSorter.index,
            rate: sorter.sortingSpeed,
            itemName: inputItem.name,
            type: 'input',
            ownerObjIdx: baseBuilding.index,
            ownerName: buildingName,
            ownerOffset: { ...position },
            recipeID: baseBuilding.recipeId
          })
        }

        currentBuildingIndex++
        const newSorter = this.getBuildingTemplate(currentBuildingIndex)
        newSorter.itemId = sorter.itemId
        newSorter.modelIndex = sorter.modelIndex
        newSorter.outputObjIdx = baseBuilding.index
        newSorter.outputToSlot = slotIndex
        newSorter.inputToSlot = 1
        newSorter.filterId = itemMap[inputItem.name]?.iconId || 0
        newSorter.parameters = { length: 1 }

        const offsetInfo = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
          position,
          PRODUCTION_CATEGORY.lab,
          slotIndex,
          1
        )
        newSorter.localOffset = offsetInfo.offset
        newSorter.yaw = offsetInfo.yaw

        buildings.push(newSorter)
        const actualRate = rate > sorter.sortingSpeed ? rate - sorter.sortingSpeed : rate
        sorterEntries.push({
          index: newSorter.index,
          rate: actualRate,
          itemName: inputItem.name,
          type: 'input',
          ownerObjIdx: baseBuilding.index,
          ownerName: buildingName,
          ownerOffset: { ...position },
          recipeID: baseBuilding.recipeId
        })
        slotIndex--
      }
    }

    return {
      buildings,
      sorterEntries,
      stackedBuildingIndices,
      processedBuildingCount: layers,
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
  }): number[] {
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

    const sorterList: number[] = []
    const sorter = this.selectSorter(rate, buildingMap)

    if (rate > sorter.sortingSpeed && slotIndex >= 6) {
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
      sorterList.push(context.buildingIndex)

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
      const singleResult = this.generateSingleOutputSorter({
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
      sorterList.push(...singleResult)
    } else {
      const singleResult = this.generateSingleOutputSorter(params)
      sorterList.push(...singleResult)
    }

    return sorterList
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
  }): number[] {
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

    return [context.buildingIndex]
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
  }): number[] {
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

    const sorterList: number[] = []
    const sorter = this.selectSorter(rate, buildingMap)

    if (rate > sorter.sortingSpeed && slotIndex >= 6) {
      context.buildingIndex++
      const extraSorter = this.getBuildingTemplate(context.buildingIndex)
      extraSorter.itemId = sorter.itemId
      extraSorter.modelIndex = sorter.modelIndex
      extraSorter.outputObjIdx = buildingIndex
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
      sorterList.push(context.buildingIndex)

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
      const singleResult = this.generateSingleInputSorter({
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
      sorterList.push(...singleResult)
    } else {
      const singleResult = this.generateSingleInputSorter(params)
      sorterList.push(...singleResult)
    }

    return sorterList
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
  }): number[] {
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

    return [context.buildingIndex]
  }
}
