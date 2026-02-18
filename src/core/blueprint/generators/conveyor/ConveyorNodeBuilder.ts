/**
 * ConveyorNodeBuilder - 传送带节点构建器
 *
 * 功能：
 * - 构建单个传送带节点
 * - 选择合适的传送带等级（Mk1/Mk3）
 * - 设置传送带参数（图标、数量）
 *
 * 主要方法：
 * - selectConveyorBelt(rate, fromBuildingNum): 选择传送带类型
 * - buildNode(params): 构建传送带节点
 * - setBuildingIndex(index): 设置建筑索引
 * - getBuildingIndex(): 获取当前建筑索引
 *
 * 上游调用：
 * - generators/conveyor/ConveyorConnectionBuilder.ts: 传送带连接构建器
 * - generators/conveyor/SprayCoaterConveyorBuilder.ts: 喷涂机传送带构建器
 *
 * 下游依赖：
 * - types/conveyorGenerator.ts: 传送带类型定义
 * - types/blueprint.ts: 蓝图类型定义
 */
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
  private buildingIndex: number = -1
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
