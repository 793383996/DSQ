import { describe, it, expect } from 'vitest'
import {
  SECONDS_PER_MINUTE,
  perSecondToPerMinute,
  perMinuteToPerSecond,
  formatNumber,
  parseNumber,
  calculatePerMinute,
  calculateMachineCount
} from '../unitConverter'

describe('unitConverter', () => {
  describe('constants', () => {
    it('should have correct SECONDS_PER_MINUTE', () => {
      expect(SECONDS_PER_MINUTE).toBe(60)
    })
  })

  describe('perSecondToPerMinute', () => {
    it('should convert per second to per minute', () => {
      expect(perSecondToPerMinute(1)).toBe(60)
      expect(perSecondToPerMinute(2)).toBe(120)
      expect(perSecondToPerMinute(0.5)).toBe(30)
    })

    it('should handle zero', () => {
      expect(perSecondToPerMinute(0)).toBe(0)
    })

    it('should handle negative values', () => {
      expect(perSecondToPerMinute(-1)).toBe(-60)
    })
  })

  describe('perMinuteToPerSecond', () => {
    it('should convert per minute to per second', () => {
      expect(perMinuteToPerSecond(60)).toBe(1)
      expect(perMinuteToPerSecond(120)).toBe(2)
      expect(perMinuteToPerSecond(30)).toBe(0.5)
    })

    it('should handle zero', () => {
      expect(perMinuteToPerSecond(0)).toBe(0)
    })

    it('should be inverse of perSecondToPerMinute', () => {
      expect(perMinuteToPerSecond(perSecondToPerMinute(5))).toBe(5)
      expect(perSecondToPerMinute(perMinuteToPerSecond(300))).toBe(300)
    })
  })

  describe('formatNumber', () => {
    it('should format zero', () => {
      expect(formatNumber(0)).toBe('0')
    })

    it('should format with default decimals', () => {
      expect(formatNumber(1.23456)).toBe('1.235')
      expect(formatNumber(10.5)).toBe('10.500')
    })

    it('should format with custom decimals', () => {
      expect(formatNumber(1.23456, 1)).toBe('1.2')
      expect(formatNumber(1.23456, 5)).toBe('1.23456')
    })

    it('should use scientific notation for very small numbers', () => {
      expect(formatNumber(0.0001)).toBe('1.00e-4')
      expect(formatNumber(0.00001)).toBe('1.00e-5')
    })

    it('should use scientific notation for very large numbers', () => {
      expect(formatNumber(1000000)).toBe('1.00e+6')
      expect(formatNumber(999999)).toBe('999999.000')
    })

    it('should handle negative numbers', () => {
      expect(formatNumber(-1.5)).toBe('-1.500')
      expect(formatNumber(-100)).toBe('-100.000')
    })

    it('should use scientific notation for very small negative numbers', () => {
      expect(formatNumber(-0.0001)).toBe('-1.00e-4')
    })
  })

  describe('parseNumber', () => {
    it('should parse valid number strings', () => {
      expect(parseNumber('42')).toBe(42)
      expect(parseNumber('3.14')).toBe(3.14)
      expect(parseNumber('-10')).toBe(-10)
    })

    it('should return 0 for empty string', () => {
      expect(parseNumber('')).toBe(0)
      expect(parseNumber('   ')).toBe(0)
    })

    it('should return 0 for null/undefined', () => {
      expect(parseNumber(null as any)).toBe(0)
      expect(parseNumber(undefined as any)).toBe(0)
    })

    it('should return 0 for invalid strings', () => {
      expect(parseNumber('abc')).toBe(0)
      expect(parseNumber('not a number')).toBe(0)
    })
  })

  describe('calculatePerMinute', () => {
    it('should calculate per minute output', () => {
      expect(calculatePerMinute(1, 1)).toBe(60)
      expect(calculatePerMinute(2, 2)).toBe(60)
      expect(calculatePerMinute(1, 2)).toBe(30)
    })

    it('should return 0 for zero time', () => {
      expect(calculatePerMinute(1, 0)).toBe(0)
      expect(calculatePerMinute(1, -1)).toBe(0)
    })

    it('should handle zero amount', () => {
      expect(calculatePerMinute(0, 1)).toBe(0)
    })
  })

  describe('calculateMachineCount', () => {
    it('should calculate required machines', () => {
      expect(calculateMachineCount(60, 1, 1, 1)).toBe(1)
      expect(calculateMachineCount(120, 1, 1, 1)).toBe(2)
      expect(calculateMachineCount(30, 1, 1, 1)).toBe(0.5)
    })

    it('should apply machine speed', () => {
      const baseCount = calculateMachineCount(60, 1, 1, 1)
      const fastCount = calculateMachineCount(60, 1, 1, 2)
      expect(fastCount).toBe(baseCount / 2)
    })

    it('should return 0 for invalid inputs', () => {
      expect(calculateMachineCount(60, 0, 1, 1)).toBe(0)
      expect(calculateMachineCount(60, 1, 0, 1)).toBe(0)
      expect(calculateMachineCount(60, 1, 1, 0)).toBe(0)
      expect(calculateMachineCount(60, 1, 1, -1)).toBe(0)
    })

    it('should handle complex recipe', () => {
      expect(calculateMachineCount(100, 2, 3, 1)).toBeCloseTo(2.5)
    })
  })
})
