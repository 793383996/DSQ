import { describe, it, expect } from 'vitest'
import { md5Digest, md5Hex } from '../utils/md5'

function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder()
  return encoder.encode(str).buffer
}

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
