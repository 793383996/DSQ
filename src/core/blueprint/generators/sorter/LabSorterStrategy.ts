import type { ICoordinate } from '../../../types/blueprint'
import {
  SorterPositionStrategy,
  type ISorterPositionContext,
  type ISorterOffsetResult,
  PRODUCTION_CATEGORY,
  type ProductionCategory
} from './SorterPositionStrategy'

export class LabSorterStrategy extends SorterPositionStrategy {
  getCategory(): ProductionCategory {
    return PRODUCTION_CATEGORY.lab
  }

  calculate(context: ISorterPositionContext): ISorterOffsetResult {
    const { buildingOffset, slotIndex, rotate } = context
    const { x, y, z } = buildingOffset

    let offsets: ICoordinate[]
    let baseYaw: number

    switch (slotIndex) {
      case 11:
        offsets = [
          { x: x + 2, y: y + 0.8, z },
          { x: x + 3, y: y + 0.8, z }
        ]
        baseYaw = 90
        break
      case 10:
        offsets = [
          { x: x + 2, y, z },
          { x: x + 3, y, z }
        ]
        baseYaw = 90
        break
      case 9:
        offsets = [
          { x: x + 2, y: y - 0.8, z },
          { x: x + 3, y: y - 0.8, z }
        ]
        baseYaw = 90
        break
      case 8:
        offsets = [
          { x: x + 0.8, y: y - 2, z },
          { x: x + 0.8, y: y - 3, z }
        ]
        baseYaw = 180
        break
      case 7:
        offsets = [
          { x, y: y - 2, z },
          { x, y: y - 3, z }
        ]
        baseYaw = 180
        break
      case 6:
        offsets = [
          { x: x - 0.8, y: y - 2, z },
          { x: x - 0.8, y: y - 3, z }
        ]
        baseYaw = 180
        break
      case 5:
        offsets = [
          { x: x - 2, y: y - 0.8, z },
          { x: x - 3, y: y - 0.8, z }
        ]
        baseYaw = 270
        break
      case 4:
        offsets = [
          { x: x - 2, y, z },
          { x: x - 3, y, z }
        ]
        baseYaw = 270
        break
      case 3:
        offsets = [
          { x: x - 2, y: y + 0.8, z },
          { x: x - 3, y: y + 0.8, z }
        ]
        baseYaw = 270
        break
      default:
        throw new Error(`unsupported: lab slot < 3`)
    }

    const yaw = this.calculateYaw(baseYaw, rotate)
    const finalOffsets = this.applyRotate(offsets, rotate)

    return this.createResult(finalOffsets, [yaw, yaw])
  }
}
