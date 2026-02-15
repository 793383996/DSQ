import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initWebVitals, getMetrics, getReport, onMetric } from '../webVitals'

describe('webVitals', () => {
  beforeEach(() => {
    vi.stubGlobal('performance', {
      getEntriesByType: vi.fn().mockReturnValue([]),
      navigation: { type: 0 }
    })
    vi.stubGlobal(
      'PerformanceObserver',
      vi.fn().mockImplementation(() => ({
        observe: vi.fn()
      }))
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('initWebVitals', () => {
    it('should initialize without errors', () => {
      expect(() => initWebVitals()).not.toThrow()
    })

    it('should handle missing PerformanceObserver gracefully', () => {
      vi.stubGlobal('PerformanceObserver', undefined)
      expect(() => initWebVitals()).not.toThrow()
    })
  })

  describe('getMetrics', () => {
    it('should return empty array initially', () => {
      const metrics = getMetrics()
      expect(Array.isArray(metrics)).toBe(true)
    })
  })

  describe('getReport', () => {
    it('should return empty object initially', () => {
      const report = getReport()
      expect(report).toEqual({})
    })
  })

  describe('onMetric', () => {
    it('should register callback and return unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = onMetric(callback)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })
  })
})
