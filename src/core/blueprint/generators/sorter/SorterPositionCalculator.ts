/**
 * SorterPositionCalculator - 分拣器位置计算器
 *
 * 功能：
 * - 根据建筑类型计算分拣器位置
 * - 使用策略模式支持不同建筑类型
 * - 管理分拣器位置策略注册
 *
 * 主要方法：
 * - calculate(buildingOffset, category, slotIndex, rotate): 计算分拣器位置
 * - registerStrategies(): 注册所有策略
 *
 * 上游调用：
 * - generators/ConveyorGenerator.ts: 传送带生成器
 * - generators/building/*.ts: 各类建筑生成器
 *
 * 下游依赖：
 * - generators/sorter/SorterPositionStrategy.ts: 分拣器位置策略基类
 * - generators/sorter/SmelterAssemblerSorterStrategy.ts: 熔炉/制造台策略
 * - generators/sorter/PlantSorterStrategy.ts: 化工厂策略
 * - generators/sorter/RefinerySorterStrategy.ts: 精炼厂策略
 * - generators/sorter/ColliderSorterStrategy.ts: 对撞机策略
 * - generators/sorter/LabSorterStrategy.ts: 研究站策略
 */
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
