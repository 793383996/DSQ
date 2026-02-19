import { describe, it, expect } from 'vitest'
import {
  required,
  minLength,
  maxLength,
  pattern,
  email,
  url,
  number,
  min,
  max,
  integer,
  positiveNumber,
  range,
  oneOf,
  custom,
  compose,
  validate,
  sanitizeString,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeFloat,
  trim,
  toLowerCase,
  toUpperCase,
  removeWhitespace,
  sanitizeInput
} from '../validators'

describe('validators', () => {
  describe('required', () => {
    it('should pass for non-empty values', () => {
      expect(required()('test')).toEqual({ valid: true, errors: [] })
      expect(required()(123)).toEqual({ valid: true, errors: [] })
      expect(required()([1, 2, 3])).toEqual({ valid: true, errors: [] })
    })

    it('should fail for empty values', () => {
      expect(required()('')).toEqual({ valid: false, errors: ['此字段必填'] })
      expect(required()(null)).toEqual({ valid: false, errors: ['此字段必填'] })
      expect(required()(undefined)).toEqual({ valid: false, errors: ['此字段必填'] })
    })

    it('should use custom message', () => {
      expect(required('Custom message')('')).toEqual({ valid: false, errors: ['Custom message'] })
    })
  })

  describe('minLength', () => {
    it('should pass for strings meeting minimum length', () => {
      expect(minLength(3)('abc')).toEqual({ valid: true, errors: [] })
      expect(minLength(3)('abcd')).toEqual({ valid: true, errors: [] })
    })

    it('should fail for strings below minimum length', () => {
      expect(minLength(3)('ab')).toEqual({ valid: false, errors: ['长度不能少于 3 个字符'] })
    })

    it('should work with arrays', () => {
      expect(minLength(2)([1, 2])).toEqual({ valid: true, errors: [] })
      expect(minLength(2)([1])).toEqual({ valid: false, errors: ['长度不能少于 2 个字符'] })
    })

    it('should pass for non-string/non-array values', () => {
      expect(minLength(3)(123)).toEqual({ valid: true, errors: [] })
    })
  })

  describe('maxLength', () => {
    it('should pass for strings within maximum length', () => {
      expect(maxLength(5)('abc')).toEqual({ valid: true, errors: [] })
      expect(maxLength(5)('abcde')).toEqual({ valid: true, errors: [] })
    })

    it('should fail for strings exceeding maximum length', () => {
      expect(maxLength(5)('abcdef')).toEqual({ valid: false, errors: ['长度不能超过 5 个字符'] })
    })
  })

  describe('pattern', () => {
    it('should pass for matching patterns', () => {
      expect(pattern(/^[a-z]+$/)('abc')).toEqual({ valid: true, errors: [] })
    })

    it('should fail for non-matching patterns', () => {
      expect(pattern(/^[a-z]+$/)('ABC')).toEqual({ valid: false, errors: ['格式不正确'] })
    })

    it('should pass for non-string values', () => {
      expect(pattern(/^[a-z]+$/)(123)).toEqual({ valid: true, errors: [] })
    })
  })

  describe('email', () => {
    it('should pass for valid emails', () => {
      expect(email()('test@example.com')).toEqual({ valid: true, errors: [] })
      expect(email()('user.name@domain.co')).toEqual({ valid: true, errors: [] })
    })

    it('should fail for invalid emails', () => {
      expect(email()('invalid')).toEqual({ valid: false, errors: ['请输入有效的邮箱地址'] })
      expect(email()('test@')).toEqual({ valid: false, errors: ['请输入有效的邮箱地址'] })
    })
  })

  describe('url', () => {
    it('should pass for valid URLs', () => {
      expect(url()('https://example.com')).toEqual({ valid: true, errors: [] })
      expect(url()('http://localhost:3000')).toEqual({ valid: true, errors: [] })
    })

    it('should fail for invalid URLs', () => {
      expect(url()('not-a-url')).toEqual({ valid: false, errors: ['请输入有效的URL'] })
    })

    it('should pass for empty values', () => {
      expect(url()('')).toEqual({ valid: true, errors: [] })
    })
  })

  describe('number', () => {
    it('should pass for valid numbers', () => {
      expect(number()(123)).toEqual({ valid: true, errors: [] })
      expect(number()('123')).toEqual({ valid: true, errors: [] })
      expect(number()('12.5')).toEqual({ valid: true, errors: [] })
    })

    it('should fail for non-numbers', () => {
      expect(number()('abc')).toEqual({ valid: false, errors: ['请输入有效的数字'] })
    })

    it('should pass for empty values', () => {
      expect(number()('')).toEqual({ valid: true, errors: [] })
    })
  })

  describe('min', () => {
    it('should pass for values >= min', () => {
      expect(min(5)(5)).toEqual({ valid: true, errors: [] })
      expect(min(5)(10)).toEqual({ valid: true, errors: [] })
    })

    it('should fail for values < min', () => {
      expect(min(5)(3)).toEqual({ valid: false, errors: ['值不能小于 5'] })
    })
  })

  describe('max', () => {
    it('should pass for values <= max', () => {
      expect(max(10)(10)).toEqual({ valid: true, errors: [] })
      expect(max(10)(5)).toEqual({ valid: true, errors: [] })
    })

    it('should fail for values > max', () => {
      expect(max(10)(15)).toEqual({ valid: false, errors: ['值不能大于 10'] })
    })
  })

  describe('integer', () => {
    it('should pass for integers', () => {
      expect(integer()(5)).toEqual({ valid: true, errors: [] })
      expect(integer()(-3)).toEqual({ valid: true, errors: [] })
    })

    it('should fail for non-integers', () => {
      expect(integer()(5.5)).toEqual({ valid: false, errors: ['请输入整数'] })
    })
  })

  describe('positiveNumber', () => {
    it('should pass for positive numbers', () => {
      expect(positiveNumber()(5)).toEqual({ valid: true, errors: [] })
      expect(positiveNumber()(0.1)).toEqual({ valid: true, errors: [] })
    })

    it('should fail for non-positive numbers', () => {
      expect(positiveNumber()(0)).toEqual({ valid: false, errors: ['请输入正数'] })
      expect(positiveNumber()(-5)).toEqual({ valid: false, errors: ['请输入正数'] })
    })
  })

  describe('range', () => {
    it('should pass for values within range', () => {
      expect(range(1, 10)(5)).toEqual({ valid: true, errors: [] })
      expect(range(1, 10)(1)).toEqual({ valid: true, errors: [] })
      expect(range(1, 10)(10)).toEqual({ valid: true, errors: [] })
    })

    it('should fail for values outside range', () => {
      expect(range(1, 10)(0)).toEqual({ valid: false, errors: ['值必须在 1 到 10 之间'] })
      expect(range(1, 10)(11)).toEqual({ valid: false, errors: ['值必须在 1 到 10 之间'] })
    })
  })

  describe('oneOf', () => {
    it('should pass for allowed values', () => {
      expect(oneOf(['a', 'b', 'c'])('a')).toEqual({ valid: true, errors: [] })
      expect(oneOf([1, 2, 3])(2)).toEqual({ valid: true, errors: [] })
    })

    it('should fail for non-allowed values', () => {
      expect(oneOf(['a', 'b', 'c'])('d')).toEqual({ valid: false, errors: ['值不在允许范围内'] })
    })
  })

  describe('custom', () => {
    it('should pass when validator returns true', () => {
      expect(custom(v => v === 'test', 'Must be test')('test')).toEqual({ valid: true, errors: [] })
    })

    it('should fail when validator returns false', () => {
      expect(custom(v => v === 'test', 'Must be test')('other')).toEqual({
        valid: false,
        errors: ['Must be test']
      })
    })

    it('should handle validator errors', () => {
      expect(
        custom(() => {
          throw new Error('Error')
        }, 'Failed')('test')
      ).toEqual({ valid: false, errors: ['Failed'] })
    })
  })

  describe('compose', () => {
    it('should combine multiple validators', () => {
      const validator = compose(required(), minLength(3))
      expect(validator('abc')).toEqual({ valid: true, errors: [] })
    })

    it('should collect all errors', () => {
      const validator = compose(required(), minLength(5))
      const result = validator('')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBe(2)
    })
  })

  describe('validate', () => {
    it('should validate with array of validators', () => {
      expect(validate('test', [required(), minLength(3)])).toEqual({ valid: true, errors: [] })
    })
  })

  describe('sanitizeString', () => {
    it('should escape HTML characters', () => {
      expect(sanitizeString('<script>')).toBe('&lt;script&gt;')
      expect(sanitizeString('"test"')).toBe('&quot;test&quot;')
    })
  })

  describe('sanitizeNumber', () => {
    it('should parse valid numbers', () => {
      expect(sanitizeNumber('123')).toBe(123)
      expect(sanitizeNumber('12.5')).toBe(12.5)
    })

    it('should return null for invalid numbers', () => {
      expect(sanitizeNumber('abc')).toBe(null)
    })
  })

  describe('sanitizeInteger', () => {
    it('should parse integers', () => {
      expect(sanitizeInteger('123')).toBe(123)
    })

    it('should return null for invalid integers', () => {
      expect(sanitizeInteger('abc')).toBe(null)
    })
  })

  describe('sanitizeFloat', () => {
    it('should parse floats', () => {
      expect(sanitizeFloat('12.5')).toBe(12.5)
    })

    it('should return null for invalid floats', () => {
      expect(sanitizeFloat('abc')).toBe(null)
    })
  })

  describe('trim', () => {
    it('should trim whitespace', () => {
      expect(trim('  test  ')).toBe('test')
    })
  })

  describe('toLowerCase', () => {
    it('should convert to lowercase', () => {
      expect(toLowerCase('TEST')).toBe('test')
    })
  })

  describe('toUpperCase', () => {
    it('should convert to uppercase', () => {
      expect(toUpperCase('test')).toBe('TEST')
    })
  })

  describe('removeWhitespace', () => {
    it('should remove all whitespace', () => {
      expect(removeWhitespace('a b c')).toBe('abc')
      expect(removeWhitespace('  test  ')).toBe('test')
    })
  })

  describe('sanitizeInput', () => {
    it('should apply transformers', () => {
      const result = sanitizeInput('  TEST  ', [trim, toLowerCase])
      expect(result).toBe('test')
    })

    it('should return empty string for non-string values', () => {
      expect(sanitizeInput(123)).toBe('')
    })
  })
})
