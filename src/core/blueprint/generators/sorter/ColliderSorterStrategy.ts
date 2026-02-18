/**
 * ColliderSorterStrategy - 对撞机分拣器策略
 *
 * 功能：
 * - 计算粒子对撞机的分拣器位置
 * - 支持多种槽位索引
 * - 处理建筑旋转
 *
 * 主要方法：
 * - getCategory(): 获取建筑类型（collider）
 * - calculate(context): 计算分拣器位置
 *
 * 上游调用：
 * - generators/sorter/SorterPositionCalculator.ts: 分拣器位置计算器
 *
 * 下游依赖：
 * - generators/sorter/SorterPositionStrategy.ts: 分拣器位置策略基类
 */
import type { ICoordinate } from '../../../types/blueprint'
import {
  SorterPositionStrategy,
  type ISorterPositionContext,
  type ISorterOffsetResult,
  PRODUCTION_CATEGORY,
  type ProductionCategory
} from './SorterPositionStrategy'

export class ColliderSorterStrategy extends SorterPositionStrategy {
  getCategory(): ProductionCategory {
    return PRODUCTION_CATEGORY.collider
  }

  calculate(context: ISorterPositionContext): ISorterOffsetResult {
    const { buildingOffset, slotIndex, rotate } = context
    const { x, y, z } = buildingOffset

    let offsets: ICoordinate[]
    let baseYaw: number
    let secondYaw: number

    switch (slotIndex) {
      case 8:
        offsets = [
          { x: x - 0.8, y: y - 2, z },
          { x: x - 0.8, y: y - 3, z }
        ]
        baseYaw = 180
        secondYaw = 180
        break
      case 7:
        offsets = [
          { x: x - 1.6, y: y - 2, z },
          { x: x - 1.6, y: y - 3, z }
        ]
        baseYaw = 180
        secondYaw = 180
        break
      case 6:
        offsets = [
          { x: x - 2.4, y: y - 2, z },
          { x: x - 2.4, y: y - 3, z }
        ]
        baseYaw = 180
        secondYaw = 180
        break
      case 5:
        offsets = [
          { x: x - 4, y: y - 1, z },
          { x: x - 5, y: y - 1, z }
        ]
        baseYaw = 270
        secondYaw = 270
        break
      case 4:
        offsets = [
          { x: x - 4, y, z },
          { x: x - 5, y, z }
        ]
        baseYaw = 270
        secondYaw = 270
        break
      case 3:
        offsets = [
          { x: x - 4, y: y + 1, z },
          { x: x - 5, y: y + 1, z }
        ]
        baseYaw = 270
        secondYaw = 270
        break
      case 2:
        offsets = [
          { x: x - 2.4, y: y + 2, z },
          { x: x - 2.4, y: y + 3, z }
        ]
        baseYaw = 0
        secondYaw = 0
        break
      case 1:
        offsets = [
          { x: x - 1.6, y: y + 2, z },
          { x: x - 1.6, y: y + 3, z }
        ]
        baseYaw = 0
        secondYaw = 0
        break
      case 0:
        offsets = [
          { x: x - 0.8, y: y + 2, z },
          { x: x - 0.8, y: y + 3, z }
        ]
        baseYaw = 0
        secondYaw = 0
        break
      default:
        throw new Error(`unsupported: collider slot < 0`)
    }

    const yaw = (baseYaw + rotate * 180) % 360
    const yaw2 = (secondYaw + rotate * 270) % 360
    const finalOffsets = this.applyRotate(offsets, rotate)

    return this.createResult(finalOffsets, [yaw, yaw2])
  }
}
