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
