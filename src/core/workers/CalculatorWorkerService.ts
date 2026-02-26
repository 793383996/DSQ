/**
 * CalculatorWorkerService - 计算Worker服务
 *
 * 功能：
 * - 管理Web Worker生命周期
 * - 发送计算请求到Worker
 * - 处理Worker响应和超时
 * - 支持Worker初始化和复用
 * - 支持增量数据同步 (P5-2优化)
 *
 * 主要方法：
 * - calculate(options): 执行计算
 * - initWorker(): 初始化Worker
 * - syncData(): 同步数据到Worker
 * - terminate(): 终止Worker
 * - getStatus(): 获取Worker状态
 *
 * 上游调用：
 * - core/services/CalculatorService.ts: 计算服务
 *
 * 下游依赖：
 * - workers/calculator.worker.ts: Worker实现
 * - workers/types.ts: Worker类型定义
 *
 * Worker状态：
 * - idle: 空闲
 * - initializing: 初始化中
 * - ready: 就绪
 * - calculating: 计算中
 * - error: 错误
 *
 * 架构师注 (P5-2):
 * - Worker 保持数据副本，避免重复传输
 * - calculate 请求仅传输计算参数
 * - 使用校验和检测数据变更
 */
import type { IDemand } from '../types/recipe'
import type { IRawRecipe } from '../types/settings'
import type {
  IWorkerCalculateRequest,
  IWorkerCalculateResponse,
  IWorkerInitRequest,
  IWorkerInitResponse,
  IWorkerSyncRequest,
  IWorkerSyncResponse,
  IWorkerDataChecksum,
  WorkerResponse
} from './types'
import { logger } from '../../utils/logger'
import { recipeDataService } from '../services/RecipeDataService'
import { settingsAdapter } from '../adapters/SettingsAdapter'
import { calculationCacheService } from '../services/CalculationCacheService'
import { LRUCache, createHashKey } from '../utils/LRUCache'

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
  fromCache?: boolean
}

interface ICacheKeyData {
  demands: Array<{ name: string; num: number }>
  excludes: string[]
  selfAcc: boolean
  isAddSelfAccP: boolean
  singleMakes?: Array<{ id: number; number: number }>
  orbitalCollectorTCache?: Record<string, number>
  criticalPhotonTCache?: number
  criticalPhotonLensNCache?: number
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
  private workerChecksum: IWorkerDataChecksum | null = null
  private lastRecipes: IRawRecipe[] = []
  private lastSettings: Record<number, { accType?: string; accValue?: string; m?: string }> = {}
  private lastSettingsPf: Record<string, number> = {}
  private lastSettingsTime: Record<string, number> = {}
  private lastRecipeIndexByProduct: Record<string, number[]> = {}
  private resultCache: LRUCache<string, IWorkerResult> = new LRUCache(50, 5 * 60 * 1000)
  private cacheHits: number = 0
  private cacheMisses: number = 0

  constructor() {
    this.initWorker()
  }

  private computeChecksum(
    recipes: IRawRecipe[],
    settings: Record<number, { accType?: string; accValue?: string; m?: string }>,
    settingsPf: Record<string, number>,
    settingsTime: Record<string, number>
  ): IWorkerDataChecksum {
    return {
      recipeCount: recipes.length,
      settingsKeyCount: Object.keys(settings).length,
      settingsPfKeyCount: Object.keys(settingsPf).length,
      settingsTimeKeyCount: Object.keys(settingsTime).length
    }
  }

  private checksumEqual(a: IWorkerDataChecksum, b: IWorkerDataChecksum): boolean {
    return (
      a.recipeCount === b.recipeCount &&
      a.settingsKeyCount === b.settingsKeyCount &&
      a.settingsPfKeyCount === b.settingsPfKeyCount &&
      a.settingsTimeKeyCount === b.settingsTimeKeyCount
    )
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
      const initResponse = response as IWorkerInitResponse
      this.workerChecksum = initResponse.checksum
      if (this.initResolve) {
        this.initResolve()
        this.initResolve = null
        this.initReject = null
      }
      return
    }

    if (response.type === 'synced') {
      const syncResponse = response as IWorkerSyncResponse
      this.workerChecksum = syncResponse.checksum
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

    // P7-修复：错误时重置initPromise，允许后续重试
    if (this.initReject) {
      this.initReject(new Error(`Worker init failed: ${e.message}`))
      this.initResolve = null
      this.initReject = null
      this.initPromise = null
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
      logger.warn('[CalculatorWorkerService] Worker in error state, attempting reinit')
      this.terminate()
      this.initWorker()
      if (this.status === 'error') {
        throw new Error('Worker not available after reinit attempt')
      }
    }

    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    const newChecksum = this.computeChecksum(
      options.recipes,
      options.settings,
      options.settingsPf,
      options.settingsTime
    )

    if (
      this.status === 'ready' &&
      this.workerChecksum &&
      this.checksumEqual(this.workerChecksum, newChecksum)
    ) {
      return
    }

    if (
      this.status === 'ready' &&
      this.workerChecksum &&
      !this.checksumEqual(this.workerChecksum, newChecksum)
    ) {
      this.resultCache.clear()
      await this.syncData(options, newChecksum)
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.lastRecipes = options.recipes
    this.lastSettings = options.settings
    this.lastSettingsPf = options.settingsPf
    this.lastSettingsTime = options.settingsTime
    this.lastRecipeIndexByProduct = options.recipeIndexByProduct

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
        if (this.status !== 'ready' && this.initReject) {
          const error = new Error('Worker init timeout')
          reject(error)
          this.initResolve = null
          this.initReject = null
          this.initPromise = null
          this.status = 'error'
          logger.error('[CalculatorWorkerService] Worker init timeout, status reset to error')
        }
      }, 5000)
    })

    try {
      await this.initPromise
    } catch (e) {
      this.initPromise = null
      this.initResolve = null
      this.initReject = null
      throw e
    }
  }

  private async syncData(
    options: {
      recipes: IRawRecipe[]
      settings: Record<number, { accType?: string; accValue?: string; m?: string }>
      settingsPf: Record<string, number>
      settingsTime: Record<string, number>
      recipeIndexByProduct: Record<string, number[]>
    },
    checksum: IWorkerDataChecksum
  ): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    const syncRequest: IWorkerSyncRequest = {
      type: 'sync',
      checksum
    }

    if (options.recipes !== this.lastRecipes) {
      syncRequest.recipes = options.recipes
      this.lastRecipes = options.recipes
    }
    if (options.settings !== this.lastSettings) {
      syncRequest.settings = options.settings
      this.lastSettings = options.settings
    }
    if (options.settingsPf !== this.lastSettingsPf) {
      syncRequest.settingsPf = options.settingsPf
      this.lastSettingsPf = options.settingsPf
    }
    if (options.settingsTime !== this.lastSettingsTime) {
      syncRequest.settingsTime = options.settingsTime
      this.lastSettingsTime = options.settingsTime
    }
    if (options.recipeIndexByProduct !== this.lastRecipeIndexByProduct) {
      syncRequest.recipeIndexByProduct = options.recipeIndexByProduct
      this.lastRecipeIndexByProduct = options.recipeIndexByProduct
    }

    this.worker.postMessage(syncRequest)
  }

  async calculate(options: IWorkerCalculateOptions): Promise<IWorkerResult> {
    if (this.status === 'error') {
      throw new Error('Worker not available')
    }

    if (!this.worker) {
      throw new Error('Worker not initialized')
    }

    await recipeDataService.initialize()
    const recipes = recipeDataService.getRecipes()
    const recipeIndexByProduct = recipeDataService.getIndexByProduct()
    const settings = settingsAdapter.getRecipeSettings()
    const settingsPf = settingsAdapter.getProductivitySettings()
    const settingsTime = settingsAdapter.getSpeedSettings()

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

    const orbitalCollectorTCache = this.calculateOrbitalCollectorTCache(recipes, settingsTime)

    const defaultAccType = settingsAdapter.getDefaultAccType()
    const defaultAccValue = settingsAdapter.getDefaultAccValue()
    const criticalPhotonCache = this.calculateCriticalPhotonCache(
      settings,
      settingsTime,
      settingsPf,
      recipes,
      recipeIndexByProduct,
      defaultAccType,
      defaultAccValue
    )

    calculationCacheService.importFromWorker({
      orbitalCollectorTCache,
      criticalPhotonTCache: criticalPhotonCache.t,
      criticalPhotonLensNCache: criticalPhotonCache.lensN,
      timestamp: Date.now()
    })

    const selfAcc = options.selfAcc ?? settingsAdapter.getSelfAcc()
    const isAddSelfAccP = options.isAddSelfAccP ?? settingsAdapter.getIsAddSelfAccP()

    const cacheKeyData: ICacheKeyData = {
      demands: options.demands.map(d => ({ name: d.name, num: d.num })),
      excludes: options.excludes,
      selfAcc,
      isAddSelfAccP,
      singleMakes: options.singleMakes,
      orbitalCollectorTCache,
      criticalPhotonTCache: criticalPhotonCache.t ?? undefined,
      criticalPhotonLensNCache: criticalPhotonCache.lensN ?? undefined
    }
    const cacheKey = createHashKey(cacheKeyData)

    const cachedResult = this.resultCache.get(cacheKey)
    if (cachedResult) {
      this.cacheHits++
      return { ...cachedResult, fromCache: true }
    }

    this.cacheMisses++

    return new Promise((resolve, reject) => {
      this.pendingResolve = result => {
        this.resultCache.set(cacheKey, result)
        resolve(result)
      }
      this.pendingReject = reject
      this.status = 'calculating'

      const id = ++this.requestId
      const startTime = performance.now()

      const request: IWorkerCalculateRequest = {
        type: 'calculate',
        id,
        demands: options.demands.map(d => ({ name: d.name, num: d.num })),
        excludes: options.excludes,
        defaultAccType,
        defaultAccValue,
        singleMakes: options.singleMakes,
        selfAcc,
        isAddSelfAccP,
        orbitalCollectorTCache,
        criticalPhotonTCache: criticalPhotonCache.t ?? undefined,
        criticalPhotonLensNCache: criticalPhotonCache.lensN ?? undefined
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
  // P9-修复：speed1_3/speed1_4定义与老代码data.js完全对齐
  // 老代码：speed1_3 = st['轨道采集器(巨冰)_氢'], speed1_4 = st['轨道采集器(巨冰)_可燃冰']
  private calculateOrbitalCollectorTCache(
    recipes: IRawRecipe[],
    settingsTime: Record<string, number>
  ): Record<string, number> {
    const st = settingsTime || {}
    const speed1_1 = st['轨道采集器(气态)_氢'] || 1
    const speed1_2 = st['轨道采集器(气态)_重氢'] || 0.02
    const speed1_3 = st['轨道采集器(巨冰)_氢'] || 0.5
    const speed1_4 = st['轨道采集器(巨冰)_可燃冰'] || 0.5
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

  // P10-1修复：计算临界光子缓存值，与UpdateAllService.fixCriticalPhotonSpeed逻辑对齐
  // 老代码Scripts/data.js中的fixGzSpeed函数
  private calculateCriticalPhotonCache(
    settings: Record<number, { accType?: string; accValue?: string }>,
    settingsTime: Record<string, number>,
    settingsPf: Record<string, number>,
    recipes: IRawRecipe[],
    recipeIndexByProduct: Record<string, number[]>,
    defaultAccType: string,
    defaultAccValue: string
  ): { t: number | null; lensN: number | null } {
    // 查找临界光子配方
    const indices = recipeIndexByProduct['临界光子']
    if (!indices || indices.length === 0) {
      return { t: null, lensN: null }
    }

    // 检查用户选择的配方
    const pf = settingsPf['临界光子']
    let criticalPhotonRecipe: IRawRecipe | null = null
    if (pf !== undefined) {
      criticalPhotonRecipe = recipes[pf] || null
    } else {
      criticalPhotonRecipe = recipes[indices[0]] || null
    }

    if (!criticalPhotonRecipe || !criticalPhotonRecipe.m) {
      return { t: null, lensN: null }
    }

    const mArray = Array.isArray(criticalPhotonRecipe.m) ? criticalPhotonRecipe.m : []
    const rayReceiver = mArray.find(m => m.name === '射线接收塔')
    if (!rayReceiver) {
      return { t: null, lensN: null }
    }

    // 检查是否有引力透镜输入
    const lensInput = criticalPhotonRecipe.q?.find(q => q.name === '引力透镜')
    if (!lensInput) {
      return { t: null, lensN: null }
    }

    // 获取增产剂设置
    const recipeSettings =
      criticalPhotonRecipe.id !== undefined ? settings[criticalPhotonRecipe.id] : undefined
    const accType = recipeSettings?.accType || defaultAccType
    const accValue = recipeSettings?.accValue || defaultAccValue

    // P14-1修复：支持manualGzSpeed手动输入临界光子速度
    // 老代码：if (manualGzSpeed) { fixedGzSpeed = parseFloat($("#gzSpeed").val()); }
    // P8-修复：键名对齐，使用'射线接收塔'而非'临界光子_手动速度'
    // bridge.ts中legacyUpdateSpeedSettings将criticalPhotonSpeed写入'射线接收塔'
    const gzSpeedSetting = settingsTime['射线接收塔']
    let fixedGzSpeed: number
    if (gzSpeedSetting !== undefined && gzSpeedSetting > 0) {
      // P14-1修复：用户手动输入临界光子每分钟产量
      fixedGzSpeed = gzSpeedSetting
    } else {
      // 根据增产剂设置计算
      if (accValue === '加速') {
        switch (accType) {
          case '增产剂Mk.Ⅰ':
            fixedGzSpeed = 15
            break
          case '增产剂Mk.Ⅱ':
            fixedGzSpeed = 18
            break
          case '增产剂Mk.Ⅲ':
            fixedGzSpeed = 24
            break
          default:
            fixedGzSpeed = 12
        }
      } else {
        fixedGzSpeed = 12
      }
    }

    // P15-1修复：老代码逻辑 this.t = this.q && this.q.length ? 60 / fixedGzSpeed : 10;
    // 无引力透镜输入时t值默认为10
    return {
      t: 60 / fixedGzSpeed,
      lensN: parseFloat((0.1 / fixedGzSpeed).toFixed(6))
    }
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
    this.workerChecksum = null
    this.lastRecipes = []
    this.lastSettings = {}
    this.lastSettingsPf = {}
    this.lastSettingsTime = {}
    this.lastRecipeIndexByProduct = {}
    this.resultCache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
  }

  clearCache(): void {
    this.resultCache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
  }

  getCacheStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses
    return {
      size: this.resultCache.size(),
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0
    }
  }
}

export const calculatorWorkerService = new CalculatorWorkerService()
