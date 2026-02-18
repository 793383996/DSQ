/**
 * SorterGenerator - 分拣器生成器
 *
 * 功能：
 * - 计算分拣器的位置和朝向
 * - 根据建筑类型确定分拣器槽位偏移
 * - 支持多种建筑类型：熔炉/制造台/化工厂/研究站/对撞机
 *
 * 主要方法：
 * - calculateSorterLocalOffsetAndYaw(buildingOffset, type, slotIndex, rotate): 计算分拣器偏移和朝向
 * - calculateSmelterAssemblingOffset(): 熔炉/制造台偏移计算
 * - calculatePlantOffset(): 化工厂偏移计算
 * - calculateRefineryOffset(): 精炼厂偏移计算
 * - calculateColliderOffset(): 对撞机偏移计算
 * - calculateLabOffset(): 研究站偏移计算
 *
 * 上游调用：
 * - generators/ConveyorGenerator.ts: 传送带生成器
 *
 * 下游依赖：
 * - types/blueprint.ts: 蓝图类型定义
 * - types/buildingGenerator.ts: 建筑生成器类型定义
 *
 * 建筑类型分类：
 * - smelter: 熔炉类
 * - assembling: 制造台类
 * - plant: 化工厂类
 * - refinery: 精炼厂类
 * - collider: 对撞机类
 * - lab: 研究站类
 */
import type { ICoordinate } from '../../types/blueprint'
import type { ISorterInfo, ISorterMap } from '../types/buildingGenerator'

export const PRODUCTION_CATEGORY = {
  smelter: 0,
  assembling: 1,
  plant: 2,
  refinery: 3,
  collider: 4,
  lab: 5
} as const

export type ProductionCategory = (typeof PRODUCTION_CATEGORY)[keyof typeof PRODUCTION_CATEGORY]

export interface ISorterOffsetResult {
  offset: ICoordinate[]
  yaw: number[]
}

export class SorterGenerator {
  calculateSorterLocalOffsetAndYaw(
    buildingOffset: ICoordinate,
    type: ProductionCategory,
    slotIndex: number,
    rotate: number = 0
  ): ISorterOffsetResult {
    const data: ISorterOffsetResult = {
      offset: [],
      yaw: []
    }

    if (type === PRODUCTION_CATEGORY.smelter || type === PRODUCTION_CATEGORY.assembling) {
      this.calculateSmelterAssemblingOffset(data, buildingOffset, slotIndex, rotate)
    } else if (type === PRODUCTION_CATEGORY.plant) {
      this.calculatePlantOffset(data, buildingOffset, slotIndex, rotate)
    } else if (type === PRODUCTION_CATEGORY.refinery) {
      this.calculateRefineryOffset(data, buildingOffset, slotIndex, rotate)
    } else if (type === PRODUCTION_CATEGORY.collider) {
      this.calculateColliderOffset(data, buildingOffset, slotIndex, rotate)
    } else if (type === PRODUCTION_CATEGORY.lab) {
      this.calculateLabOffset(data, buildingOffset, slotIndex, rotate)
    } else {
      throw new Error(`calculateSorterLocalOffset error: unsupported production category - ${type}`)
    }

    if (rotate === 1) {
      data.offset.reverse()
    }

    return data
  }

  private calculateSmelterAssemblingOffset(
    data: ISorterOffsetResult,
    buildingOffset: ICoordinate,
    slotIndex: number,
    rotate: number
  ): void {
    const { x, y, z } = buildingOffset
    switch (slotIndex) {
      case 8:
        data.offset = [
          { x: x - 0.9, y: y - 1, z },
          { x: x - 0.9, y: y - 2, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 7:
        data.offset = [
          { x, y: y - 1, z },
          { x, y: y - 2, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 6:
        data.offset = [
          { x: x + 0.9, y: y - 1, z },
          { x: x + 0.9, y: y - 2, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 5:
        data.offset = [
          { x: x + 1, y: y - 0.8, z },
          { x: x + 2, y: y - 0.8, z }
        ]
        data.yaw = [(90 + rotate * 180) % 360, (90 + rotate * 180) % 360]
        break
      case 4:
        data.offset = [
          { x: x + 1, y, z },
          { x: x + 2, y, z }
        ]
        data.yaw = [(90 + rotate * 180) % 360, (90 + rotate * 180) % 360]
        break
      case 3:
        data.offset = [
          { x: x + 1, y: y + 0.8, z },
          { x: x + 2, y: y + 0.8, z }
        ]
        data.yaw = [(90 + rotate * 180) % 360, (90 + rotate * 180) % 360]
        break
      default:
        throw new Error(
          `calculateSorterLocalOffset error: unsupported slotIndex < 3 for smelter or assembling - ${slotIndex}`
        )
    }
  }

  private calculatePlantOffset(
    data: ISorterOffsetResult,
    buildingOffset: ICoordinate,
    slotIndex: number,
    rotate: number
  ): void {
    const { x, y, z } = buildingOffset
    switch (slotIndex) {
      case 6:
        data.offset = [
          { x: x - 0.8, y: y - 1, z },
          { x: x - 0.8, y: y - 2, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 5:
        data.offset = [
          { x, y: y - 1, z },
          { x, y: y - 2, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 4:
        data.offset = [
          { x: x + 0.8, y: y - 1, z },
          { x: x + 0.8, y: y - 2, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 3:
        data.offset = [
          { x: x + 1.6, y: y - 1, z },
          { x: x + 1.6, y: y - 2, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 2:
        data.offset = [
          { x: x + 0.8, y: y + 2, z },
          { x: x + 0.8, y: y + 3, z }
        ]
        data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360]
        break
      case 1:
        data.offset = [
          { x, y: y + 2, z },
          { x, y: y + 3, z }
        ]
        data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360]
        break
      case 0:
        data.offset = [
          { x: x - 0.8, y: y + 2, z },
          { x: x - 0.8, y: y + 3, z }
        ]
        data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360]
        break
      default:
        throw new Error(`unsupported: plant slot < 0`)
    }
  }

  private calculateRefineryOffset(
    data: ISorterOffsetResult,
    buildingOffset: ICoordinate,
    slotIndex: number,
    rotate: number
  ): void {
    const { x, y, z } = buildingOffset
    switch (slotIndex) {
      case 8:
        data.offset = [
          { x: x - 3, y: y - 1, z },
          { x: x - 4, y: y - 1, z }
        ]
        data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360]
        break
      case 7:
        data.offset = [
          { x: x - 3, y, z },
          { x: x - 4, y, z }
        ]
        data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360]
        break
      case 6:
        data.offset = [
          { x: x - 3, y: y + 1, z },
          { x: x - 4, y: y + 1, z }
        ]
        data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360]
        break
      case 5:
        data.offset = [
          { x: x - 0.8, y: y + 1, z },
          { x: x - 0.8, y: y + 2, z }
        ]
        data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360]
        break
      case 4:
        data.offset = [
          { x, y: y + 1, z },
          { x, y: y + 2, z }
        ]
        data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360]
        break
      case 3:
        data.offset = [
          { x: x + 0.8, y: y + 1, z },
          { x: x + 0.8, y: y + 2, z }
        ]
        data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360]
        break
      case 2:
        data.offset = [
          { x: x + 0.8, y: y - 1, z },
          { x: x + 0.8, y: y - 2, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 1:
        data.offset = [
          { x, y: y - 1, z },
          { x, y: y - 2, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 0:
        data.offset = [
          { x: x - 0.8, y: y - 1, z },
          { x: x - 0.8, y: y - 2, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      default:
        throw new Error(`unsupported: refinery slot < 0`)
    }
  }

  private calculateColliderOffset(
    data: ISorterOffsetResult,
    buildingOffset: ICoordinate,
    slotIndex: number,
    rotate: number
  ): void {
    const { x, y, z } = buildingOffset
    switch (slotIndex) {
      case 8:
        data.offset = [
          { x: x - 0.8, y: y - 2, z },
          { x: x - 0.8, y: y - 3, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 7:
        data.offset = [
          { x: x - 1.6, y: y - 2, z },
          { x: x - 1.6, y: y - 3, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 6:
        data.offset = [
          { x: x - 2.4, y: y - 2, z },
          { x: x - 2.4, y: y - 3, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 5:
        data.offset = [
          { x: x - 4, y: y - 1, z },
          { x: x - 5, y: y - 1, z }
        ]
        data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360]
        break
      case 4:
        data.offset = [
          { x: x - 4, y, z },
          { x: x - 5, y, z }
        ]
        data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360]
        break
      case 3:
        data.offset = [
          { x: x - 4, y: y + 1, z },
          { x: x - 5, y: y + 1, z }
        ]
        data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360]
        break
      case 2:
        data.offset = [
          { x: x - 2.4, y: y + 2, z },
          { x: x - 2.4, y: y + 3, z }
        ]
        data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360]
        break
      case 1:
        data.offset = [
          { x: x - 1.6, y: y + 2, z },
          { x: x - 1.6, y: y + 3, z }
        ]
        data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360]
        break
      case 0:
        data.offset = [
          { x: x - 0.8, y: y + 2, z },
          { x: x - 0.8, y: y + 3, z }
        ]
        data.yaw = [(rotate * 180) % 360, (rotate * 180) % 360]
        break
      default:
        throw new Error(`unsupported: collider slot < 0`)
    }
  }

  private calculateLabOffset(
    data: ISorterOffsetResult,
    buildingOffset: ICoordinate,
    slotIndex: number,
    rotate: number
  ): void {
    const { x, y, z } = buildingOffset
    switch (slotIndex) {
      case 11:
        data.offset = [
          { x: x + 2, y: y + 0.8, z },
          { x: x + 3, y: y + 0.8, z }
        ]
        data.yaw = [(90 + rotate * 180) % 360, (90 + rotate * 180) % 360]
        break
      case 10:
        data.offset = [
          { x: x + 2, y, z },
          { x: x + 3, y, z }
        ]
        data.yaw = [(90 + rotate * 180) % 360, (90 + rotate * 180) % 360]
        break
      case 9:
        data.offset = [
          { x: x + 2, y: y - 0.8, z },
          { x: x + 3, y: y - 0.8, z }
        ]
        data.yaw = [(90 + rotate * 180) % 360, (90 + rotate * 180) % 360]
        break
      case 8:
        data.offset = [
          { x: x + 0.8, y: y - 2, z },
          { x: x + 0.8, y: y - 3, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 7:
        data.offset = [
          { x, y: y - 2, z },
          { x, y: y - 3, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 6:
        data.offset = [
          { x: x - 0.8, y: y - 2, z },
          { x: x - 0.8, y: y - 3, z }
        ]
        data.yaw = [(180 + rotate * 180) % 360, (180 + rotate * 180) % 360]
        break
      case 5:
        data.offset = [
          { x: x - 2, y: y - 0.8, z },
          { x: x - 3, y: y - 0.8, z }
        ]
        data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360]
        break
      case 4:
        data.offset = [
          { x: x - 2, y, z },
          { x: x - 3, y, z }
        ]
        data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360]
        break
      case 3:
        data.offset = [
          { x: x - 2, y: y + 0.8, z },
          { x: x - 3, y: y + 0.8, z }
        ]
        data.yaw = [(270 + rotate * 180) % 360, (270 + rotate * 180) % 360]
        break
      default:
        throw new Error(`unsupported: lab slot < 3`)
    }
  }
}
