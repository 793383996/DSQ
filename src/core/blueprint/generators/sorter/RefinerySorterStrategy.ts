import type { ICoordinate } from '../../../types/blueprint'
import {
  SorterPositionStrategy,
  type ISorterPositionContext,
  type ISorterOffsetResult,
  PRODUCTION_CATEGORY,
  type ProductionCategory
} from './SorterPositionStrategy'

export class RefinerySorterStrategy extends SorterPositionStrategy {
  getCategory(): ProductionCategory {
    return PRODUCTION_CATEGORY.refinery
  }

  calculate(context: ISorterPositionContext): ISorterOffsetResult {
    const { buildingOffset, slotIndex, rotate } = context
    const { x, y, z } = buildingOffset

    let offsets: ICoordinate[]
    let baseYaw: number

    switch (slotIndex) {
      case 8:
        offsets = [
          { x: x - 3, y: y - 1, z },
          { x: x - 4, y: y - 1, z }
        ]
        baseYaw = 270
        break
      case 7:
        offsets = [
          { x: x - 3, y, z },
          { x: x - 4, y, z }
        ]
        baseYaw = 270
        break
      case 6:
        offsets = [
          { x: x - 3, y: y + 1, z },
          { x: x - 4, y: y + 1, z }
        ]
        baseYaw = 270
        break
      case 5:
        offsets = [
          { x: x - 0.8, y: y + 1, z },
          { x: x - 0.8, y: y + 2, z }
        ]
        baseYaw = 0
        break
      case 4:
        offsets = [
          { x, y: y + 1, z },
          { x, y: y + 2, z }
        ]
        baseYaw = 0
        break
      case 3:
        offsets = [
          { x: x + 0.8, y: y + 1, z },
          { x: x + 0.8, y: y + 2, z }
        ]
        baseYaw = 0
        break
      case 2:
        offsets = [
          { x: x + 0.8, y: y - 1, z },
          { x: x + 0.8, y: y - 2, z }
        ]
        baseYaw = 180
        break
      case 1:
        offsets = [
          { x, y: y - 1, z },
          { x, y: y - 2, z }
        ]
        baseYaw = 180
        break
      case 0:
        offsets = [
          { x: x - 0.8, y: y - 1, z },
          { x: x - 0.8, y: y - 2, z }
        ]
        baseYaw = 180
        break
      default:
        throw new Error(`unsupported: refinery slot < 0`)
    }

    const yaw = this.calculateYaw(baseYaw, rotate)
    const finalOffsets = this.applyRotate(offsets, rotate)

    return this.createResult(finalOffsets, [yaw, yaw])
  }
}
