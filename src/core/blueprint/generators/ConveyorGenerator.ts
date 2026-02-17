import type { IBlueprintBuilding, ICoordinate } from '../../types/blueprint'
import type {
  IConveyorGeneratorConfig,
  IItemSummary,
  IItemSummaryEntry
} from '../types/conveyorGenerator'
import {
  DEFAULT_CONVEYOR_GENERATOR_CONFIG as defaultConfig,
  CONVEYOR_BELT_MK1_SPEED as MK1_SPEED,
  CONVEYOR_BELT_MK3_SPEED as MK3_SPEED,
  CONVEYOR_BELT_MK3_DOWNGRADE_SPEED as MK3_DOWNGRADE_SPEED
} from '../types/conveyorGenerator'
import type { ISorterMap, ISorterInfo } from '../types/buildingGenerator'
import { SorterGenerator, PRODUCTION_CATEGORY, type ProductionCategory } from './SorterGenerator'

export interface IBuildingMap {
  [key: string]: {
    itemId: number
    modelIndex: number
    transportSpeed?: number
    type?: number
    sortingSpeed?: number
    category?: number
    productionSpeed?: number
    slotMaxIndex?: number
    height?: number
    size?: { x: number; y: number }
  }
}

export const BUILDING_TYPE = {
  conveyor: 5
} as const

interface IBuildingArrayEntry {
  index: number
  sorterList: number[]
}

type BuildingArray = Array<Array<IBuildingArrayEntry>>

interface IExtendedSorterInfo {
  index: number
  rate: number
  ownerObjIdx: number
  ownerName: string
  ownerOffset: ICoordinate
  recipeID?: number
}

export class ConveyorGenerator {
  private buildings: IBlueprintBuilding[] = []
  private buildingIndex: number = 0
  private occupiedAreaX: number = 0
  private occupiedAreaY: number = 0
  private conveyorStartOffsetX: number = 0
  private config: IConveyorGeneratorConfig
  private buildingMap: IBuildingMap
  private buildingArray: BuildingArray = []
  private sprayCoaterOffsetList: ICoordinate[] = []
  private lastProductionBuildingType: number = 0
  private allBuildings: IBlueprintBuilding[] | null = null
  private sorterGenerator: SorterGenerator

  constructor(buildingMap: IBuildingMap, config: Partial<IConveyorGeneratorConfig> = {}) {
    this.buildingMap = buildingMap
    this.config = { ...defaultConfig, ...config }
    this.sorterGenerator = new SorterGenerator()
  }

  updateConfig(config: Partial<IConveyorGeneratorConfig>): void {
    this.config = { ...this.config, ...config }
  }

  updateBuildingMap(buildingMap: IBuildingMap): void {
    this.buildingMap = buildingMap
  }

  setBuildingIndex(index: number): void {
    this.buildingIndex = index
  }

  setOccupiedAreaX(x: number): void {
    this.occupiedAreaX = x
  }

  setOccupiedAreaY(y: number): void {
    this.occupiedAreaY = y
  }

  setConveyorStartOffsetX(x: number): void {
    this.conveyorStartOffsetX = x
  }

  setBuildingArray(buildingArray: BuildingArray): void {
    this.buildingArray = buildingArray
  }

  setSprayCoaterOffsetList(list: ICoordinate[]): void {
    this.sprayCoaterOffsetList = list
  }

  setLastProductionBuildingType(type: number): void {
    this.lastProductionBuildingType = type
  }

  setAllBuildings(buildings: IBlueprintBuilding[]): void {
    this.allBuildings = buildings
  }

  getBuildings(): IBlueprintBuilding[] {
    return this.buildings
  }

  getBuildingIndex(): number {
    return this.buildingIndex
  }

  getOccupiedAreaX(): number {
    return this.occupiedAreaX
  }

  getSprayCoaterOffsetList(): ICoordinate[] {
    return this.sprayCoaterOffsetList
  }

  reset(): void {
    this.buildings = []
    this.buildingArray = []
    this.sprayCoaterOffsetList = []
  }

  fullReset(): void {
    this.reset()
    this.buildingIndex = 0
    this.occupiedAreaX = 0
    this.occupiedAreaY = 0
    this.conveyorStartOffsetX = 0
    this.lastProductionBuildingType = 0
  }

  selectConveyorBelt(
    rate: number,
    fromBuildingNum: number
  ): {
    itemId: number
    modelIndex: number
    transportSpeed: number
  } {
    const mk1 = this.buildingMap.conveyorBeltMk1
    const mk3 = this.buildingMap.conveyorBeltMK3

    if (!mk3) {
      throw new Error('[ConveyorGenerator] conveyorBeltMK3 not found in buildingMap')
    }

    const mk3Speed = this.config.onlyConveyorBeltMk3Downgrade
      ? MK3_DOWNGRADE_SPEED
      : mk3.transportSpeed || MK3_SPEED

    if (this.config.onlyConveyorBeltMk3) {
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3Speed
      }
    }

    if (rate >= MK1_SPEED) {
      if (rate === MK1_SPEED && this.config.upgradeConveyorBelt) {
        return {
          itemId: mk3.itemId,
          modelIndex: mk3.modelIndex,
          transportSpeed: mk3Speed
        }
      }
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3Speed
      }
    }

    if (!mk1) {
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3Speed
      }
    }

    return {
      itemId: mk1.itemId,
      modelIndex: mk1.modelIndex,
      transportSpeed: mk1.transportSpeed || MK1_SPEED
    }
  }

  calculateMaxTransportSpeed(fromBuildingNum: number): number {
    const mk3Speed = this.config.onlyConveyorBeltMk3Downgrade ? MK3_DOWNGRADE_SPEED : MK3_SPEED
    let maxSpeed = mk3Speed

    if (fromBuildingNum === 0) {
      maxSpeed = mk3Speed * this.config.conveyorBeltStackLayer
    }

    return maxSpeed
  }

  calculateSortersPerNode(): number {
    const stackLayers = this.config.stackLayers || 1
    if (stackLayers > 1) {
      return Math.max(1, Math.floor(this.config.maxSorterNumOneBelt / stackLayers))
    }
    return this.config.maxSorterNumOneBelt
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

  private calculateSorterLocalOffsetAndYaw(
    ownerOffset: ICoordinate,
    ownerCategory: number,
    slot: number,
    direction: number
  ): { offset: ICoordinate[]; yaw: number[] } {
    const result = this.sorterGenerator.calculateSorterLocalOffsetAndYaw(
      ownerOffset,
      ownerCategory as ProductionCategory,
      slot,
      direction
    )
    return result
  }

  private newConveyorNode(
    offset: ICoordinate,
    yaw: number[],
    conveyor: { itemId: number; modelIndex: number },
    outputObjIdx: number,
    outputToSlot: number,
    parameters: { iconId?: number; count?: string } | null
  ): IBlueprintBuilding {
    this.buildingIndex++
    return {
      index: this.buildingIndex,
      areaIndex: 0,
      localOffset: [offset, offset],
      yaw,
      itemId: conveyor.itemId,
      modelIndex: conveyor.modelIndex,
      outputObjIdx,
      inputObjIdx: -1,
      outputToSlot,
      inputFromSlot: 0,
      outputFromSlot: 0,
      inputToSlot: 1,
      outputOffset: 0,
      inputOffset: 0,
      recipeId: 0,
      filterId: 0,
      parameters
    }
  }

  generateConveyorBelts(
    itemSummary: IItemSummary,
    sorters: ISorterMap,
    itemMap: Record<string, { iconId: number }>
  ): IBlueprintBuilding[] {
    const result: IBlueprintBuilding[] = []
    const zero = 0.0000000001
    const stackLayers = this.config.stackLayers || 1
    const sortersPerNode =
      stackLayers > 1
        ? Math.max(1, Math.floor(this.config.maxSorterNumOneBelt / stackLayers))
        : this.config.maxSorterNumOneBelt
    const itemSummaryKeys = Object.keys(itemSummary)
    const maxIterations = Math.max(10000, itemSummaryKeys.length * 500)
    let totalIterations = 0

    for (const item in itemSummary) {
      const itemName = item
      const itemEntry = itemSummary[itemName]

      const conveyorBelt = this.selectConveyorBelt(itemEntry.rate, itemEntry.fromBuildingNum)

      const maxTransportSpeed = this.calculateMaxTransportSpeed(itemEntry.fromBuildingNum)

      for (let totalDoneRate = 0; itemEntry.rate - totalDoneRate > zero; ) {
        totalIterations++
        if (totalIterations > maxIterations) {
          console.error(
            `[ConveyorGenerator] 死循环检测: item=${itemName}, rate=${itemEntry.rate}, totalDoneRate=${totalDoneRate}`
          )
          break
        }

        let needSprayCoater = itemEntry.needProliferator
        let doneRate = 0
        let parameters: { iconId: number; count: string } | null = null
        let inputRate = Math.min(maxTransportSpeed, itemEntry.rate - totalDoneRate)
        const inputData: number[][] = []
        const outputData: number[][] = []
        let doneSorterNum = 0

        const itemSorters = sorters[itemName]
        if (
          itemEntry.fromBuildingNum !== 0 &&
          (!itemSorters?.output || itemSorters.output.length === 0)
        ) {
          break
        }
        if (
          itemEntry.fromBuildingNum === 0 &&
          itemEntry.toBuildingNum !== 0 &&
          itemSorters?.input &&
          itemSorters.input.length === 0
        ) {
          break
        }

        if (itemEntry.fromBuildingNum !== 0 && itemSorters?.output) {
          for (let j = itemSorters.output.length - 1; j >= 0; j--) {
            if (itemSorters.output[j].rate - inputRate > zero) {
              break
            }
            if ((doneSorterNum + 1) % sortersPerNode === 0 || doneSorterNum === 0) {
              inputData.push([itemSorters.output[j].index])
            } else {
              inputData[inputData.length - 1].push(itemSorters.output[j].index)
            }
            inputRate -= itemSorters.output[j].rate
            doneRate += itemSorters.output[j].rate
            itemSorters.output.pop()
            doneSorterNum++
          }
        } else if (itemEntry.fromBuildingNum === 0) {
          inputData.push([])
          const itemInfo = itemMap[itemName]
          if (itemInfo) {
            parameters = {
              iconId: itemInfo.iconId,
              count: (inputRate * 60).toFixed(0)
            }
          }
          doneRate += inputRate
        }
        totalDoneRate += doneRate
        let outputRate = doneRate
        doneSorterNum = 0

        if (itemEntry.toBuildingNum !== 0 && itemSorters?.input) {
          if (['hydrogen', 'refinedOil'].includes(itemName) && itemEntry.toBuildingNum !== 0) {
            const reorderedInput: ISorterInfo[] = []
            const refineryInputs: ISorterInfo[] = []

            for (const sorter of itemSorters.input) {
              const recipeID = sorter.recipeID ?? 0
              const isRefinery =
                (itemName === 'hydrogen' && recipeID === 58) ||
                (itemName === 'refinedOil' && recipeID === 121)

              if (isRefinery) {
                refineryInputs.push(sorter)
              } else {
                reorderedInput.push(sorter)
              }
            }
            itemSorters.input = [...reorderedInput, ...refineryInputs]
          }

          const inputList = itemSorters.input
          for (let j = inputList.length - 1; j >= 0; j--) {
            if (totalDoneRate + zero < itemEntry.rate && outputRate + zero < inputList[j].rate) {
              outputData.push([inputList[j].index])
              const newSorterRate = inputList[j].rate - outputRate

              let sorter = this.buildingMap.sorterMk1
              if (
                this.config.useSorterMk4 ||
                this.config.onlySorterMk3 ||
                newSorterRate > (sorter.sortingSpeed || 0)
              ) {
                sorter = this.config.useSorterMk4
                  ? this.buildingMap.sorterMk4
                  : this.buildingMap.sorterMk3
              }

              const newSorter = this.getBuildingTemplate()
              newSorter.itemId = sorter.itemId
              newSorter.modelIndex = sorter.modelIndex
              newSorter.outputObjIdx = inputList[j].ownerObjIdx
              newSorter.filterId = itemMap[itemName]?.iconId || 0

              const ownerName = inputList[j].ownerName
              const ownerBuilding = this.buildingMap[ownerName as string]
              const ownerCategory = ownerBuilding?.category ?? 0

              const isAssemblingSmelterLab =
                ownerCategory === PRODUCTION_CATEGORY.assembling ||
                ownerCategory === PRODUCTION_CATEGORY.smelter ||
                ownerCategory === PRODUCTION_CATEGORY.lab

              if (isAssemblingSmelterLab) {
                newSorter.outputToSlot = 3
              } else if (ownerCategory === PRODUCTION_CATEGORY.collider) {
                newSorter.outputToSlot = 2
              } else {
                newSorter.outputToSlot = 0
              }
              newSorter.inputToSlot = 1
              newSorter.parameters = { length: 1 }

              const offsetInfo = this.calculateSorterLocalOffsetAndYaw(
                inputList[j].ownerOffset,
                ownerCategory,
                newSorter.outputToSlot,
                1
              )
              newSorter.localOffset = offsetInfo.offset
              newSorter.yaw = offsetInfo.yaw
              result.push(newSorter)

              let startMove = false
              let findTargetBuilding = false
              const buildingsToSearch = this.allBuildings || result
              for (let i = 0; i < this.buildingArray.length; i++) {
                for (let k = 0; k < this.buildingArray[i].length; k++) {
                  if (this.buildingArray[i][k].index === inputList[j].ownerObjIdx) {
                    this.buildingArray[i][k].sorterList.push(newSorter.index)
                    findTargetBuilding = true
                    if (
                      ownerCategory === PRODUCTION_CATEGORY.smelter &&
                      this.buildingArray[i][k].sorterList.length === 3
                    ) {
                      startMove = true
                    } else {
                      break
                    }
                  } else if (startMove) {
                    const toMoveNum = 1 + this.buildingArray[i][k].sorterList.length
                    for (const b of buildingsToSearch) {
                      if (b.index === this.buildingArray[i][k].index) {
                        b.localOffset![0].x += 1
                        b.localOffset![1].x += 1
                      } else if (this.buildingArray[i][k].sorterList.includes(b.index)) {
                        b.localOffset![0].x += 1
                        b.localOffset![1].x += 1
                      }
                    }
                  }
                }
                if (findTargetBuilding) {
                  break
                }
              }

              inputList.unshift({
                index: newSorter.index,
                rate: newSorterRate,
                ownerObjIdx: inputList[j].ownerObjIdx,
                ownerName: inputList[j].ownerName,
                ownerOffset: inputList[j].ownerOffset,
                recipeID: inputList[j].recipeID ?? 0
              })
              inputList.pop()
              break
            }

            const needMoreOutput = totalDoneRate + zero < itemEntry.rate
            const needMoreCoverage = outputData.length < inputData.length
            if (needMoreOutput || needMoreCoverage) {
              outputData.push([inputList[j].index])
            } else {
              outputData[outputData.length - 1].push(inputList[j].index)
            }
            outputRate -= inputList[j].rate
            inputList.pop()
            doneSorterNum++
            if (outputRate <= 0) {
              if (j > 0 && totalDoneRate >= itemEntry.rate) {
                continue
              }
              break
            }
          }
        } else if (itemEntry.toBuildingNum === 0) {
          outputData.push([])
          const itemInfo = itemMap[itemName]
          if (itemInfo) {
            parameters = {
              iconId: itemInfo.iconId,
              count: (outputRate * 60).toFixed(0)
            }
          }
          needSprayCoater = false
        }

        let direction = 1
        if (itemEntry.fromBuildingNum === 0) {
          direction = -1
        }

        this.newConveyor(
          conveyorBelt,
          direction,
          inputData,
          outputData,
          parameters,
          needSprayCoater ?? false,
          result
        )
      }
    }

    this.buildings = result
    return result
  }

  generateConveyorBeltsForSprayCoater(
    itemSummary: IItemSummary,
    itemMap: Record<string, { iconId: number; rate?: number }>,
    proliferator?: string
  ): IBlueprintBuilding[] {
    if (this.sprayCoaterOffsetList.length === 0) {
      return []
    }

    const result: IBlueprintBuilding[] = []

    const conveyor = this.selectConveyorForSprayCoater(itemSummary, proliferator)

    const firstSprayOffset = this.findFirstSprayCoater(this.sprayCoaterOffsetList)

    let proliferatorParameters: { iconId?: number } | null = null
    if (proliferator && itemMap[proliferator]) {
      proliferatorParameters = { iconId: itemMap[proliferator].iconId }
    }

    if (this.config.selfSpray) {
      const selfSprayBuildings = this.buildSelfSprayStructure(
        firstSprayOffset,
        conveyor,
        proliferatorParameters
      )
      result.push(...selfSprayBuildings)
      proliferatorParameters = null
    }

    const mainBuildings = this.buildMainSprayCoaterConveyor(
      firstSprayOffset,
      conveyor,
      proliferatorParameters
    )
    result.push(...mainBuildings)

    this.buildings = result
    return result
  }

  private selectConveyorForSprayCoater(
    itemSummary: IItemSummary,
    proliferator?: string
  ): { itemId: number; modelIndex: number; transportSpeed: number } {
    const mk1 = this.buildingMap.conveyorBeltMk1
    const mk3 = this.buildingMap.conveyorBeltMK3
    const mk3Speed = this.config.onlyConveyorBeltMk3Downgrade
      ? MK3_DOWNGRADE_SPEED
      : mk3.transportSpeed || MK3_SPEED

    if (this.config.onlyConveyorBeltMk3) {
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3Speed
      }
    }

    if (
      proliferator &&
      itemSummary[proliferator]?.rate &&
      itemSummary[proliferator].rate! > MK1_SPEED
    ) {
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3Speed
      }
    }

    if (!proliferator) {
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3Speed
      }
    }

    return {
      itemId: mk1.itemId,
      modelIndex: mk1.modelIndex,
      transportSpeed: mk1.transportSpeed || MK1_SPEED
    }
  }

  private findFirstSprayCoater(sprayCoaterOffsetList: ICoordinate[]): ICoordinate {
    let firstSprayOffset = sprayCoaterOffsetList[0]
    for (const spray of sprayCoaterOffsetList) {
      if (spray.y > firstSprayOffset.y) {
        firstSprayOffset = spray
        continue
      }
      if (spray.y === firstSprayOffset.y && spray.x < firstSprayOffset.x) {
        firstSprayOffset = spray
      }
    }
    return firstSprayOffset
  }

  private buildSelfSprayStructure(
    firstSprayOffset: ICoordinate,
    conveyor: { itemId: number; modelIndex: number; transportSpeed: number },
    proliferatorParameters: { iconId?: number } | null
  ): IBlueprintBuilding[] {
    const result: IBlueprintBuilding[] = []
    const selfSprayStartOffset = { ...firstSprayOffset }

    switch (this.lastProductionBuildingType) {
      case PRODUCTION_CATEGORY.lab:
      case PRODUCTION_CATEGORY.collider:
        selfSprayStartOffset.y += 2
        break
      case PRODUCTION_CATEGORY.plant:
        selfSprayStartOffset.y += 1
        break
    }

    const sprayCoaterBuilding = this.newSprayCoater(
      { x: this.conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 4, z: 0 },
      [0, 0]
    )
    result.push(sprayCoaterBuilding)

    const nodePositions = [
      { x: this.conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 6, z: 0 },
      { x: this.conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 5, z: 0 },
      { x: this.conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 4, z: 0 },
      { x: this.conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 3, z: 0 },
      { x: this.conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 2, z: 0 },
      { x: this.conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 2, z: 0 },
      { x: this.conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 3, z: 0 },
      { x: this.conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 4, z: 0.5 },
      { x: this.conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 5, z: 1 },
      { x: this.conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 6, z: 1 },
      { x: this.conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 6, z: 1 },
      { x: this.conveyorStartOffsetX, y: selfSprayStartOffset.y + 6, z: 1 },
      { x: this.conveyorStartOffsetX, y: selfSprayStartOffset.y + 5, z: 1 },
      { x: this.conveyorStartOffsetX, y: selfSprayStartOffset.y + 4, z: 1 },
      { x: this.conveyorStartOffsetX, y: selfSprayStartOffset.y + 3, z: 1 },
      { x: this.conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 3, z: 1 },
      { x: this.conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 3, z: 1 },
      { x: this.conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 2, z: 1 },
      { x: this.conveyorStartOffsetX - 2, y: selfSprayStartOffset.y + 1, z: 1 },
      { x: this.conveyorStartOffsetX - 1, y: selfSprayStartOffset.y + 1, z: 1 }
    ]

    for (let i = 0; i < nodePositions.length; i++) {
      const node = this.newConveyorNode(
        nodePositions[i],
        [0, 0],
        conveyor,
        this.buildingIndex + 2,
        1,
        i === 0 ? proliferatorParameters : null
      )
      result.push(node)
    }

    for (let i = 0; i < selfSprayStartOffset.x - this.conveyorStartOffsetX; i++) {
      const node = this.newConveyorNode(
        { x: this.conveyorStartOffsetX + i, y: selfSprayStartOffset.y + 1, z: 1 },
        [0, 0],
        conveyor,
        this.buildingIndex + 2,
        1,
        null
      )
      result.push(node)
    }

    for (let i = 0; i < selfSprayStartOffset.y - firstSprayOffset.y; i++) {
      const node = this.newConveyorNode(
        { x: selfSprayStartOffset.x - 1, y: selfSprayStartOffset.y - i, z: 1 },
        [0, 0],
        conveyor,
        this.buildingIndex + 2,
        1,
        null
      )
      result.push(node)
    }

    return result
  }

  private buildMainSprayCoaterConveyor(
    firstSprayOffset: ICoordinate,
    conveyor: { itemId: number; modelIndex: number; transportSpeed: number },
    proliferatorParameters: { iconId?: number } | null
  ): IBlueprintBuilding[] {
    const result: IBlueprintBuilding[] = []

    const startNode = this.newConveyorNode(
      { x: firstSprayOffset.x - 1, y: firstSprayOffset.y, z: 1 },
      [0, 0],
      conveyor,
      this.buildingIndex + 2,
      1,
      proliferatorParameters
    )
    result.push(startNode)

    const secondNode = this.newConveyorNode(
      { x: firstSprayOffset.x, y: firstSprayOffset.y, z: 1 },
      [0, 0],
      conveyor,
      this.buildingIndex + 2,
      1,
      null
    )
    result.push(secondNode)

    let doneNum = 1
    let nowSpray = firstSprayOffset
    let direction = 1
    let reversedList = [...this.sprayCoaterOffsetList]

    while (doneNum < this.sprayCoaterOffsetList.length) {
      let foundInRow = false
      for (const spray of this.sprayCoaterOffsetList) {
        if (spray.y === nowSpray.y) {
          if (direction === 1 && spray.x > nowSpray.x) {
            for (let x = nowSpray.x + 1; x <= spray.x; x++) {
              const node = this.newConveyorNode(
                { x, y: nowSpray.y, z: 1 },
                [0, 0],
                conveyor,
                this.buildingIndex + 2,
                1,
                null
              )
              result.push(node)
            }
            nowSpray = spray
            doneNum++
            foundInRow = true
          } else if (direction === -1 && spray.x < nowSpray.x) {
            for (let x = nowSpray.x - 1; x >= spray.x; x--) {
              const node = this.newConveyorNode(
                { x, y: nowSpray.y, z: 1 },
                [0, 0],
                conveyor,
                this.buildingIndex + 2,
                1,
                null
              )
              result.push(node)
            }
            nowSpray = spray
            doneNum++
            foundInRow = true
          }
        }
      }

      if (doneNum === this.sprayCoaterOffsetList.length) {
        break
      }

      if (!foundInRow) {
        reversedList = reversedList.reverse()
        let findNext = false
        for (let delta = 2; !findNext; delta += 2) {
          if (delta > nowSpray.y) {
            throw new Error('generate sprayCoater error: cannot find next spray coater')
          }
          for (const spray of reversedList) {
            if (spray.y === nowSpray.y - delta) {
              let lastNodeOffset = { x: nowSpray.x, y: nowSpray.y, z: 1 }

              if (direction === 1 && spray.x > nowSpray.x) {
                for (let x = nowSpray.x + 1; x <= spray.x; x++) {
                  lastNodeOffset = { x, y: nowSpray.y, z: 1 }
                  const node = this.newConveyorNode(
                    lastNodeOffset,
                    [0, 0],
                    conveyor,
                    this.buildingIndex + 2,
                    1,
                    null
                  )
                  result.push(node)
                }
              } else if (direction === -1 && spray.x < nowSpray.x) {
                for (let x = nowSpray.x - 1; x >= spray.x; x--) {
                  lastNodeOffset = { x, y: nowSpray.y, z: 1 }
                  const node = this.newConveyorNode(
                    lastNodeOffset,
                    [0, 0],
                    conveyor,
                    this.buildingIndex + 2,
                    1,
                    null
                  )
                  result.push(node)
                }
              }

              lastNodeOffset = {
                x: lastNodeOffset.x + direction,
                y: lastNodeOffset.y,
                z: 1
              }
              const turnNode = this.newConveyorNode(
                lastNodeOffset,
                [0, 0],
                conveyor,
                this.buildingIndex + 2,
                1,
                null
              )
              result.push(turnNode)

              for (let i = 1; i <= delta; i++) {
                lastNodeOffset = { x: lastNodeOffset.x, y: nowSpray.y - i, z: 1 }
                const vertNode = this.newConveyorNode(
                  lastNodeOffset,
                  [0, 0],
                  conveyor,
                  this.buildingIndex + 2,
                  1,
                  null
                )
                result.push(vertNode)
              }

              lastNodeOffset = { x: lastNodeOffset.x, y: lastNodeOffset.y, z: 1 }
              if (direction === -1 && spray.x > lastNodeOffset.x + 1) {
                for (let x = lastNodeOffset.x + 1; x < spray.x; x++) {
                  const horNode = this.newConveyorNode(
                    { x, y: lastNodeOffset.y, z: 1 },
                    [0, 0],
                    conveyor,
                    this.buildingIndex + 2,
                    1,
                    null
                  )
                  result.push(horNode)
                }
              } else if (direction === 1 && spray.x < lastNodeOffset.x - 1) {
                for (let x = lastNodeOffset.x - 1; x > spray.x; x--) {
                  const horNode = this.newConveyorNode(
                    { x, y: lastNodeOffset.y, z: 1 },
                    [0, 0],
                    conveyor,
                    this.buildingIndex + 2,
                    1,
                    null
                  )
                  result.push(horNode)
                }
              }

              nowSpray = spray
              doneNum++
              findNext = true

              const sprayNode = this.newConveyorNode(
                { x: spray.x, y: spray.y, z: 1 },
                [0, 0],
                conveyor,
                this.buildingIndex + 2,
                1,
                null
              )
              result.push(sprayNode)
            }
          }
        }
      }
      direction *= -1
    }

    const finalNode = this.newConveyorNode(
      { x: nowSpray.x + direction, y: nowSpray.y, z: 1 },
      [0, 0],
      conveyor,
      -1,
      -1,
      null
    )
    result.push(finalNode)

    return result
  }

  private newConveyor(
    conveyor: { itemId: number; modelIndex: number },
    direction: number,
    inputData: number[][],
    outputData: number[][],
    parameters: { iconId: number; count: string } | null,
    needSprayCoater: boolean,
    result: IBlueprintBuilding[]
  ): void {
    this.occupiedAreaX += 1
    const buildingX = this.occupiedAreaX
    let buildingY = this.occupiedAreaY
    const buildingZ = 0
    let nodeNum = 0

    for (let i = 0; i < inputData.length; i++) {
      if (direction < 0) {
        break
      }
      buildingY += 1
      const outputObjIdx = this.buildingIndex + 2
      const outputToSlot = 1
      const node = this.newConveyorNode(
        { x: buildingX, y: buildingY, z: buildingZ },
        [0, 0],
        conveyor,
        outputObjIdx,
        outputToSlot,
        null
      )
      result.push(node)
      nodeNum++

      const toChangeNum = inputData[i].length
      for (const b of result) {
        if (toChangeNum <= 0) break
        if (inputData[i].includes(b.index)) {
          b.outputObjIdx = this.buildingIndex
        }
      }
    }

    if (needSprayCoater && direction > 0) {
      if (nodeNum % 2 === 0) {
        const extraNode = this.newConveyorNode(
          { x: buildingX, y: buildingY, z: buildingZ },
          [0, 0],
          conveyor,
          this.buildingIndex + 2,
          1,
          null
        )
        result.push(extraNode)
      }
      buildingY += 1
      this.sprayCoaterOffsetList.push({
        x: buildingX,
        y: buildingY - 1,
        z: buildingZ
      })
      const sprayNode = this.newConveyorNode(
        { x: buildingX, y: buildingY, z: buildingZ },
        [0, 0],
        conveyor,
        this.buildingIndex + 2,
        1,
        null
      )
      result.push(sprayNode)
    }

    for (let i = 0; i < outputData.length; i++) {
      let outputObjIdx = -1
      let outputToSlot = 0
      buildingY += 1
      if (!(direction > 0 && i === outputData.length - 1)) {
        if (!(direction < 0 && i === 0)) {
          outputObjIdx = this.buildingIndex + 1 + direction
        }
      }
      let nodeParameters: { iconId?: number; count?: string } | null = null
      if (direction > 0 && i === outputData.length - 1) {
        nodeParameters = parameters
      }
      if (outputObjIdx !== -1) {
        outputToSlot = 1
      }
      let nodeYaw: number[] = [0, 0]
      if (direction < 0) {
        nodeYaw = [180, 180]
      }
      const node = this.newConveyorNode(
        { x: buildingX, y: buildingY, z: buildingZ },
        nodeYaw,
        conveyor,
        outputObjIdx,
        outputToSlot,
        nodeParameters
      )
      result.push(node)
      nodeNum++

      const toChangeNum = outputData[i].length
      for (const b of result) {
        if (toChangeNum <= 0) break
        if (outputData[i].includes(b.index)) {
          b.inputObjIdx = this.buildingIndex
          b.inputFromSlot = -1
        }
      }
    }

    if (direction > 0 && outputData.length === 0 && nodeNum > 0) {
      const lastNode = result[result.length - 1]
      lastNode.outputObjIdx = -1
      lastNode.outputToSlot = 0
    }

    if (direction < 0) {
      if (needSprayCoater) {
        if (nodeNum % 2 === 0) {
          buildingY += 1
          const extraNode = this.newConveyorNode(
            { x: buildingX, y: buildingY, z: buildingZ },
            [0, 0],
            conveyor,
            this.buildingIndex,
            1,
            null
          )
          result.push(extraNode)
        }
        buildingY += 1
        this.sprayCoaterOffsetList.push({
          x: buildingX,
          y: buildingY + 1,
          z: buildingZ
        })
        const sprayNode = this.newConveyorNode(
          { x: buildingX, y: buildingY, z: buildingZ },
          [180, 180],
          conveyor,
          this.buildingIndex,
          1,
          null
        )
        result.push(sprayNode)
        buildingY += 1
        const sprayNode2 = this.newConveyorNode(
          { x: buildingX, y: buildingY, z: buildingZ },
          [180, 180],
          conveyor,
          this.buildingIndex,
          1,
          null
        )
        result.push(sprayNode2)
      }
      buildingY += 1
      const endNode = this.newConveyorNode(
        { x: buildingX, y: buildingY, z: buildingZ },
        [180, 180],
        conveyor,
        this.buildingIndex,
        1,
        null
      )
      result.push(endNode)
      buildingY += 1
      const paramNode = this.newConveyorNode(
        { x: buildingX, y: buildingY, z: buildingZ },
        [180, 180],
        conveyor,
        this.buildingIndex,
        1,
        parameters
      )
      result.push(paramNode)
    }

    if (needSprayCoater) {
      let sprayYaw: number[] = [0, 0]
      if (direction < 0) {
        sprayYaw = [180, 180]
      }
      const sprayCoaterOffset = this.sprayCoaterOffsetList[this.sprayCoaterOffsetList.length - 1]
      if (sprayCoaterOffset) {
        const sprayCoater = this.newSprayCoater(
          { x: sprayCoaterOffset.x, y: sprayCoaterOffset.y, z: sprayCoaterOffset.z },
          sprayYaw
        )
        result.push(sprayCoater)
      }
    }

    if (buildingX > 0) {
      this.occupiedAreaX = buildingX
    }
  }

  private newSprayCoater(offset: ICoordinate, yaw: number[]): IBlueprintBuilding {
    const sprayCoater = this.buildingMap.sprayCoater
    return {
      index: ++this.buildingIndex,
      areaIndex: 0,
      localOffset: [offset, offset],
      yaw,
      itemId: sprayCoater?.itemId || 2313,
      modelIndex: sprayCoater?.modelIndex || 120,
      outputObjIdx: -1,
      inputObjIdx: -1,
      outputToSlot: 14,
      inputFromSlot: 15,
      outputFromSlot: 15,
      inputToSlot: 14,
      outputOffset: 0,
      inputOffset: 0,
      recipeId: 0,
      filterId: 0,
      parameters: null
    }
  }
}
