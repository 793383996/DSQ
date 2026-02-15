import type { IBlueprintBuilding, ICoordinate } from '../../types/blueprint'
import type {
  IConveyorGeneratorConfig,
  IConveyorNode,
  IItemSummary,
  IItemSummaryEntry,
  DEFAULT_CONVEYOR_GENERATOR_CONFIG,
  CONVEYOR_BELT_MK1_SPEED,
  CONVEYOR_BELT_MK2_SPEED,
  CONVEYOR_BELT_MK3_SPEED
} from '../types/conveyorGenerator'
import {
  DEFAULT_CONVEYOR_GENERATOR_CONFIG as defaultConfig,
  CONVEYOR_BELT_MK1_SPEED as MK1_SPEED,
  CONVEYOR_BELT_MK2_SPEED as MK2_SPEED,
  CONVEYOR_BELT_MK3_SPEED as MK3_SPEED
} from '../types/conveyorGenerator'
import type { ISorterMap, ISorterInfo } from '../types/buildingGenerator'

export interface IBuildingMap {
  [key: string]: {
    itemId: number
    modelIndex: number
    transportSpeed?: number
    type?: number
  }
}

export const BUILDING_TYPE = {
  conveyor: 5
} as const

export class ConveyorGenerator {
  private buildings: IBlueprintBuilding[] = []
  private buildingIndex: number = 0
  private occupiedAreaX: number = 0
  private config: IConveyorGeneratorConfig
  private buildingMap: IBuildingMap

  constructor(buildingMap: IBuildingMap, config: Partial<IConveyorGeneratorConfig> = {}) {
    this.buildingMap = buildingMap
    this.config = { ...defaultConfig, ...config }
  }

  setBuildingIndex(index: number): void {
    this.buildingIndex = index
  }

  setOccupiedAreaX(x: number): void {
    this.occupiedAreaX = x
  }

  getBuildings(): IBlueprintBuilding[] {
    return this.buildings
  }

  getBuildingIndex(): number {
    return this.buildingIndex
  }

  reset(): void {
    this.buildings = []
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

    if (this.config.onlyConveyorBeltMk3) {
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3.transportSpeed || MK3_SPEED
      }
    }

    if (rate >= MK1_SPEED) {
      if (rate === MK1_SPEED && this.config.upgradeConveyorBelt) {
        return {
          itemId: mk3.itemId,
          modelIndex: mk3.modelIndex,
          transportSpeed: mk3.transportSpeed || MK3_SPEED
        }
      }
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3.transportSpeed || MK3_SPEED
      }
    }

    return {
      itemId: mk1.itemId,
      modelIndex: mk1.modelIndex,
      transportSpeed: mk1.transportSpeed || MK1_SPEED
    }
  }

  calculateMaxTransportSpeed(fromBuildingNum: number): number {
    let maxSpeed = MK3_SPEED

    if (fromBuildingNum === 0) {
      maxSpeed = MK3_SPEED * this.config.conveyorBeltStackLayer
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

  newConveyorNode(
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

  generateConveyorBelt(
    itemName: string,
    itemEntry: IItemSummaryEntry,
    sorters: ISorterMap,
    itemMap: Record<string, { iconId: number }>
  ): IBlueprintBuilding[] {
    const result: IBlueprintBuilding[] = []
    const zero = 0.0000000001

    const conveyorBelt = this.selectConveyorBelt(itemEntry.rate, itemEntry.fromBuildingNum)
    const maxTransportSpeed = this.calculateMaxTransportSpeed(itemEntry.fromBuildingNum)
    const sortersPerNode = this.calculateSortersPerNode()

    const buildingX = this.occupiedAreaX + 1
    let buildingY = 0
    const buildingZ = 0

    const itemSorters = sorters[itemName]
    const outputSorters = itemSorters?.output || []
    const inputSorters = itemSorters?.input || []

    for (let totalDoneRate = 0; itemEntry.rate - totalDoneRate > zero; ) {
      const currentRate = Math.min(itemEntry.rate - totalDoneRate, maxTransportSpeed)

      const parameters = this.createParameters(itemName, currentRate, itemMap)

      const node = this.newConveyorNode(
        { x: buildingX, y: buildingY, z: buildingZ },
        [0, 0],
        conveyorBelt,
        this.buildingIndex + 2,
        1,
        parameters
      )
      result.push(node)

      buildingY++
      totalDoneRate += currentRate
    }

    this.occupiedAreaX = buildingX

    return result
  }

  private createParameters(
    itemName: string,
    rate: number,
    itemMap: Record<string, { iconId: number }>
  ): { iconId?: number; count?: string } | null {
    const item = itemMap[itemName]
    if (!item) {
      return null
    }
    return {
      iconId: item.iconId,
      count: rate.toFixed(1)
    }
  }

  generateConveyorBelts(
    itemSummary: IItemSummary,
    sorters: ISorterMap,
    itemMap: Record<string, { iconId: number }>
  ): IBlueprintBuilding[] {
    const result: IBlueprintBuilding[] = []

    for (const itemName in itemSummary) {
      const itemEntry = itemSummary[itemName]
      const nodes = this.generateConveyorBelt(itemName, itemEntry, sorters, itemMap)
      result.push(...nodes)
    }

    this.buildings = result
    return result
  }
}
