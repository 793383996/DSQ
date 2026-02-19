import { describe, it, expect } from 'vitest'
import {
  maskEmail,
  maskPhone,
  maskIdCard,
  maskBankCard,
  desensitizeValue,
  desensitizeString,
  desensitizeObject
} from '../desensitize'

describe('desensitize', () => {
  describe('maskEmail', () => {
    it('should mask email correctly', () => {
      expect(maskEmail('test@example.com')).toBe('t**t@example.com')
      expect(maskEmail('abc@example.com')).toBe('a*c@example.com')
      expect(maskEmail('verylongemail@example.com')).toBe('v****l@example.com')
    })

    it('should handle short email', () => {
      expect(maskEmail('a@b.com')).toBe('*@b.com')
      expect(maskEmail('ab@c.com')).toBe('**@c.com')
    })

    it('should return original if no @', () => {
      expect(maskEmail('noemail')).toBe('noemail')
      expect(maskEmail('')).toBe('')
    })

    it('should handle null and undefined', () => {
      expect(maskEmail(null as unknown as string)).toBe(null)
      expect(maskEmail(undefined as unknown as string)).toBe(undefined)
    })
  })

  describe('maskPhone', () => {
    it('should mask 11-digit phone number', () => {
      expect(maskPhone('13812345678')).toBe('138****5678')
    })

    it('should handle phone with formatting', () => {
      expect(maskPhone('138-1234-5678')).toBe('138****5678')
    })

    it('should handle short phone number', () => {
      expect(maskPhone('123456')).toBe('******')
    })

    it('should handle 7-digit number', () => {
      expect(maskPhone('1234567')).toBe('123****567')
    })
  })

  describe('maskIdCard', () => {
    it('should mask 18-digit ID card', () => {
      expect(maskIdCard('110101199001011234')).toBe('1101**********1234')
    })

    it('should handle ID with X', () => {
      expect(maskIdCard('11010119900101123X')).toBe('1101*********1123')
    })

    it('should handle short ID', () => {
      expect(maskIdCard('1234567')).toBe('*******')
    })
  })

  describe('maskBankCard', () => {
    it('should mask bank card number', () => {
      expect(maskBankCard('6222021234567890123')).toBe('6222***********0123')
    })

    it('should handle short card number', () => {
      expect(maskBankCard('123456')).toBe('******')
    })
  })

  describe('desensitizeValue', () => {
    it('should mask sensitive string values', () => {
      const result = desensitizeValue('secret123', 'password')
      expect(result).toBe('***REDACTED***')
    })

    it('should return non-sensitive values unchanged', () => {
      expect(desensitizeValue('John', 'name')).toBe('John')
      expect(desensitizeValue('test@example.com', 'email')).toBe('t**t@example.com')
    })

    it('should handle null and undefined', () => {
      expect(desensitizeValue(null, 'key')).toBe(null)
      expect(desensitizeValue(undefined, 'key')).toBe(undefined)
    })
  })

  describe('desensitizeString', () => {
    it('should mask email in string', () => {
      const result = desensitizeString('Contact: test@example.com')
      expect(result).toContain('@')
      expect(result).not.toContain('test@example.com')
    })

    it('should mask phone in string', () => {
      const result = desensitizeString('Phone: 13812345678')
      expect(result).toContain('138')
      expect(result).toContain('5678')
      expect(result).not.toContain('13812345678')
    })

    it('should return unchanged string without sensitive data', () => {
      expect(desensitizeString('Hello World')).toBe('Hello World')
    })
  })

  describe('desensitizeObject', () => {
    it('should mask sensitive keys in object', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        token: 'abc123'
      }
      const result = desensitizeObject(obj)
      expect(result.username).toBe('john')
      expect(result.password).toBe('***REDACTED***')
      expect(result.token).toBe('***REDACTED***')
    })

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'john',
          apiKey: 'secret'
        }
      }
      const result = desensitizeObject(obj)
      expect(result.user.name).toBe('john')
      expect(result.user.apiKey).toBe('***REDACTED***')
    })

    it('should handle arrays', () => {
      const obj = {
        items: ['a', 'b', 'c']
      }
      const result = desensitizeObject(obj)
      expect(result.items).toEqual(['a', 'b', 'c'])
    })
  })
})
