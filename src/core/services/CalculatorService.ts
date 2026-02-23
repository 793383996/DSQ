/**
 * CalculatorService - 计算服务
 *
 * 功能：
 * - 封装update_all计算逻辑
 * - 支持状态快照和验证，防止异步计算期间状态被修改
 * - 支持Web Worker非阻塞计算
 * - 提供计算上下文和统计信息
 *
 * 主要方法：
 * - calculate(demands, excludes): 执行计算（简化版本）
 * - calculateWithOptions(demands, options): 执行计算（带状态同步控制）
 * - calculateWithEngine(demands, excludes, singleMakes): 使用新计算引擎
 * - calculateWithWorker(demands, excludes, singleMakes, options): 使用Worker执行计算
 * - getConsumption(): 获取消耗列表
 * - getProduction(): 获取产出列表
 * - getStats(): 获取计算统计信息
 *
 * 上游调用：
 * - App.vue: runCalculation()
 * - core/bridge.ts: runCalculation()
 *
 * 下游依赖：
 * - core/services/CalculationContext.ts: 计算上下文
 * - core/services/UpdateAllService.ts: 更新服务
 * - core/adapters/RecipeAdapter.ts: 配方适配器
 * - core/adapters/SettingsAdapter.ts: 设置适配器
 * - core/workers/CalculatorWorkerService.ts: Worker服务
 *
 * 架构师注：
 * - 核心算法保持不变，仅做外围包装
 * - update_all 函数视为黑盒，禁止修改内部递归逻辑
 * - 所有计算结果通过 CalculationContext 封装
 * - 输入输出格式与原 bridge.runCalculation 完全一致
 * - 已移除对 window.data 的依赖，使用 RecipeDataService
 */
import type { IDemand, ILegacyCalculationResult, ILegacyApp } from '../types/recipe'
import type { LegacyWindow } from '../types/legacy'
import { CalculationContext } from './CalculationContext'
import { recipeAdapter } from '../adapters/RecipeAdapter'
import { settingsAdapter } from '../adapters/SettingsAdapter'
import { updateAllService } from './UpdateAllService'
import { logger } from '../../utils/logger'

export interface CalculationOptions {
  excludes?: string[]
  onStateSnapshot?: () => IStateSnapshot
  validateState?: (snapshot: IStateSnapshot) => boolean
  throwOnStateChange?: boolean
  useNewEngine?: boolean
  selfAcc?: boolean
  isAddSelfAccP?: boolean
  // P1-2修复：扩展machineSettings类型，包含设备类型设置
  machineSettings?: {
    modeIn?: string
    furnace?: string
    chemical?: string
    research?: string
    accType?: string
    accValue?: string
    hideSource?: boolean
    selfAcc?: boolean
    isAddSelfAccP?: boolean
  }
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
   * 4. 使用 UpdateAllService 执行计算
   * 5. 验证状态一致性（如果提供了 validateState）
   * 6. 填充 CalculationContext
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

    if (!recipeAdapter.isLoaded()) {
      await recipeAdapter.initialize()
    }

    const excludes = options.excludes || []

    try {
      const settings = settingsAdapter.getAllRecipeSettings()
      const settingsTime = settingsAdapter.getAllSpeedSettings()
      const settingsPf = settingsAdapter.getAllProductivitySettings()
      const win = window as unknown as LegacyWindow

      const calcResult = await updateAllService.updateAll({
        demands,
        excludes,
        settings,
        settingsTime,
        settingsPf,
        defaultAccType: win.defaultAccType || '增产剂Mk.Ⅰ',
        defaultAccValue: win.defaultAccValue || '无',
        hideSource: win.hideSource?.checked ?? false,
        pointLength: parseInt(win.pointLength?.value || '3'),
        selfAcc: options.selfAcc ?? win.selfAcc?.checked ?? false,
        isAddSelfAccP: options.isAddSelfAccP ?? win.isAddSelfAccP?.checked ?? false
      })

      if (snapshot && options.validateState) {
        if (!options.validateState(snapshot)) {
          const msg = `[CalculatorService] State changed during calculation (version ${version}), result may be stale`
          logger.warn(msg)
          if (options.throwOnStateChange) {
            throw new StateChangedDuringCalculationError(version)
          }
        }
      }

      const result: ILegacyCalculationResult = {
        items: calcResult.items as unknown as ILegacyCalculationResult['items'],
        items2: calcResult.items2 as unknown as ILegacyCalculationResult['items2'],
        items0: calcResult.items0 as unknown as ILegacyCalculationResult['items0'],
        total: calcResult.total.map(t => ({
          name: t.name,
          number: t.value,
          energy: t.energy,
          space: t.space
        })),
        totalEnergy: calcResult.totalEnergy,
        totalSpace: calcResult.totalSpace,
        totalAcc: calcResult.totalAcc,
        xqs: calcResult.xqs.map(x => ({ name: x.name, num: x.number, item: x.item })),
        ig_names: calcResult.igNames
      }

      const state = updateAllService.getState()
      if (state) {
        state.xhList.forEach(item => {
          if (item.value && item.value > 0) {
            this.context.addConsumption(item.name, item.value)
          }
        })
        state.outList.forEach(item => {
          if (item.value) {
            this.context.addProduction(item.name, item.value)
          }
        })
      }

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
   * 使用新计算引擎执行计算
   *
   * 架构师注：
   * - 此方法已迁移到使用 UpdateAllService
   * - 与 calculate 方法行为一致，返回格式略有不同
   * - 向后兼容遗留调用方式
   *
   * @param demands 需求列表
   * @param excludes 排除列表
   * @param singleMakes 独立生产列表（暂未实现）
   * @returns 计算结果
   */
  async calculateWithEngine(
    demands: IDemand[],
    excludes: string[] = [],
    _singleMakes: Array<{ id: number; number: number }> = []
  ): Promise<IEngineCalculationResult> {
    const version = ++this.calculationVersion
    this.context.reset()
    this.context.startTimer()

    if (!recipeAdapter.isLoaded()) {
      await recipeAdapter.initialize()
    }

    try {
      const settings = settingsAdapter.getAllRecipeSettings()
      const settingsTime = settingsAdapter.getAllSpeedSettings()
      const settingsPf = settingsAdapter.getAllProductivitySettings()
      const win = window as unknown as LegacyWindow

      const calcResult = await updateAllService.updateAll({
        demands,
        excludes,
        settings,
        settingsTime,
        settingsPf,
        defaultAccType: win.defaultAccType || '增产剂Mk.Ⅰ',
        defaultAccValue: win.defaultAccValue || '无',
        hideSource: win.hideSource?.checked ?? false,
        pointLength: parseInt(win.pointLength?.value || '3')
      })

      const state = updateAllService.getState()
      const result: IEngineCalculationResult = {
        success: true,
        xh_list: state?.xhList || [],
        out_list: state?.outList || [],
        xhMap: state?.xhMap || {},
        outMap: state?.outMap || {}
      }

      this.context.stopTimer()
      logger.log(
        `[CalculatorService] calculateWithEngine v${version} completed in ${this.context.elapsedTime.toFixed(2)}ms`
      )

      return result
    } catch (error) {
      this.context.stopTimer()
      logger.error(`[CalculatorService] calculateWithEngine failed:`, error)
      throw error
    }
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
    singleMakes: Array<{ id: number; number: number }> = [],
    // P1-2修复：扩展options类型以支持完整的machineSettings
    options: {
      selfAcc?: boolean
      isAddSelfAccP?: boolean
      machineSettings?: CalculationOptions['machineSettings']
    } = {}
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
        singleMakes,
        selfAcc: options.selfAcc,
        isAddSelfAccP: options.isAddSelfAccP
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
