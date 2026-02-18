/**
 * ErrorReporter - 错误上报工具
 *
 * 功能：
 * - 捕获全局JavaScript错误
 * - 捕获未处理的Promise拒绝
 * - 捕获Vue组件错误
 * - 记录用户行为面包屑
 * - 支持错误采样和上报
 *
 * 主要方法：
 * - init(config): 初始化错误上报器
 * - captureError(error, context): 捕获错误
 * - addBreadcrumb(breadcrumb): 添加面包屑
 * - setUser(user): 设置用户信息
 *
 * 上游调用：
 * - main.ts: 应用入口
 * - App.vue: 主应用组件
 *
 * 错误类型：
 * - error: JavaScript错误
 * - unhandledrejection: 未处理的Promise拒绝
 * - vue: Vue组件错误
 * - custom: 自定义错误
 *
 * 配置项：
 * - dsn: 数据源名称
 * - environment: 环境标识
 * - maxBreadcrumbs: 最大面包屑数量
 * - sampleRate: 采样率
 */
export interface ErrorReport {
  message: string
  stack?: string
  url: string
  timestamp: number
  userAgent: string
  type: 'error' | 'unhandledrejection' | 'vue' | 'custom'
  context?: Record<string, unknown>
  breadcrumbs?: Breadcrumb[]
  user?: UserInfo
  environment: string
  release?: string
}

export interface Breadcrumb {
  type: 'navigation' | 'http' | 'user' | 'error' | 'info'
  message: string
  timestamp: number
  data?: Record<string, unknown>
}

export interface UserInfo {
  id?: string
  ip?: string
}

interface ErrorReporterConfig {
  dsn?: string
  environment?: string
  release?: string
  maxBreadcrumbs?: number
  enabled?: boolean
  sampleRate?: number
}

const DEFAULT_CONFIG: ErrorReporterConfig = {
  environment: import.meta.env.MODE,
  maxBreadcrumbs: 20,
  enabled: import.meta.env.PROD,
  sampleRate: 1.0
}

const isDev = import.meta.env.DEV

function devLog(...args: any[]): void {
  if (isDev) console.log(...args)
}

function devWarn(...args: any[]): void {
  if (isDev) console.warn(...args)
}

function devError(...args: any[]): void {
  if (isDev) console.error(...args)
}

type ErrorHandler = (event: ErrorEvent) => void
type RejectionHandler = (event: PromiseRejectionEvent) => void

class ErrorReporter {
  private config: ErrorReporterConfig = DEFAULT_CONFIG
  private breadcrumbs: Breadcrumb[] = []
  private queue: ErrorReport[] = []
  private isInitialized = false
  private flushTimer: number | null = null
  private readonly FLUSH_INTERVAL = 5000
  private readonly MAX_QUEUE_SIZE = 10
  private readonly MAX_RETRY_COUNT = 3
  private readonly RETRY_DELAY = 1000
  private isCapturing = false
  private retryCount = 0

  private boundErrorHandler: ErrorHandler | null = null
  private boundRejectionHandler: RejectionHandler | null = null

  init(config: Partial<ErrorReporterConfig> = {}): void {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.isInitialized = true

    if (this.config.enabled) {
      this.setupGlobalHandlers()
      this.startFlushTimer()

      devLog('[ErrorReporter] Initialized with config:', this.config)
    }
  }

  private setupGlobalHandlers(): void {
    this.boundErrorHandler = (event: ErrorEvent) => {
      this.captureError(event.error || new Error(event.message), {
        type: 'error',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    }

    this.boundRejectionHandler = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))

      this.captureError(error, {
        type: 'unhandledrejection'
      })
    }

    window.addEventListener('error', this.boundErrorHandler)
    window.addEventListener('unhandledrejection', this.boundRejectionHandler)
  }

  private teardownGlobalHandlers(): void {
    if (this.boundErrorHandler) {
      window.removeEventListener('error', this.boundErrorHandler)
      this.boundErrorHandler = null
    }
    if (this.boundRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.boundRejectionHandler)
      this.boundRejectionHandler = null
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flush()
    }, this.FLUSH_INTERVAL)
  }

  captureError(
    error: Error,
    options: {
      type?: ErrorReport['type']
      context?: Record<string, unknown>
    } = {}
  ): void {
    if (!this.config.enabled) return
    if (Math.random() > (this.config.sampleRate || 1)) return
    if (this.isCapturing) return

    this.isCapturing = true
    try {
      const report: ErrorReport = {
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        type: options.type || 'custom',
        context: options.context,
        breadcrumbs: [...this.breadcrumbs],
        environment: this.config.environment || 'unknown',
        release: this.config.release
      }

      this.queue.push(report)

      devError('[ErrorReporter] Captured error:', report)

      if (this.queue.length >= this.MAX_QUEUE_SIZE) {
        this.flush()
      }
    } finally {
      this.isCapturing = false
    }
  }

  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: Record<string, unknown>
  ): void {
    if (!this.config.enabled) return
    if (this.isCapturing) return

    this.isCapturing = true
    try {
      const report: ErrorReport = {
        message,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        type: 'custom',
        context: { level, ...context },
        breadcrumbs: [...this.breadcrumbs],
        environment: this.config.environment || 'unknown',
        release: this.config.release
      }

      this.queue.push(report)

      devLog(`[ErrorReporter] Captured message (${level}):`, message)
    } finally {
      this.isCapturing = false
    }
  }

  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    if (this.breadcrumbs.length >= (this.config.maxBreadcrumbs || 20)) {
      this.breadcrumbs.shift()
    }

    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: Date.now()
    })
  }

  setUser(user: UserInfo): void {
    this.addBreadcrumb({
      type: 'info',
      message: 'User identified',
      data: { ...user } as Record<string, unknown>
    })
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return
    if (!this.config.dsn) {
      devWarn('[ErrorReporter] No DSN configured, skipping flush')
      this.queue = []
      return
    }

    if (this.queue.length > this.MAX_QUEUE_SIZE * 2) {
      devWarn('[ErrorReporter] Queue overflow, dropping oldest reports')
      this.queue = this.queue.slice(-this.MAX_QUEUE_SIZE)
    }

    const reports = [...this.queue]
    this.queue = []

    try {
      const response = await fetch(this.config.dsn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports }),
        keepalive: true
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      devLog(`[ErrorReporter] Flushed ${reports.length} reports`)
      this.retryCount = 0
    } catch (e) {
      devError('[ErrorReporter] Failed to flush reports:', e)
      this.queue.unshift(...reports)

      if (this.retryCount < this.MAX_RETRY_COUNT) {
        this.retryCount++
        devLog(`[ErrorReporter] Retrying flush (${this.retryCount}/${this.MAX_RETRY_COUNT})`)
        setTimeout(() => this.flush(), this.RETRY_DELAY * this.retryCount)
      } else {
        devError('[ErrorReporter] Max retry count reached, dropping reports')
        this.queue = []
        this.retryCount = 0
      }
    }
  }

  getQueue(): ErrorReport[] {
    return [...this.queue]
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs]
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.teardownGlobalHandlers()
    this.flush()
    this.isInitialized = false
    this.breadcrumbs = []
    this.queue = []
  }
}

export const errorReporter = new ErrorReporter()

export function initErrorReporter(config?: Partial<ErrorReporterConfig>): void {
  errorReporter.init(config)
}

export interface CaptureErrorOptions {
  type?: ErrorReport['type']
  context?: Record<string, unknown>
}

export function captureError(error: Error, options?: CaptureErrorOptions): void {
  errorReporter.captureError(error, options)
}

export function captureMessage(
  message: string,
  level?: 'info' | 'warning' | 'error',
  context?: Record<string, unknown>
): void {
  errorReporter.captureMessage(message, level, context)
}

export function addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
  errorReporter.addBreadcrumb(breadcrumb)
}

export function setUser(user: UserInfo): void {
  errorReporter.setUser(user)
}

export function destroyErrorReporter(): void {
  errorReporter.destroy()
}
