import type { ICalculationResult } from '../types/recipe'

/**
 * 计算上下文 - 替代全局变量
 * 
 * 架构师注：
 * - 此类用于封装计算过程中的中间状态
 * - 替代 xh_list, out_list, items 等全局变量
 * - 每次计算前应调用 reset() 清空状态
 */
export class CalculationContext {
  /** 消耗列表 (替代 xh_list) */
  consumption: Map<string, number> = new Map()

  /** 产出列表 (替代 out_list) */
  production: Map<string, number> = new Map()

  /** 计算结果 (替代 items) */
  results: ICalculationResult[] = []

  /** 递归深度监控 */
  depth: number = 0

  /** 最大递归深度 */
  maxDepth: number = 100

  /** 计算开始时间 */
  startTime: number = 0

  /** 计算耗时 (ms) */
  elapsedTime: number = 0

  /**
   * 添加消耗
   */
  addConsumption(name: string, amount: number): void {
    const current = this.consumption.get(name) || 0
    this.consumption.set(name, current + amount)
  }

  /**
   * 添加产出
   */
  addProduction(name: string, amount: number): void {
    const current = this.production.get(name) || 0
    this.production.set(name, current + amount)
  }

  /**
   * 添加计算结果
   */
  addResult(result: ICalculationResult): void {
    this.results.push(result)
  }

  /**
   * 获取消耗
   */
  getConsumption(name: string): number {
    return this.consumption.get(name) || 0
  }

  /**
   * 获取产出
   */
  getProduction(name: string): number {
    return this.production.get(name) || 0
  }

  /**
   * 递归深度增加
   */
  enterRecursion(): boolean {
    this.depth++
    if (this.depth > this.maxDepth) {
      console.error(`[CalculationContext] Max recursion depth exceeded: ${this.maxDepth}`)
      return false
    }
    return true
  }

  /**
   * 递归深度减少
   */
  exitRecursion(): void {
    this.depth--
  }

  /**
   * 开始计时
   */
  startTimer(): void {
    this.startTime = performance.now()
  }

  /**
   * 停止计时
   */
  stopTimer(): void {
    if (this.startTime > 0) {
      this.elapsedTime = performance.now() - this.startTime
    }
  }

  /**
   * 重置上下文
   */
  reset(): void {
    this.consumption.clear()
    this.production.clear()
    this.results = []
    this.depth = 0
    this.startTime = 0
    this.elapsedTime = 0
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    consumptionCount: number
    productionCount: number
    resultCount: number
    elapsedTime: number
  } {
    return {
      consumptionCount: this.consumption.size,
      productionCount: this.production.size,
      resultCount: this.results.length,
      elapsedTime: this.elapsedTime
    }
  }
}
