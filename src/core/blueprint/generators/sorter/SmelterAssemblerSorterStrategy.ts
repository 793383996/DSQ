/**
 * SmelterAssemblerSorterStrategy - 熔炉/制造台分拣器策略
 *
 * 功能：
 * - 计算熔炉和制造台的分拣器位置
 * - 支持多种槽位索引（6/7/8等）
 * - 处理建筑旋转
 *
 * 主要方法：
 * - getCategory(): 获取建筑类型
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

export class SmelterAssemblerSorterStrategy extends SorterPositionStrategy {
  private category: ProductionCategory

  constructor(category: ProductionCategory) {
    super()
    this.category = category
  }

  getCategory(): ProductionCategory {
    return this.category
  }

  calculate(context: ISorterPositionContext): ISorterOffsetResult {
    const { buildingOffset, slotIndex, rotate } = context
    const { x, y, z } = buildingOffset

    let offsets: ICoordinate[]
    let baseYaw: number

    switch (slotIndex) {
      case 8:
        offsets = [
          { x: x - 0.9, y: y - 1, z },
          { x: x - 0.9, y: y - 2, z }
        ]
        baseYaw = 180
        break
      case 7:
        offsets = [
          { x, y: y - 1, z },
          { x, y: y - 2, z }
        ]
        baseYaw = 180
        break
      case 6:
        offsets = [
          { x: x + 0.9, y: y - 1, z },
          { x: x + 0.9, y: y - 2, z }
        ]
        baseYaw = 180
        break
      case 5:
        offsets = [
          { x: x + 1, y: y - 0.8, z },
          { x: x + 2, y: y - 0.8, z }
        ]
        baseYaw = 90
        break
      case 4:
        offsets = [
          { x: x + 1, y, z },
          { x: x + 2, y, z }
        ]
        baseYaw = 90
        break
      case 3:
        offsets = [
          { x: x + 1, y: y + 0.8, z },
          { x: x + 2, y: y + 0.8, z }
        ]
        baseYaw = 90
        break
      default:
        throw new Error(
          `calculateSorterLocalOffset error: unsupported slotIndex < 3 for ${this.category === PRODUCTION_CATEGORY.smelter ? 'smelter' : 'assembling'} - ${slotIndex}`
        )
    }

    const yaw = this.calculateYaw(baseYaw, rotate)
    const finalOffsets = this.applyRotate(offsets, rotate)

    return this.createResult(finalOffsets, [yaw, yaw])
  }
}
