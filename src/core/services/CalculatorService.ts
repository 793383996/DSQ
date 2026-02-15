import type { IDemand, ILegacyCalculationResult, ILegacyApp } from '../types/recipe'
import type { IRawRecipe } from '../types/settings'
import { CalculationContext } from './CalculationContext'
import { recipeAdapter } from '../adapters/RecipeAdapter'
import { logger } from '../../utils/logger'

export interface CalculationOptions {
  excludes?: string[]
  onStateSnapshot?: () => IStateSnapshot
  validateState?: (snapshot: IStateSnapshot) => boolean
  throwOnStateChange?: boolean
  useNewEngine?: boolean
}

export interface IStateSnapshot {
  demandVersion: number
  demandList: IDemand[]
  excludeList: string[]
}

export interface IEngineCalculationResult {
  success: boolean
  xh_list: Array<{ name: string; value: number; value2?: number; accTotal?: number }>
  out_list: Array<{ name: string; value: number; value2?: number }>
  xhMap: Record<string, { name: string; value: number }>
  outMap: Record<string, { name: string; value: number }>
  error?: unknown
}

export class StateChangedDuringCalculationError extends Error {
  constructor(public readonly version: number) {
    super(`State changed during calculation (version ${version})`)
    this.name = 'StateChangedDuringCalculationError'
  }
}

function clearLegacyGlobalState(): void {
  const w = window as unknown as Record<string, unknown>
  if (w.xh_list && Array.isArray(w.xh_list)) w.xh_list.length = 0
  if (w.out_list && Array.isArray(w.out_list)) w.out_list.length = 0
  if (w.single_list && Array.isArray(w.single_list)) w.single_list.length = 0
  if (w.xhMap && typeof w.xhMap === 'object') {
    Object.keys(w.xhMap).forEach(key => {
      delete (w.xhMap as Record<string, unknown>)[key]
    })
  }
  if (w.outMap && typeof w.outMap === 'object') {
    Object.keys(w.outMap).forEach(key => {
      delete (w.outMap as Record<string, unknown>)[key]
    })
  }
  if (w.total && Array.isArray(w.total)) w.total.length = 0
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
 *
 * 状态同步机制：
 * - 支持状态快照和验证，防止异步计算期间状态被修改
 * - 调用方可通过 onStateSnapshot 获取计算前的状态快照
 * - 调用方可通过 validateState 验证计算后状态是否一致
 */
export class CalculatorService {
  private context: CalculationContext = new CalculationContext()
  private calculationVersion: number = 0

  /**
   * 获取当前计算版本号
   */
  getVersion(): number {
    return this.calculationVersion
  }

  /**
   * 执行计算（简化版本，向后兼容）
   */
  async calculate(demands: IDemand[], excludes: string[] = []): Promise<ILegacyCalculationResult> {
    return this.calculateWithOptions(demands, { excludes })
  }

  /**
   * 执行计算（带状态同步控制）
   *
   * 流程：
   * 1. 递增计算版本号
   * 2. 获取状态快照（如果提供了 onStateSnapshot）
   * 3. 清理遗留全局状态
   * 4. 设置 window.xqs 和 window.ig_names
   * 5. 调用 window.update_all() 执行计算
   * 6. 从 window.app 提取结果
   * 7. 验证状态一致性（如果提供了 validateState）
   * 8. 填充 CalculationContext
   *
   * @param demands 需求列表
   * @param options 计算选项
   * @returns 计算结果
   */
  async calculateWithOptions(
    demands: IDemand[],
    options: CalculationOptions
  ): Promise<ILegacyCalculationResult> {
    const version = ++this.calculationVersion
    this.context.reset()
    this.context.startTimer()

    let snapshot: IStateSnapshot | undefined
    if (options.onStateSnapshot) {
      snapshot = options.onStateSnapshot()
    }

    clearLegacyGlobalState()

    const win = window as unknown as Record<string, unknown>
    if (!recipeAdapter.isLoaded()) {
      if (win.data && win.recipeIndexByProduct) {
        recipeAdapter.loadFromRawData(win.data as IRawRecipe[])
      } else {
        logger.error('[CalculatorService] RecipeAdapter not initialized - bridge load failed')
        throw new Error('配方数据未初始化，请刷新页面重试')
      }
    }

    if (!win.app) {
      logger.error('[CalculatorService] window.app not initialized')
      throw new Error('应用状态未初始化，请刷新页面重试')
    }

    const excludes = options.excludes || []

    if (!win.xqs) win.xqs = []
    win.xqs.length = 0
    demands.forEach(d => {
      win.xqs.push({
        name: d.name,
        number: d.num,
        item: { name: d.name }
      })
    })

    if (!win.ig_names) win.ig_names = []
    win.ig_names.length = 0
    excludes.forEach(name => {
      win.ig_names.push(name)
    })

    try {
      const updateAll = win.update_all
      if (typeof updateAll === 'function') {
        ;(updateAll as () => void)()
      } else {
        logger.error('[CalculatorService] update_all function not found')
        throw new Error('计算引擎未初始化')
      }

      if (snapshot && options.validateState) {
        if (!options.validateState(snapshot)) {
          const msg = `[CalculatorService] State changed during calculation (version ${version}), result may be stale`
          logger.warn(msg)
          if (options.throwOnStateChange) {
            throw new StateChangedDuringCalculationError(version)
          }
        }
      }

      const result = this.extractResults()
      result.xqs = demands.map(d => ({
        name: d.name,
        num: d.num,
        item: { name: d.name }
      }))
      result.ig_names = [...excludes]

      this.fillContext()
      this.context.stopTimer()

      logger.log(
        `[CalculatorService] Calculation v${version} completed in ${this.context.elapsedTime.toFixed(2)}ms`
      )

      return result
    } catch (error) {
      this.context.stopTimer()
      logger.error(`[CalculatorService] Calculation v${version} failed:`, error)
      throw error
    }
  }

  /**
   * 从 window.app 提取计算结果
   *
   * 注意：结果在 window.app 中，不是 window.items
   */
  private extractResults(): ILegacyCalculationResult {
    const win = window as unknown as Record<string, unknown>
    const app = (win.app || {}) as Partial<ILegacyApp>

    return {
      items: app.items || [],
      items2: app.items2 || [],
      items0: app.items0 || [],
      total: app.total || [],
      totalEnergy: app.totalEnergy || '0',
      totalSpace: app.totalSpace || 0,
      totalAcc: app.totalAcc || '0',
      xqs: app.xqs || [],
      ig_names: (win.ig_names || []) as string[]
    }
  }

  /**
   * 填充 CalculationContext 数据
   */
  private fillContext(): void {
    const win = window as unknown as Record<string, unknown>
    const xhList = (win.xh_list || []) as Array<{ name: string; value: number }>
    const outList = (win.out_list || []) as Array<{ name: string; value: number }>

    xhList.forEach(item => {
      if (item.value && item.value > 0) {
        this.context.addConsumption(item.name, item.value)
      }
    })

    outList.forEach(item => {
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
    return this.context.consumptionMap
  }

  /**
   * 获取产出列表
   */
  getProduction(): Map<string, number> {
    return this.context.productionMap
  }

  /**
   * 使用新计算引擎执行计算
   *
   * 架构师注：
   * - 此方法使用calculatorEngine闭包封装版本
   * - 状态隔离，支持并发计算
   * - 向后兼容遗留调用方式
   *
   * @param demands 需求列表
   * @param excludes 排除列表
   * @param singleMakes 独立生产列表
   * @returns 计算结果
   */
  async calculateWithEngine(
    demands: IDemand[],
    excludes: string[] = [],
    singleMakes: Array<{ id: number; number: number }> = []
  ): Promise<IEngineCalculationResult> {
    const version = ++this.calculationVersion
    this.context.reset()
    this.context.startTimer()

    if (!recipeAdapter.isLoaded()) {
      logger.error('[CalculatorService] RecipeAdapter not initialized')
      throw new Error('配方数据未初始化，请刷新页面重试')
    }

    try {
      const win = window as unknown as Record<string, unknown>
      const createCalculator = win.createCalculator as
        | ((options?: { maxDepth?: number; defaultAccType?: string; defaultAccValue?: string }) => {
            calculate: (
              demands: Array<{
                name: string
                num?: number
                item?: { name: string }
                number?: number
              }>,
              excludes: string[],
              singleMakes: Array<{ id: number; number: number }>
            ) => IEngineCalculationResult
          })
        | undefined

      if (typeof createCalculator !== 'function') {
        logger.warn('[CalculatorService] createCalculator not available, falling back to legacy')
        const legacyResult = await this.calculate(demands, excludes)
        const win = window as unknown as Record<string, unknown>
        return {
          success: true,
          xh_list: (win.xh_list || []) as Array<{
            name: string
            value: number
            value2?: number
            accTotal?: number
          }>,
          out_list: (win.out_list || []) as Array<{ name: string; value: number; value2?: number }>,
          xhMap: (win.xhMap || {}) as Record<string, { name: string; value: number }>,
          outMap: (win.outMap || {}) as Record<string, { name: string; value: number }>
        }
      }

      const calculator = createCalculator({
        maxDepth: 200,
        defaultAccType: (win.defaultAccType as string) || '增产剂Mk.Ⅰ',
        defaultAccValue: (win.defaultAccValue as string) || '无'
      })

      const formattedDemands = demands.map(d => ({
        name: d.name,
        num: d.num,
        item: { name: d.name },
        number: d.num
      }))

      const result = calculator.calculate(
        formattedDemands,
        excludes,
        singleMakes
      ) as IEngineCalculationResult

      if (result.success) {
        result.xh_list.forEach(item => {
          if (item.value && item.value > 0) {
            this.context.addConsumption(item.name, item.value)
          }
        })

        result.out_list.forEach(item => {
          if (item.value) {
            this.context.addProduction(item.name, item.value)
          }
        })
      }

      this.context.stopTimer()
      logger.log(
        `[CalculatorService] calculateWithEngine v${version} completed in ${this.context.elapsedTime.toFixed(2)}ms`
      )

      return result
    } catch (error) {
      this.context.stopTimer()
      logger.error(`[CalculatorService] calculateWithEngine v${version} failed:`, error)
      throw error
    }
  }

  /**
   * 使用 Web Worker 执行计算（非阻塞）
   *
   * 架构师注：
   * - 将计算密集型任务移至 Worker 线程
   * - 主线程不阻塞 UI 渲染
   * - 大规模配方计算响应时间 < 100ms
   *
   * @param demands 需求列表
   * @param excludes 排除列表
   * @param singleMakes 独立生产列表
   * @returns 计算结果
   */
  async calculateWithWorker(
    demands: IDemand[],
    excludes: string[] = [],
    singleMakes: Array<{ id: number; number: number }> = []
  ): Promise<IEngineCalculationResult> {
    const version = ++this.calculationVersion
    this.context.reset()
    this.context.startTimer()

    if (!recipeAdapter.isLoaded()) {
      logger.error('[CalculatorService] RecipeAdapter not initialized')
      throw new Error('配方数据未初始化，请刷新页面重试')
    }

    try {
      const { calculatorWorkerService } = await import('../workers/CalculatorWorkerService')

      if (!calculatorWorkerService.isAvailable()) {
        logger.warn('[CalculatorService] Worker not available, falling back to legacy engine')
        return this.calculateWithEngine(demands, excludes, singleMakes)
      }

      const result = await calculatorWorkerService.calculate({
        demands,
        excludes,
        singleMakes
      })

      if (result.success) {
        result.xh_list.forEach(item => {
          if (item.value && item.value > 0) {
            this.context.addConsumption(item.name, item.value)
          }
        })

        result.out_list.forEach(item => {
          if (item.value) {
            this.context.addProduction(item.name, item.value)
          }
        })
      }

      this.context.stopTimer()
      logger.log(
        `[CalculatorService] calculateWithWorker v${version} completed in ${result.elapsedMs.toFixed(2)}ms`
      )

      return {
        success: result.success,
        xh_list: result.xh_list,
        out_list: result.out_list,
        xhMap: result.xhMap,
        outMap: result.outMap
      }
    } catch (error) {
      this.context.stopTimer()
      logger.error(`[CalculatorService] calculateWithWorker v${version} failed:`, error)
      logger.warn('[CalculatorService] Falling back to legacy engine')
      return this.calculateWithEngine(demands, excludes, singleMakes)
    }
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
    const stats = this.context.getStats()
    return {
      consumptionCount: stats.consumptionCount,
      productionCount: stats.productionCount,
      resultCount: 0,
      elapsedTime: stats.elapsedTime
    }
  }
}

export const calculatorService = new CalculatorService()
