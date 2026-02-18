import type { IDemand } from '../types/recipe'
import type { IRawRecipe } from '../types/settings'
import type {
  IWorkerCalculateRequest,
  IWorkerCalculateResponse,
  IWorkerInitRequest,
  IWorkerInitResponse,
  WorkerResponse
} from './types'
import { logger } from '../../utils/logger'

export interface IWorkerCalculateOptions {
  demands: IDemand[]
  excludes: string[]
  singleMakes?: Array<{ id: number; number: number }>
  timeout?: number
  selfAcc?: boolean
  isAddSelfAccP?: boolean
}

export interface IWorkerResult {
  success: boolean
  xh_list: Array<{ name: string; value: number; value2?: number; accTotal?: number }>
  out_list: Array<{ name: string; value: number }>
  xhMap: Record<string, { name: string; value: number }>
  outMap: Record<string, { name: string; value: number }>
  elapsedMs: number
}

type WorkerStatus = 'idle' | 'initializing' | 'ready' | 'calculating' | 'error'

export class CalculatorWorkerService {
  private worker: Worker | null = null
  private status: WorkerStatus = 'idle'
  private requestId: number = 0
  private pendingResolve: ((result: IWorkerResult) => void) | null = null
  private pendingReject: ((error: Error) => void) | null = null
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private initResolve: (() => void) | null = null
  private initReject: ((error: Error) => void) | null = null
  private initPromise: Promise<void> | null = null
  private lastInitData: string = ''

  constructor() {
    this.initWorker()
  }

  private initWorker(): void {
    if (typeof Worker === 'undefined') {
      this.status = 'error'
      logger.warn('[CalculatorWorkerService] Web Worker not supported')
      return
    }

    try {
      this.worker = new Worker(new URL('./calculator.worker.ts', import.meta.url), {
        type: 'module'
      })
      this.status = 'initializing'

      this.worker.onmessage = this.handleMessage.bind(this)
      this.worker.onerror = this.handleError.bind(this)
    } catch (e) {
      this.status = 'error'
      logger.error('[CalculatorWorkerService] Failed to create worker:', e)
    }
  }

  private handleMessage(e: MessageEvent<WorkerResponse>): void {
    const response = e.data

    if (response.type === 'ready') {
      this.status = 'ready'
      logger.log(
        `[CalculatorWorkerService] Worker ready with ${(response as IWorkerInitResponse).recipeCount} recipes`
      )
      if (this.initResolve) {
        this.initResolve()
        this.initResolve = null
        this.initReject = null
      }
      return
    }

    if (response.type === 'result' || response.type === 'error') {
      this.status = 'ready'
      this.clearTimeout()

      if (this.pendingResolve && this.pendingReject) {
        const calcResponse = response as IWorkerCalculateResponse
        if (calcResponse.type === 'result' && calcResponse.result) {
          this.pendingResolve({
            success: calcResponse.result.success,
            xh_list: calcResponse.result.xh_list,
            out_list: calcResponse.result.out_list,
            xhMap: calcResponse.result.xhMap,
            outMap: calcResponse.result.outMap,
            elapsedMs: 0
          })
        } else {
          this.pendingReject(new Error(calcResponse.error || 'Calculation failed'))
        }
        this.pendingResolve = null
        this.pendingReject = null
      }
    }
  }

  private handleError(e: ErrorEvent): void {
    this.status = 'error'
    this.clearTimeout()
    logger.error('[CalculatorWorkerService] Worker error:', e.message)

    if (this.initReject) {
      this.initReject(new Error(`Worker init failed: ${e.message}`))
      this.initResolve = null
      this.initReject = null
    }

    if (this.pendingReject) {
      this.pendingReject(new Error(`Worker error: ${e.message}`))
      this.pendingResolve = null
      this.pendingReject = null
    }
  }

  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  async init(options: {
    recipes: IRawRecipe[]
    settings: Record<number, { accType?: string; accValue?: string; m?: string }>
    settingsPf: Record<string, number>
    settingsTime: Record<string, number>
    recipeIndexByProduct: Record<string, number[]>
  }): Promise<void> {
    if (this.status === 'error') {
      throw new Error('Worker not available')
    }

    if (this.status === 'ready') {
      return
    }

    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    const initDataKey = JSON.stringify({
      recipeCount: options.recipes.length,
      settingsPfKeys: Object.keys(options.settingsPf).length,
      settingsTimeKeys: Object.keys(options.settingsTime).length
    })

    if (this.lastInitData === initDataKey && this.initPromise) {
      return this.initPromise
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve, reject) => {
      this.initResolve = resolve
      this.initReject = reject

      const request: IWorkerInitRequest = {
        type: 'init',
        recipes: options.recipes,
        settings: options.settings,
        settingsPf: options.settingsPf,
        settingsTime: options.settingsTime,
        recipeIndexByProduct: options.recipeIndexByProduct
      }

      this.worker!.postMessage(request)

      setTimeout(() => {
        if (this.status !== 'ready') {
          reject(new Error('Worker init timeout'))
          this.initResolve = null
          this.initReject = null
          this.initPromise = null
        }
      }, 5000)
    })

    try {
      await this.initPromise
      this.lastInitData = initDataKey
    } catch (e) {
      this.initPromise = null
      throw e
    }
  }

  async calculate(options: IWorkerCalculateOptions): Promise<IWorkerResult> {
    if (this.status === 'error') {
      throw new Error('Worker not available')
    }

    if (this.status !== 'ready') {
      throw new Error(`Worker not ready (status: ${this.status})`)
    }

    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    const win = window as unknown as Record<string, unknown>
    const recipes = (win.data || []) as IRawRecipe[]
    const settings = (win.settings || {}) as Record<
      number,
      { accType?: string; accValue?: string; m?: string }
    >
    const settingsPf = (win.settings_pf || {}) as Record<string, number>
    const settingsTime = (win.settings_time || {}) as Record<string, number>
    const recipeIndexByProduct = (win.recipeIndexByProduct || {}) as Record<string, number[]>

    if (recipes.length === 0) {
      throw new Error('Recipes not loaded')
    }

    await this.init({
      recipes,
      settings,
      settingsPf,
      settingsTime,
      recipeIndexByProduct
    })

    // P6-4修复：计算轨道采集器t值缓存，与UpdateAllService.doSpeed1对齐
    const orbitalCollectorTCache = this.calculateOrbitalCollectorTCache(recipes, settingsTime)

    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve
      this.pendingReject = reject
      this.status = 'calculating'

      const id = ++this.requestId
      const startTime = performance.now()

      const request: IWorkerCalculateRequest = {
        type: 'calculate',
        id,
        demands: options.demands.map(d => ({ name: d.name, num: d.num })),
        excludes: options.excludes,
        recipes,
        settings,
        settingsPf,
        settingsTime,
        recipeIndexByProduct,
        defaultAccType: (win.defaultAccType as string) || '增产剂Mk.Ⅰ',
        defaultAccValue: (win.defaultAccValue as string) || '无',
        singleMakes: options.singleMakes,
        selfAcc: options.selfAcc ?? (win.selfAcc as { checked: boolean })?.checked ?? false,
        isAddSelfAccP:
          options.isAddSelfAccP ?? (win.isAddSelfAccP as { checked: boolean })?.checked ?? false,
        // P6-4修复：传递轨道采集器t值缓存
        orbitalCollectorTCache
      }

      this.worker!.postMessage(request)

      const timeout = options.timeout || 30000
      this.timeoutId = setTimeout(() => {
        this.status = 'error'
        reject(new Error('Calculation timeout'))
        this.pendingResolve = null
        this.pendingReject = null
      }, timeout)

      const originalResolve = this.pendingResolve
      this.pendingResolve = result => {
        result.elapsedMs = performance.now() - startTime
        originalResolve(result)
      }
    })
  }

  // P6-4修复：计算轨道采集器t值缓存，与UpdateAllService.doSpeed1逻辑对齐
  // P0-4修复：键名与老代码data.js doSpeed1函数完全对齐
  // 老代码HTML: speed1_1 = 氢(气态) 默认1, speed1_2 = 重氢 默认0.02
  // 老代码HTML: speed1_3 = 可燃冰 默认0.5, speed1_4 = 氢(巨冰) 默认0.5
  // 架构师注：老代码变量名speed1_3对应可燃冰，speed1_4对应氢(巨冰)
  // 新代码键名需正确映射：轨道采集器(巨冰)_可燃冰 → speed1_3，轨道采集器(巨冰)_氢 → speed1_4
  private calculateOrbitalCollectorTCache(
    recipes: IRawRecipe[],
    settingsTime: Record<string, number>
  ): Record<string, number> {
    const st = settingsTime || {}
    const speed1_1 = st['轨道采集器(气态)_氢'] || 1
    const speed1_2 = st['轨道采集器(气态)_重氢'] || 0.02
    const speed1_3 = st['轨道采集器(巨冰)_可燃冰'] || 0.5
    const speed1_4 = st['轨道采集器(巨冰)_氢'] || 0.5
    const ore = st['采矿机_效率'] || 100

    const getSum = (value1: number, value2: number, p1: number, p2: number): number => {
      let sum = 60 * value1 * 0.01 * ore * 8
      const per = (value1 * p1) / (value1 * p1 + value2 * p2)
      sum -= (60 * 30 * per) / p1
      return sum
    }

    const cache: Record<string, number> = {}

    for (const recipe of recipes) {
      if (
        recipe.s &&
        (recipe.s[0]?.name === '氢' ||
          recipe.s[0]?.name === '重氢' ||
          recipe.s[0]?.name === '可燃冰')
      ) {
        if (recipe.m && Array.isArray(recipe.m)) {
          for (let i = 0; i < recipe.m.length; i++) {
            const cacheKey = `${recipe.id}-${recipe.s[0].name}`
            if (recipe.m[i].name === '轨道采集器(气态)') {
              if (recipe.s[0].name === '氢') {
                cache[cacheKey] = 1 / (getSum(speed1_1, speed1_2, 8, 8) / 60)
              } else if (recipe.s[0].name === '重氢') {
                cache[cacheKey] = 1 / (getSum(speed1_2, speed1_1, 8, 8) / 60)
              }
            }
            if (recipe.m[i].name === '轨道采集器(巨冰)') {
              if (recipe.s[0].name === '氢') {
                cache[cacheKey] = 1 / (getSum(speed1_4, speed1_3, 8, 4.8) / 60)
              } else if (recipe.s[0].name === '可燃冰') {
                cache[cacheKey] = 1 / (getSum(speed1_3, speed1_4, 4.8, 8) / 60)
              }
            }
          }
        }
      }
    }

    return cache
  }

  getStatus(): WorkerStatus {
    return this.status
  }

  isAvailable(): boolean {
    return this.status === 'ready' || this.status === 'idle' || this.status === 'initializing'
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.status = 'idle'
    this.clearTimeout()
    this.initPromise = null
    this.lastInitData = ''
  }
}

export const calculatorWorkerService = new CalculatorWorkerService()
