import type { IRecipe, IDemand } from '../types/recipe'
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
    recipes: IRecipe[]
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

    return new Promise((resolve, reject) => {
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
        }
      }, 5000)
    })
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
    const recipes = (win.data || []) as IRecipe[]
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
        singleMakes: options.singleMakes
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
  }
}

export const calculatorWorkerService = new CalculatorWorkerService()
