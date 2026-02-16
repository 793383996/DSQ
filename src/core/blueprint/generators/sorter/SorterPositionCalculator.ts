import type { ICoordinate } from '../../../types/blueprint'
import {
  SorterPositionStrategy,
  type ISorterPositionContext,
  type ISorterOffsetResult,
  PRODUCTION_CATEGORY,
  type ProductionCategory
} from './SorterPositionStrategy'
import { SmelterAssemblerSorterStrategy } from './SmelterAssemblerSorterStrategy'
import { PlantSorterStrategy } from './PlantSorterStrategy'
import { RefinerySorterStrategy } from './RefinerySorterStrategy'
import { ColliderSorterStrategy } from './ColliderSorterStrategy'
import { LabSorterStrategy } from './LabSorterStrategy'

export class SorterPositionCalculator {
  private strategies: Map<ProductionCategory, SorterPositionStrategy>

  constructor() {
    this.strategies = new Map()
    this.registerStrategies()
  }

  private registerStrategies(): void {
    this.strategies.set(
      PRODUCTION_CATEGORY.smelter,
      new SmelterAssemblerSorterStrategy(PRODUCTION_CATEGORY.smelter)
    )
    this.strategies.set(
      PRODUCTION_CATEGORY.assembling,
      new SmelterAssemblerSorterStrategy(PRODUCTION_CATEGORY.assembling)
    )
    this.strategies.set(PRODUCTION_CATEGORY.plant, new PlantSorterStrategy())
    this.strategies.set(PRODUCTION_CATEGORY.refinery, new RefinerySorterStrategy())
    this.strategies.set(PRODUCTION_CATEGORY.collider, new ColliderSorterStrategy())
    this.strategies.set(PRODUCTION_CATEGORY.lab, new LabSorterStrategy())
  }

  calculate(
    buildingOffset: ICoordinate,
    category: ProductionCategory,
    slotIndex: number,
    rotate: number = 0
  ): ISorterOffsetResult {
    const strategy = this.strategies.get(category)
    if (!strategy) {
      throw new Error(
        `calculateSorterLocalOffset error: unsupported production category - ${category}`
      )
    }

    const context: ISorterPositionContext = {
      buildingOffset,
      slotIndex,
      rotate
    }

    return strategy.calculate(context)
  }

  getStrategy(category: ProductionCategory): SorterPositionStrategy | undefined {
    return this.strategies.get(category)
  }

  registerStrategy(strategy: SorterPositionStrategy): void {
    this.strategies.set(strategy.getCategory(), strategy)
  }
}

export function createSorterPositionCalculator(): SorterPositionCalculator {
  return new SorterPositionCalculator()
}
