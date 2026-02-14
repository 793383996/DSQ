import { describe, it, expect } from 'vitest'
import { formatNumber } from '../format'

describe('formatNumber', () => {
  describe('undefined and null handling', () => {
    it('returns "-" for undefined', () => {
      expect(formatNumber(undefined)).toBe('-')
    })

    it('returns "-" for null', () => {
      expect(formatNumber(null as unknown as number)).toBe('-')
    })
  })

  describe('large numbers (>= 1000)', () => {
    it('formats 1000 as "1.0k"', () => {
      expect(formatNumber(1000)).toBe('1.0k')
    })

    it('formats 1500 as "1.5k"', () => {
      expect(formatNumber(1500)).toBe('1.5k')
    })

    it('formats 10000 as "10.0k"', () => {
      expect(formatNumber(10000)).toBe('10.0k')
    })

    it('formats 12345 as "12.3k"', () => {
      expect(formatNumber(12345)).toBe('12.3k')
    })

    it('formats 999 as "999.0" (not k)', () => {
      expect(formatNumber(999)).toBe('999')
    })

    it('formats 1000000 as "1000.0k"', () => {
      expect(formatNumber(1000000)).toBe('1000.0k')
    })
  })

  describe('medium numbers (100-999)', () => {
    it('formats 100 as "100"', () => {
      expect(formatNumber(100)).toBe('100')
    })

    it('formats 500 as "500"', () => {
      expect(formatNumber(500)).toBe('500')
    })

    it('formats 999 as "999"', () => {
      expect(formatNumber(999)).toBe('999')
    })

    it('formats 100.5 as "101" (rounds)', () => {
      expect(formatNumber(100.5)).toBe('101')
    })
  })

  describe('small numbers (10-99)', () => {
    it('formats 10 as "10.0"', () => {
      expect(formatNumber(10)).toBe('10.0')
    })

    it('formats 50 as "50.0"', () => {
      expect(formatNumber(50)).toBe('50.0')
    })

    it('formats 99 as "99.0"', () => {
      expect(formatNumber(99)).toBe('99.0')
    })

    it('formats 10.5 as "10.5"', () => {
      expect(formatNumber(10.5)).toBe('10.5')
    })

    it('formats 99.9 as "99.9"', () => {
      expect(formatNumber(99.9)).toBe('99.9')
    })
  })

  describe('very small numbers (< 10)', () => {
    it('formats 0 as "0.00"', () => {
      expect(formatNumber(0)).toBe('0.00')
    })

    it('formats 1 as "1.00"', () => {
      expect(formatNumber(1)).toBe('1.00')
    })

    it('formats 5 as "5.00"', () => {
      expect(formatNumber(5)).toBe('5.00')
    })

    it('formats 9.99 as "9.99"', () => {
      expect(formatNumber(9.99)).toBe('9.99')
    })

    it('formats 0.01 as "0.01"', () => {
      expect(formatNumber(0.01)).toBe('0.01')
    })

    it('formats 0.001 as "0.00"', () => {
      expect(formatNumber(0.001)).toBe('0.00')
    })
  })

  describe('decimal handling', () => {
    it('formats 10.123 as "10.1"', () => {
      expect(formatNumber(10.123)).toBe('10.1')
    })

    it('formats 100.999 as "101"', () => {
      expect(formatNumber(100.999)).toBe('101')
    })

    it('formats 9.999 as "10.00"', () => {
      expect(formatNumber(9.999)).toBe('10.00')
    })
  })

  describe('edge cases', () => {
    it('formats 99.999 as "100.0"', () => {
      expect(formatNumber(99.999)).toBe('100.0')
    })

    it('formats 9.999 as "10.00"', () => {
      expect(formatNumber(9.999)).toBe('10.00')
    })

    it('formats 999.999 as "1000"', () => {
      expect(formatNumber(999.999)).toBe('1000')
    })
  })
})
