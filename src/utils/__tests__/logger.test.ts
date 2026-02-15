import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, initLogger, structuredLogger } from '../logger'

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    structuredLogger.destroy()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    structuredLogger.destroy()
  })

  describe('init', () => {
    it('should initialize with config', () => {
      initLogger({
        minLevel: 'debug',
        enableConsole: true
      })
    })
  })

  describe('debug', () => {
    it('should log debug messages in dev mode', () => {
      initLogger({ minLevel: 'debug', enableConsole: true })

      logger.debug('debug message')

      expect(console.log).toHaveBeenCalled()
    })

    it('should not log debug when minLevel is info', () => {
      initLogger({ minLevel: 'info', enableConsole: true })

      logger.debug('debug message')

      expect(console.log).not.toHaveBeenCalled()
    })
  })

  describe('info', () => {
    it('should log info messages', () => {
      initLogger({ minLevel: 'debug', enableConsole: true })

      logger.info('info message')

      expect(console.info).toHaveBeenCalled()
    })
  })

  describe('warn', () => {
    it('should log warn messages', () => {
      initLogger({ minLevel: 'debug', enableConsole: true })

      logger.warn('warn message')

      expect(console.warn).toHaveBeenCalled()
    })
  })

  describe('error', () => {
    it('should log error messages', () => {
      initLogger({ minLevel: 'debug', enableConsole: true })

      logger.error('error message')

      expect(console.error).toHaveBeenCalled()
    })

    it('should log error with Error object', () => {
      initLogger({ minLevel: 'debug', enableConsole: true })

      const error = new Error('test error')
      logger.error('error occurred', error)

      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('log', () => {
    it('should alias to info', () => {
      initLogger({ minLevel: 'debug', enableConsole: true })

      logger.log('log message')

      expect(console.info).toHaveBeenCalled()
    })
  })

  describe('withContext', () => {
    it('should create contextual logger', () => {
      initLogger({ minLevel: 'debug', enableConsole: true })

      const contextLogger = logger.withContext({ module: 'test' })
      contextLogger.info('context message')

      expect(console.info).toHaveBeenCalled()
    })
  })

  describe('getBuffer', () => {
    it('should return log buffer', () => {
      initLogger({ minLevel: 'debug', enableConsole: true })

      logger.info('test message')
      const buffer = logger.getBuffer()

      expect(buffer.length).toBe(1)
      expect(buffer[0].message).toContain('test message')
    })
  })
})
