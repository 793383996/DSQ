import { describe, it, expect } from 'vitest'
import { BinaryWriter } from '../utils/BinaryWriter'
import { BinaryReader } from '../utils/BinaryReader'

describe('BinaryWriter', () => {
  it('should write and read Int8 correctly', () => {
    const writer = BinaryWriter.withCapacity(16)
    writer.setInt8(-128)
    writer.setInt8(127)
    
    const reader = new BinaryReader(writer.buffer)
    expect(reader.getInt8()).toBe(-128)
    expect(reader.getInt8()).toBe(127)
  })

  it('should write and read Int16 correctly with little-endian', () => {
    const writer = BinaryWriter.withCapacity(16)
    writer.setInt16(-32768)
    writer.setInt16(32767)
    
    const reader = new BinaryReader(writer.buffer)
    expect(reader.getInt16()).toBe(-32768)
    expect(reader.getInt16()).toBe(32767)
  })

  it('should write and read Int32 correctly with little-endian', () => {
    const writer = BinaryWriter.withCapacity(16)
    writer.setInt32(-2147483648)
    writer.setInt32(2147483647)
    
    const reader = new BinaryReader(writer.buffer)
    expect(reader.getInt32()).toBe(-2147483648)
    expect(reader.getInt32()).toBe(2147483647)
  })

  it('should write and read Float32 correctly with little-endian', () => {
    const writer = BinaryWriter.withCapacity(32)
    const testValues = [0.0, 1.0, -1.0, 3.14159, 0.00001, 12345.6789]
    
    testValues.forEach(v => writer.setFloat32(v))
    
    const reader = new BinaryReader(writer.buffer)
    testValues.forEach(expected => {
      const actual = reader.getFloat32()
      expect(Math.abs(actual - expected)).toBeLessThan(0.001)
    })
  })

  it('should write and read XYZ coordinates correctly', () => {
    const writer = BinaryWriter.withCapacity(16)
    writer.writeXYZ(1.5, 2.5, 3.5)
    
    const reader = new BinaryReader(writer.buffer)
    const xyz = reader.readXYZ()
    expect(Math.abs(xyz.x - 1.5)).toBeLessThan(0.001)
    expect(Math.abs(xyz.y - 2.5)).toBeLessThan(0.001)
    expect(Math.abs(xyz.z - 3.5)).toBeLessThan(0.001)
  })

  it('should match DataView byte order for little-endian', () => {
    const buffer = new ArrayBuffer(8)
    const nativeView = new DataView(buffer)
    nativeView.setInt32(0, 0x12345678, true)
    nativeView.setFloat32(4, 1.5, true)
    
    const writer = BinaryWriter.withCapacity(8)
    writer.setInt32(0x12345678)
    writer.setFloat32(1.5)
    
    const writerBytes = new Uint8Array(writer.buffer)
    const nativeBytes = new Uint8Array(buffer)
    
    for (let i = 0; i < 8; i++) {
      expect(writerBytes[i]).toBe(nativeBytes[i])
    }
  })
})

describe('Float32 Precision', () => {
  it('should preserve precision for typical blueprint values', () => {
    const testCases = [
      { input: 100.0, tolerance: 0.0001 },
      { input: 0.125, tolerance: 0.0001 },
      { input: 0.25, tolerance: 0.0001 },
      { input: 0.5, tolerance: 0.0001 },
      { input: 1.0, tolerance: 0.0001 },
      { input: 2.0, tolerance: 0.0001 },
      { input: 3.0, tolerance: 0.0001 },
      { input: 1.5, tolerance: 0.0001 },
      { input: 0.75, tolerance: 0.0001 },
      { input: 0.333333, tolerance: 0.001 },
    ]
    
    testCases.forEach(({ input, tolerance }) => {
      const writer = BinaryWriter.withCapacity(4)
      writer.setFloat32(input)
      
      const reader = new BinaryReader(writer.buffer)
      const output = reader.getFloat32()
      
      expect(Math.abs(output - input)).toBeLessThan(tolerance)
    })
  })

  it('should handle coordinate values used in blueprint generation', () => {
    const coordinates = [
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 3, z: 0 },
      { x: -1.5, y: 2.5, z: 0 },
      { x: 10.5, y: -5.25, z: 0 },
    ]
    
    coordinates.forEach(({ x, y, z }) => {
      const writer = BinaryWriter.withCapacity(12)
      writer.writeXYZ(x, y, z)
      
      const reader = new BinaryReader(writer.buffer)
      const result = reader.readXYZ()
      
      expect(Math.abs(result.x - x)).toBeLessThan(0.001)
      expect(Math.abs(result.y - y)).toBeLessThan(0.001)
      expect(Math.abs(result.z - z)).toBeLessThan(0.001)
    })
  })
})
