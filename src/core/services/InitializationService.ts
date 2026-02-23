/**
 * InitializationService - 初始化状态机服务
 *
 * 功能：
 * - 管理应用初始化流程
 * - 提供初始化状态追踪
 * - 支持依赖等待和超时处理
 * - 提供初始化完成通知
 * - 提供计算就绪检查（P1修复）
 *
 * 初始化状态：
 * - IDLE: 初始状态
 * - LOADING_RECIPES: 加载配方数据
 * - LOADING_ICONS: 加载图标数据
 * - BUILDING_INDEX: 构建索引
 * - SYNCING_LEGACY: 同步遗留代码
 * - READY: 就绪
 * - ERROR: 错误
 *
 * 上游调用：
 * - main.ts: 应用入口
 * - App.vue: 主应用组件
 *
 * 下游依赖：
 * - core/services/RecipeDataService.ts: 配方数据服务
 * - core/services/IconService.ts: 图标服务
 * - core/adapters/RecipeAdapter.ts: 配方适配器
 *
 * 架构师注：
 * - 使用状态机模式管理初始化流程
 * - 支持异步初始化和依赖等待
 * - 提供详细的初始化日志和错误处理
 * - P1修复：新增 isCalculationReady() 方法，确保计算前数据已就绪
 */
import { logger } from '../../utils/logger'
import { APP_CONFIG } from '../config/app.config'

export enum InitState {
  IDLE = 'IDLE',
  LOADING_RECIPES = 'LOADING_RECIPES',
  LOADING_ICONS = 'LOADING_ICONS',
  BUILDING_INDEX = 'BUILDING_INDEX',
  SYNCING_LEGACY = 'SYNCING_LEGACY',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface IInitProgress {
  state: InitState
  message: string
  progress: number
  timestamp: number
}

export interface IInitError {
  state: InitState
  error: Error
  timestamp: number
}

type InitStateListener = (progress: IInitProgress) => void
type InitErrorListener = (error: IInitError) => void

class InitializationService {
  private currentState: InitState = InitState.IDLE
  private progress: number = 0
  private message: string = ''
  private startTime: number = 0
  private stateListeners: Set<InitStateListener> = new Set()
  private errorListeners: Set<InitErrorListener> = new Set()
  private readyPromise: Promise<void> | null = null
  private readyResolve: (() => void) | null = null
  private error: Error | null = null
  private skipIconsLoading: boolean = false

  getState(): InitState {
    return this.currentState
  }

  getProgress(): IInitProgress {
    return {
      state: this.currentState,
      message: this.message,
      progress: this.progress,
      timestamp: Date.now()
    }
  }

  getError(): Error | null {
    return this.error
  }

  isReady(): boolean {
    return this.currentState === InitState.READY
  }

  isError(): boolean {
    return this.currentState === InitState.ERROR
  }

  private setState(newState: InitState, message: string, progressIncrement: number = 0): void {
    const oldState = this.currentState
    this.currentState = newState
    this.message = message
    this.progress = Math.min(100, this.progress + progressIncrement)

    logger.log(
      `[InitializationService] State: ${oldState} -> ${newState} (${this.progress}%) - ${message}`
    )

    this.notifyStateListeners()
  }

  private notifyStateListeners(): void {
    const progress = this.getProgress()
    this.stateListeners.forEach(listener => {
      try {
        listener(progress)
      } catch (e) {
        logger.warn('[InitializationService] State listener error:', e)
      }
    })
  }

  private notifyErrorListeners(error: Error): void {
    const initError: IInitError = {
      state: this.currentState,
      error,
      timestamp: Date.now()
    }
    this.errorListeners.forEach(listener => {
      try {
        listener(initError)
      } catch (e) {
        logger.warn('[InitializationService] Error listener error:', e)
      }
    })
  }

  subscribeState(listener: InitStateListener): () => void {
    this.stateListeners.add(listener)
    listener(this.getProgress())
    return () => this.stateListeners.delete(listener)
  }

  subscribeError(listener: InitErrorListener): () => void {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  async waitReady(timeout: number = APP_CONFIG.TIMEOUTS.INITIALIZATION): Promise<void> {
    if (this.currentState === InitState.READY) {
      return Promise.resolve()
    }

    if (this.currentState === InitState.ERROR) {
      return Promise.reject(this.error || new Error('Initialization failed'))
    }

    if (this.readyPromise) {
      return this.readyPromise
    }

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve

      const timeoutId = setTimeout(() => {
        if (this.currentState !== InitState.READY) {
          const error = new Error(`Initialization timeout at state: ${this.currentState}`)
          this.setError(error)
          reject(error)
        }
      }, timeout)

      const unsubscribe = this.subscribeState(progress => {
        if (progress.state === InitState.READY) {
          clearTimeout(timeoutId)
          unsubscribe()
          resolve()
        } else if (progress.state === InitState.ERROR) {
          clearTimeout(timeoutId)
          unsubscribe()
          reject(this.error || new Error('Initialization failed'))
        }
      })
    })

    return this.readyPromise
  }

  startInitialization(): void {
    if (this.currentState !== InitState.IDLE) {
      logger.warn('[InitializationService] Already initialized or in progress')
      return
    }

    this.startTime = Date.now()
    this.setState(InitState.LOADING_RECIPES, 'Loading recipe data...', 10)
  }

  setRecipesLoaded(): void {
    if (this.skipIconsLoading) {
      this.setState(InitState.BUILDING_INDEX, 'Building recipe index...', 40)
    } else {
      this.setState(InitState.LOADING_ICONS, 'Loading icon data...', 20)
    }
  }

  setIconsLoaded(): void {
    this.setState(InitState.BUILDING_INDEX, 'Building recipe index...', 30)
  }

  setIndexBuilt(): void {
    this.setState(InitState.SYNCING_LEGACY, 'Syncing with legacy code...', 20)
  }

  setLegacySynced(): void {
    this.setState(InitState.READY, 'Initialization complete', 20)

    const elapsed = Date.now() - this.startTime
    logger.log(`[InitializationService] Initialization completed in ${elapsed}ms`)

    if (this.readyResolve) {
      this.readyResolve()
      this.readyResolve = null
    }
  }

  setSkipIconsLoading(skip: boolean): void {
    this.skipIconsLoading = skip
  }

  setError(error: Error): void {
    this.error = error
    this.setState(InitState.ERROR, `Error: ${error.message}`, 0)
    this.notifyErrorListeners(error)
  }

  reset(): void {
    this.currentState = InitState.IDLE
    this.progress = 0
    this.message = ''
    this.startTime = 0
    this.error = null
    this.readyPromise = null
    this.readyResolve = null
    this.skipIconsLoading = false
    this.stateListeners.clear()
    this.errorListeners.clear()
    logger.log('[InitializationService] Reset to IDLE state')
  }

  getElapsedTime(): number {
    if (this.startTime === 0) return 0
    return Date.now() - this.startTime
  }

  isCalculationReady(): { ready: boolean; reason?: string } {
    if (this.currentState !== InitState.READY) {
      return { ready: false, reason: `Initialization not complete: ${this.currentState}` }
    }

    const win = window as any

    if (typeof win.find !== 'function') {
      return { ready: false, reason: 'Recipe find function not available' }
    }

    if (!Array.isArray(win.data) || win.data.length === 0) {
      return { ready: false, reason: 'Recipe data not loaded' }
    }

    if (!win.recipeIndexByProduct || Object.keys(win.recipeIndexByProduct).length === 0) {
      return { ready: false, reason: 'Recipe index not built' }
    }

    return { ready: true }
  }

  async waitForCalculationReady(
    timeout: number = APP_CONFIG.TIMEOUTS.CALCULATION_READY
  ): Promise<{ ready: boolean; reason?: string }> {
    const checkReady = () => this.isCalculationReady()

    const result = checkReady()
    if (result.ready) {
      return result
    }

    return new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        resolve({ ready: false, reason: `Timeout waiting for calculation ready: ${result.reason}` })
      }, timeout)

      const checkInterval = setInterval(() => {
        const currentResult = checkReady()
        if (currentResult.ready) {
          clearTimeout(timeoutId)
          clearInterval(checkInterval)
          resolve(currentResult)
        }
      }, 50)

      const unsubscribe = this.subscribeState(progress => {
        if (progress.state === InitState.READY) {
          setTimeout(() => {
            const finalResult = checkReady()
            clearTimeout(timeoutId)
            clearInterval(checkInterval)
            unsubscribe()
            resolve(finalResult)
          }, 100)
        } else if (progress.state === InitState.ERROR) {
          clearTimeout(timeoutId)
          clearInterval(checkInterval)
          unsubscribe()
          resolve({ ready: false, reason: 'Initialization failed with error' })
        }
      })
    })
  }
}

export const initializationService = new InitializationService()
