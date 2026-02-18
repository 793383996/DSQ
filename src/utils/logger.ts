/**
 * Logger - 结构化日志工具
 *
 * 功能：
 * - 提供分级日志记录（debug/info/warn/error）
 * - 支持敏感数据脱敏
 * - 支持日志缓冲和批量上报
 * - 支持远程日志服务
 *
 * 主要方法：
 * - init(config): 初始化日志器
 * - debug(message, context): 调试日志
 * - info(message, context): 信息日志
 * - warn(message, context): 警告日志
 * - error(message, context): 错误日志
 * - flush(): 刷新日志缓冲
 *
 * 上游调用：
 * - 全项目通用日志记录
 *
 * 下游依赖：
 * - utils/desensitize.ts: 敏感数据脱敏
 *
 * 配置项：
 * - minLevel: 最低日志级别
 * - enableConsole: 启用控制台输出
 * - enableRemote: 启用远程上报
 * - bufferSize: 缓冲区大小
 * - flushInterval: 刷新间隔
 */
import { desensitizeValue, desensitizeString } from './desensitize'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  context?: Record<string, unknown>
  environment: string
  url?: string
  userAgent?: string
}

interface LoggerConfig {
  minLevel: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteUrl?: string
  bufferSize: number
  flushInterval: number
  desensitize?: boolean
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: import.meta.env.PROD ? 'info' : 'debug',
  enableConsole: true,
  enableRemote: import.meta.env.PROD,
  bufferSize: 50,
  flushInterval: 10000,
  desensitize: true
}

const isDev = import.meta.env.DEV

class StructuredLogger {
  private config: LoggerConfig = DEFAULT_CONFIG
  private buffer: LogEntry[] = []
  private flushTimer: number | null = null
  private isInitialized = false
  private isLogging = false

  init(config: Partial<LoggerConfig> = {}): void {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.isInitialized = true

    if (this.config.enableRemote && this.config.remoteUrl) {
      this.startFlushTimer()
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel]
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
    const processedMessage = this.config.desensitize ? desensitizeString(message) : message
    const processedContext =
      this.config.desensitize && context
        ? (desensitizeValue(context) as Record<string, unknown>)
        : context

    return {
      level,
      message: processedMessage,
      timestamp: Date.now(),
      context: processedContext,
      environment: import.meta.env.MODE,
      url: typeof window !== 'undefined' && window.location ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    }
  }

  private log(level: LogLevel, ...args: any[]): void {
    if (!this.shouldLog(level)) return
    if (this.isLogging) return

    this.isLogging = true
    try {
      const message = args
        .map(arg => {
          if (typeof arg === 'string') return arg
          if (arg instanceof Error) return `${arg.message}\n${arg.stack}`
          try {
            return JSON.stringify(arg)
          } catch {
            return String(arg)
          }
        })
        .join(' ')

      const entry = this.createEntry(level, message)
      this.buffer.push(entry)

      if (this.buffer.length >= this.config.bufferSize) {
        this.flush()
      }

      if (this.config.enableConsole) {
        this.consoleLog(level, ...args)
      }
    } finally {
      this.isLogging = false
    }
  }

  private consoleLog(level: LogLevel, ...args: any[]): void {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`

    switch (level) {
      case 'debug':
        if (isDev) console.log(prefix, ...args)
        break
      case 'info':
        console.info(prefix, ...args)
        break
      case 'warn':
        console.warn(prefix, ...args)
        break
      case 'error':
        console.error(prefix, ...args)
        break
    }
  }

  debug(...args: any[]): void {
    this.log('debug', ...args)
  }

  info(...args: any[]): void {
    this.log('info', ...args)
  }

  warn(...args: any[]): void {
    this.log('warn', ...args)
  }

  error(...args: any[]): void {
    this.log('error', ...args)
  }

  withContext(context: Record<string, unknown>): {
    debug: (...args: any[]) => void
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  } {
    return {
      debug: (...args: any[]) => this.logWithContext('debug', args, context),
      info: (...args: any[]) => this.logWithContext('info', args, context),
      warn: (...args: any[]) => this.logWithContext('warn', args, context),
      error: (...args: any[]) => this.logWithContext('error', args, context)
    }
  }

  private logWithContext(level: LogLevel, args: any[], context: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return
    if (this.isLogging) return

    this.isLogging = true
    try {
      const message = args
        .map(arg => {
          if (typeof arg === 'string') return arg
          if (arg instanceof Error) return `${arg.message}\n${arg.stack}`
          try {
            return JSON.stringify(arg)
          } catch {
            return String(arg)
          }
        })
        .join(' ')

      const entry = this.createEntry(level, message, context)
      this.buffer.push(entry)

      if (this.buffer.length >= this.config.bufferSize) {
        this.flush()
      }

      if (this.config.enableConsole) {
        this.consoleLog(level, `[Context: ${JSON.stringify(context)}]`, ...args)
      }
    } finally {
      this.isLogging = false
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return
    if (!this.config.enableRemote || !this.config.remoteUrl) {
      this.buffer = []
      return
    }

    const entries = [...this.buffer]
    this.buffer = []

    try {
      await fetch(this.config.remoteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: entries }),
        keepalive: true
      })
    } catch {
      this.buffer.unshift(...entries)
    }
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer]
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.flush()
    this.isInitialized = false
    this.buffer = []
  }
}

const structuredLogger = new StructuredLogger()

export const logger = {
  debug: (...args: any[]) => structuredLogger.debug(...args),
  info: (...args: any[]) => structuredLogger.info(...args),
  warn: (...args: any[]) => structuredLogger.warn(...args),
  error: (...args: any[]) => structuredLogger.error(...args),
  log: (...args: any[]) => structuredLogger.info(...args),
  withContext: (context: Record<string, unknown>) => structuredLogger.withContext(context),
  init: (config?: Partial<LoggerConfig>) => structuredLogger.init(config),
  getBuffer: () => structuredLogger.getBuffer(),
  destroy: () => structuredLogger.destroy()
}

export { structuredLogger }

export function initLogger(config?: Partial<LoggerConfig>): void {
  structuredLogger.init(config)
}
