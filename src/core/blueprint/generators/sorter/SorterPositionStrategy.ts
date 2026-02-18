/**
 * SorterPositionStrategy - 分拣器位置策略基类
 *
 * 功能：
 * - 定义分拣器位置计算策略接口
 * - 提供通用的位置计算辅助方法
 * - 支持建筑旋转处理
 *
 * 主要方法：
 * - getCategory(): 获取建筑类型（抽象方法）
 * - calculate(context): 计算分拣器位置（抽象方法）
 * - createResult(offset, yaw): 创建结果对象
 * - applyRotate(offsets, rotate): 应用旋转
 * - calculateYaw(baseYaw, rotate): 计算朝向
 *
 * 上游调用：
 * - generators/sorter/SorterPositionCalculator.ts: 分拣器位置计算器
 *
 * 下游依赖：
 * - types/blueprint.ts: 蓝图类型定义
 *
 * 子类：
 * - SmelterAssemblerSorterStrategy: 熔炉/制造台策略
 * - PlantSorterStrategy: 化工厂策略
 * - RefinerySorterStrategy: 精炼厂策略
 * - ColliderSorterStrategy: 对撞机策略
 * - LabSorterStrategy: 研究站策略
 */
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
