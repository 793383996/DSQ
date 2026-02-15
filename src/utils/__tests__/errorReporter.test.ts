import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  initErrorReporter,
  captureError,
  captureMessage,
  addBreadcrumb,
  setUser,
  errorReporter
} from '../errorReporter'

describe('errorReporter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    errorReporter.destroy()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    errorReporter.destroy()
  })

  describe('init', () => {
    it('should initialize with default config', () => {
      initErrorReporter()
      expect(errorReporter.getQueue()).toEqual([])
    })

    it('should accept custom config', () => {
      initErrorReporter({
        environment: 'test',
        enabled: false
      })
    })
  })

  describe('captureError', () => {
    it('should capture error when enabled', () => {
      initErrorReporter({ enabled: true, sampleRate: 1 })

      const error = new Error('Test error')
      captureError(error)

      const queue = errorReporter.getQueue()
      expect(queue.length).toBe(1)
      expect(queue[0].message).toBe('Test error')
      expect(queue[0].type).toBe('custom')
    })

    it('should not capture error when disabled', () => {
      initErrorReporter({ enabled: false })

      const error = new Error('Test error')
      captureError(error)

      const queue = errorReporter.getQueue()
      expect(queue.length).toBe(0)
    })
  })

  describe('captureMessage', () => {
    it('should capture message', () => {
      initErrorReporter({ enabled: true, sampleRate: 1 })

      captureMessage('Test message', 'info')

      const queue = errorReporter.getQueue()
      expect(queue.length).toBe(1)
      expect(queue[0].message).toBe('Test message')
    })
  })

  describe('addBreadcrumb', () => {
    it('should add breadcrumb', () => {
      initErrorReporter()

      addBreadcrumb({
        type: 'user',
        message: 'User clicked button'
      })

      const breadcrumbs = errorReporter.getBreadcrumbs()
      expect(breadcrumbs.length).toBe(1)
      expect(breadcrumbs[0].message).toBe('User clicked button')
    })

    it('should limit breadcrumbs to maxBreadcrumbs', () => {
      initErrorReporter({ maxBreadcrumbs: 5 })

      for (let i = 0; i < 10; i++) {
        addBreadcrumb({
          type: 'user',
          message: `Action ${i}`
        })
      }

      const breadcrumbs = errorReporter.getBreadcrumbs()
      expect(breadcrumbs.length).toBe(5)
    })
  })

  describe('setUser', () => {
    it('should add user breadcrumb', () => {
      initErrorReporter()

      setUser({ id: 'user123', ip: '127.0.0.1' })

      const breadcrumbs = errorReporter.getBreadcrumbs()
      expect(breadcrumbs.length).toBe(1)
      expect(breadcrumbs[0].message).toBe('User identified')
    })
  })
})
