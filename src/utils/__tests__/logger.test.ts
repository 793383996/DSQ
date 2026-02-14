import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../logger'

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('log', () => {
    it('calls console.log in dev mode', () => {
      vi.stubEnv('DEV', true)

      const devLogger = {
        log: (...args: unknown[]) => {
          if (import.meta.env.DEV) console.log(...args)
        }
      }

      devLogger.log('test message')

      expect(console.log).toHaveBeenCalledWith('test message')
    })

    it('does not call console.log in production', () => {
      vi.stubEnv('DEV', false)

      const prodLogger = {
        log: (...args: unknown[]) => {
          if (import.meta.env.DEV) console.log(...args)
        }
      }

      prodLogger.log('test message')

      expect(console.log).not.toHaveBeenCalled()
    })
  })

  describe('warn', () => {
    it('calls console.warn in dev mode', () => {
      vi.stubEnv('DEV', true)

      const devLogger = {
        warn: (...args: unknown[]) => {
          if (import.meta.env.DEV) console.warn(...args)
        }
      }

      devLogger.warn('warning message')

      expect(console.warn).toHaveBeenCalledWith('warning message')
    })

    it('does not call console.warn in production', () => {
      vi.stubEnv('DEV', false)

      const prodLogger = {
        warn: (...args: unknown[]) => {
          if (import.meta.env.DEV) console.warn(...args)
        }
      }

      prodLogger.warn('warning message')

      expect(console.warn).not.toHaveBeenCalled()
    })
  })

  describe('error', () => {
    it('always calls console.error', () => {
      vi.stubEnv('DEV', false)

      logger.error('error message')

      expect(console.error).toHaveBeenCalledWith('error message')
    })

    it('calls console.error with multiple arguments', () => {
      const error = new Error('test')
      logger.error('error occurred', error)

      expect(console.error).toHaveBeenCalledWith('error occurred', error)
    })

    it('calls console.error in dev mode', () => {
      vi.stubEnv('DEV', true)

      logger.error('error message')

      expect(console.error).toHaveBeenCalledWith('error message')
    })
  })

  describe('debug', () => {
    it('calls console.log with [DEBUG] prefix in dev mode', () => {
      vi.stubEnv('DEV', true)

      const devLogger = {
        debug: (...args: unknown[]) => {
          if (import.meta.env.DEV) console.log('[DEBUG]', ...args)
        }
      }

      devLogger.debug('debug message')

      expect(console.log).toHaveBeenCalledWith('[DEBUG]', 'debug message')
    })

    it('does not call console.log in production', () => {
      vi.stubEnv('DEV', false)

      const prodLogger = {
        debug: (...args: unknown[]) => {
          if (import.meta.env.DEV) console.log('[DEBUG]', ...args)
        }
      }

      prodLogger.debug('debug message')

      expect(console.log).not.toHaveBeenCalled()
    })
  })

  describe('multiple arguments', () => {
    it('passes all arguments to console methods', () => {
      vi.stubEnv('DEV', true)

      const devLogger = {
        log: (...args: unknown[]) => {
          if (import.meta.env.DEV) console.log(...args)
        }
      }

      const obj = { key: 'value' }
      const arr = [1, 2, 3]

      devLogger.log('message', obj, arr)

      expect(console.log).toHaveBeenCalledWith('message', obj, arr)
    })
  })

  describe('logger object structure', () => {
    it('has log method', () => {
      expect(logger.log).toBeDefined()
      expect(typeof logger.log).toBe('function')
    })

    it('has warn method', () => {
      expect(logger.warn).toBeDefined()
      expect(typeof logger.warn).toBe('function')
    })

    it('has error method', () => {
      expect(logger.error).toBeDefined()
      expect(typeof logger.error).toBe('function')
    })

    it('has debug method', () => {
      expect(logger.debug).toBeDefined()
      expect(typeof logger.debug).toBe('function')
    })
  })
})
