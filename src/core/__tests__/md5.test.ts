import { describe, it, expect } from 'vitest'
import { md5Digest, md5Hex } from '../utils/md5'

function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder()
  return encoder.encode(str).buffer
}

describe('MD5 Boundary Tests', () => {
  describe('Empty and Null-like Inputs', () => {
    it('should handle empty string correctly', () => {
      const result = md5Hex(stringToArrayBuffer(''))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })

    it('should handle single character', () => {
      const result = md5Hex(stringToArrayBuffer('a'))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })

    it('should handle single space', () => {
      const result = md5Hex(stringToArrayBuffer(' '))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })
  })

  describe('Long Strings', () => {
    it('should handle 1000 character string', () => {
      const longStr = 'a'.repeat(1000)
      const result = md5Hex(stringToArrayBuffer(longStr))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
      expect(result.length).toBe(32)
    })

    it('should handle 10000 character string', () => {
      const longStr = 'x'.repeat(10000)
      const result = md5Hex(stringToArrayBuffer(longStr))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })

    it('should produce consistent results for long strings', () => {
      const longStr = 'test'.repeat(1000)
      const result1 = md5Hex(stringToArrayBuffer(longStr))
      const result2 = md5Hex(stringToArrayBuffer(longStr))
      expect(result1).toBe(result2)
    })
  })

  describe('Unicode and Special Characters', () => {
    it('should handle Chinese characters', () => {
      const result = md5Hex(stringToArrayBuffer('中文测试'))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })

    it('should handle emoji', () => {
      const result = md5Hex(stringToArrayBuffer('🎮🎯🏆'))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })

    it('should handle newline characters', () => {
      const result = md5Hex(stringToArrayBuffer('line1\nline2\n'))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })

    it('should handle tab characters', () => {
      const result = md5Hex(stringToArrayBuffer('col1\tcol2\tcol3'))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })

    it('should handle null character in string', () => {
      const result = md5Hex(stringToArrayBuffer('test\0null'))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })

    it('should handle mixed ASCII and Unicode', () => {
      const result = md5Hex(stringToArrayBuffer('DSP蓝图-Blueprint测试'))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })
  })

  describe('Binary Data', () => {
    it('should handle all zero bytes', () => {
      const buffer = new ArrayBuffer(16)
      const result = md5Hex(buffer)
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })

    it('should handle all 0xFF bytes', () => {
      const buffer = new ArrayBuffer(16)
      const view = new Uint8Array(buffer)
      view.fill(0xff)
      const result = md5Hex(buffer)
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })

    it('should handle sequential bytes', () => {
      const buffer = new ArrayBuffer(256)
      const view = new Uint8Array(buffer)
      for (let i = 0; i < 256; i++) {
        view[i] = i
      }
      const result = md5Hex(buffer)
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })
  })
})

describe('MD5', () => {
  describe('md5Digest', () => {
    it('should return 16-byte ArrayBuffer', () => {
      const result = md5Digest(stringToArrayBuffer('test'))
      expect(result.byteLength).toBe(16)
    })

    it('should return consistent results for same input', () => {
      const input = stringToArrayBuffer('consistent')
      const result1 = md5Digest(input)
      const result2 = md5Digest(input)

      const view1 = new Uint8Array(result1)
      const view2 = new Uint8Array(result2)

      for (let i = 0; i < 16; i++) {
        expect(view1[i]).toBe(view2[i])
      }
    })

    it('should produce deterministic output for blueprint data', () => {
      const testData = new ArrayBuffer(64)
      const view = new DataView(testData)
      view.setInt32(0, 0x12345678, true)
      view.setFloat32(4, 1.5, true)

      const result = md5Digest(testData)
      expect(result.byteLength).toBe(16)

      const result2 = md5Digest(testData)
      const view1 = new Uint8Array(result)
      const view2 = new Uint8Array(result2)

      for (let i = 0; i < 16; i++) {
        expect(view1[i]).toBe(view2[i])
      }
    })
  })

  describe('md5Hex', () => {
    it('should return uppercase hex string', () => {
      const result = md5Hex(stringToArrayBuffer('test'))
      expect(result).toMatch(/^[0-9A-F]{32}$/)
    })
  })
})
