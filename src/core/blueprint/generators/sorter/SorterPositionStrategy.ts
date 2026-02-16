import type { ICoordinate } from '../../../types/blueprint'
import { PRODUCTION_CATEGORY, type ProductionCategory } from '../SorterGenerator'

export interface ISorterOffsetResult {
  offset: ICoordinate[]
  yaw: number[]
}

export interface ISorterPositionContext {
  buildingOffset: ICoordinate
  slotIndex: number
  rotate: number
}

export abstract class SorterPositionStrategy {
  abstract getCategory(): ProductionCategory

  abstract calculate(context: ISorterPositionContext): ISorterOffsetResult

  protected createResult(offset: ICoordinate[], yaw: number[]): ISorterOffsetResult {
    return { offset, yaw }
  }

  protected applyRotate(offsets: ICoordinate[], rotate: number): ICoordinate[] {
    if (rotate === 1) {
      return [...offsets].reverse()
    }
    return offsets
  }

  protected calculateYaw(baseYaw: number, rotate: number): number {
    return (baseYaw + rotate * 180) % 360
  }
}

export { PRODUCTION_CATEGORY }
export type { ProductionCategory }
