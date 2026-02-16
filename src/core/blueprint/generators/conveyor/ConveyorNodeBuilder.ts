import type { IBlueprintBuilding, ICoordinate } from '../../../types/blueprint'
import type { IConveyorGeneratorConfig } from '../../types/conveyorGenerator'
import {
  DEFAULT_CONVEYOR_GENERATOR_CONFIG,
  CONVEYOR_BELT_MK1_SPEED,
  CONVEYOR_BELT_MK3_SPEED
} from '../../types/conveyorGenerator'

export interface IConveyorBelt {
  itemId: number
  modelIndex: number
  transportSpeed: number
}

export interface INodeBuildParams {
  offset: ICoordinate
  yaw: number[]
  conveyor: IConveyorBelt
  outputObjIdx: number
  outputToSlot: number
  parameters: { iconId?: number; count?: string } | null
}

export interface IBuildingMapForConveyor {
  conveyorBeltMk1: { itemId: number; modelIndex: number; transportSpeed?: number }
  conveyorBeltMK3: { itemId: number; modelIndex: number; transportSpeed?: number }
}

export class ConveyorNodeBuilder {
  private buildingIndex: number = 0
  private config: IConveyorGeneratorConfig
  private buildingMap: IBuildingMapForConveyor

  constructor(
    buildingMap: IBuildingMapForConveyor,
    config: Partial<IConveyorGeneratorConfig> = {}
  ) {
    this.buildingMap = buildingMap
    this.config = { ...DEFAULT_CONVEYOR_GENERATOR_CONFIG, ...config }
  }

  setBuildingIndex(index: number): void {
    this.buildingIndex = index
  }

  getBuildingIndex(): number {
    return this.buildingIndex
  }

  selectConveyorBelt(rate: number, fromBuildingNum: number): IConveyorBelt {
    const mk1 = this.buildingMap.conveyorBeltMk1
    const mk3 = this.buildingMap.conveyorBeltMK3

    if (this.config.onlyConveyorBeltMk3) {
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3.transportSpeed || CONVEYOR_BELT_MK3_SPEED
      }
    }

    if (rate >= CONVEYOR_BELT_MK1_SPEED) {
      if (rate === CONVEYOR_BELT_MK1_SPEED && this.config.upgradeConveyorBelt) {
        return {
          itemId: mk3.itemId,
          modelIndex: mk3.modelIndex,
          transportSpeed: mk3.transportSpeed || CONVEYOR_BELT_MK3_SPEED
        }
      }
      return {
        itemId: mk3.itemId,
        modelIndex: mk3.modelIndex,
        transportSpeed: mk3.transportSpeed || CONVEYOR_BELT_MK3_SPEED
      }
    }

    return {
      itemId: mk1.itemId,
      modelIndex: mk1.modelIndex,
      transportSpeed: mk1.transportSpeed || CONVEYOR_BELT_MK1_SPEED
    }
  }

  calculateMaxTransportSpeed(fromBuildingNum: number): number {
    let maxSpeed = CONVEYOR_BELT_MK3_SPEED

    if (fromBuildingNum === 0) {
      maxSpeed = CONVEYOR_BELT_MK3_SPEED * this.config.conveyorBeltStackLayer
    }

    return maxSpeed
  }

  buildNode(params: INodeBuildParams): IBlueprintBuilding {
    this.buildingIndex++
    return {
      index: this.buildingIndex,
      areaIndex: 0,
      localOffset: [params.offset, params.offset],
      yaw: params.yaw,
      itemId: params.conveyor.itemId,
      modelIndex: params.conveyor.modelIndex,
      outputObjIdx: params.outputObjIdx,
      inputObjIdx: -1,
      outputToSlot: params.outputToSlot,
      inputFromSlot: 0,
      outputFromSlot: 0,
      inputToSlot: 1,
      outputOffset: 0,
      inputOffset: 0,
      recipeId: 0,
      filterId: 0,
      parameters: params.parameters
    }
  }

  buildNodeSequence(
    startPos: ICoordinate,
    direction: { x: number; y: number },
    count: number,
    conveyor: IConveyorBelt,
    parameters: { iconId?: number; count?: string } | null = null
  ): IBlueprintBuilding[] {
    const nodes: IBlueprintBuilding[] = []

    for (let i = 0; i < count; i++) {
      const offset: ICoordinate = {
        x: startPos.x + direction.x * i,
        y: startPos.y + direction.y * i,
        z: startPos.z || 0
      }

      const node = this.buildNode({
        offset,
        yaw: [0, 0],
        conveyor,
        outputObjIdx: this.buildingIndex + 2,
        outputToSlot: 1,
        parameters: i === 0 ? parameters : null
      })
      nodes.push(node)
    }

    return nodes
  }

  calculateSortersPerNode(): number {
    const stackLayers = this.config.stackLayers || 1
    if (stackLayers > 1) {
      return Math.max(1, Math.floor(this.config.maxSorterNumOneBelt / stackLayers))
    }
    return this.config.maxSorterNumOneBelt
  }
}
