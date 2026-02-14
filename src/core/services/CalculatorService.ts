import type { ICalculationResult, IDemand } from '../types/recipe'
import { CalculationContext } from './CalculationContext'
import { recipeAdapter } from '../adapters/RecipeAdapter'
import { logger } from '../../utils/logger'

interface LegacyCalculationResult {
  items: any[]
  items2: any[]
  items0: any[]
  total: any[]
  totalEnergy: number
  totalSpace: number
  totalAcc: string
  xqs: any[]
  ig_names: string[]
}

interface LegacyApp {
  items: any[]
  items2: any[]
  items0: any[]
  total: any[]
  totalEnergy: string
  totalSpace: number
  totalAcc: string
  xqs: any[]
}

function clearLegacyGlobalState(): void {
  const w = window as any
  if (w.xh_list) w.xh_list = []
  if (w.out_list) w.out_list = []
  if (w.single_list) w.single_list = []
  if (w.total) w.total = []
  w.totalAcc = 0
}

/**
 * 计算服务 - 封装 update_all 逻辑
 * 
 * 架构师注：
 * - 核心算法保持不变，仅做外围包装
 * - update_all 函数视为黑盒，禁止修改内部递归逻辑
 * - 所有计算结果通过 CalculationContext 封装
 * - 输入输出格式与原 bridge.runCalculation 完全一致
 */
export class CalculatorService {
  private context: CalculationContext = new CalculationContext()

  /**
   * 执行计算
   * 
   * 流程：
   * 1. 清理遗留全局状态
   * 2. 设置 window.xqs 和 window.ig_names
   * 3. 调用 window.update_all() 执行计算
   * 4. 从 window.app 提取结果
   * 5. 填充 CalculationContext
   * 
   * @param demands 需求列表
   * @param excludes 排除列表
   * @returns 计算结果 (与原 bridge.runCalculation 返回格式一致)
   */
  async calculate(
    demands: IDemand[],
    excludes: string[] = []
  ): Promise<LegacyCalculationResult> {
    this.context.reset()
    this.context.startTimer()

    clearLegacyGlobalState()

    if (!recipeAdapter.isLoaded()) {
      const rawData = (window as any).data
      if (rawData) {
        recipeAdapter.loadFromRawData(rawData)
      }
    }

    ;(window as any).xqs = demands.map(d => ({
      name: d.name,
      number: d.num,
      item: { name: d.name }
    }))
    ;(window as any).ig_names = [...excludes]

    try {
      if (typeof (window as any).update_all === 'function') {
        ;(window as any).update_all()
      } else {
        logger.error('[CalculatorService] update_all function not found')
        throw new Error('计算引擎未初始化')
      }

      const result = this.extractResults()
      this.fillContext()
      this.context.stopTimer()

      logger.log(`[CalculatorService] Calculation completed in ${this.context.elapsedTime.toFixed(2)}ms`)

      return result
    } catch (error) {
      this.context.stopTimer()
      logger.error('[CalculatorService] Calculation failed:', error)
      throw error
    }
  }

  /**
   * 从 window.app 提取计算结果
   * 
   * 注意：结果在 window.app 中，不是 window.items
   */
  private extractResults(): LegacyCalculationResult {
    const app: LegacyApp = (window as any).app || {
      items: [],
      items2: [],
      items0: [],
      total: [],
      totalEnergy: '0',
      totalSpace: 0,
      totalAcc: '0',
      xqs: []
    }

    return {
      items: app.items || [],
      items2: app.items2 || [],
      items0: app.items0 || [],
      total: app.total || [],
      totalEnergy: parseFloat(app.totalEnergy) || 0,
      totalSpace: app.totalSpace || 0,
      totalAcc: app.totalAcc || '0',
      xqs: app.xqs || [],
      ig_names: (window as any).ig_names || []
    }
  }

  /**
   * 填充 CalculationContext 数据
   */
  private fillContext(): void {
    const xhList = (window as any).xh_list || []
    const outList = (window as any).out_list || []

    xhList.forEach((item: any) => {
      if (item.value && item.value > 0) {
        this.context.addConsumption(item.name, item.value)
      }
    })

    outList.forEach((item: any) => {
      if (item.value) {
        this.context.addProduction(item.name, item.value)
      }
    })
  }

  /**
   * 获取计算上下文
   */
  getContext(): CalculationContext {
    return this.context
  }

  /**
   * 获取消耗列表
   */
  getConsumption(): Map<string, number> {
    return this.context.consumption
  }

  /**
   * 获取产出列表
   */
  getProduction(): Map<string, number> {
    return this.context.production
  }

  /**
   * 获取计算统计信息
   */
  getStats(): {
    consumptionCount: number
    productionCount: number
    resultCount: number
    elapsedTime: number
  } {
    return this.context.getStats()
  }
}

export const calculatorService = new CalculatorService()
