import { describe, it, expect } from 'vitest'
import { BinaryWriter } from '../utils/BinaryWriter'
import { BinaryReader } from '../utils/BinaryReader'

describe('BinaryReader Boundary Tests', () => {
  it('should throw when reading beyond buffer', () => {
    const writer = BinaryWriter.withCapacity(4)
    writer.setInt32(123)
    const reader = new BinaryReader(writer.buffer)
    reader.getInt32()
    expect(() => reader.getInt8()).toThrow()
  })

  it('should report correct remaining bytes', () => {
    const writer = BinaryWriter.withCapacity(16)
    writer.setInt32(1)
    writer.setInt32(2)
    const reader = new BinaryReader(writer.buffer)
    expect(reader.remaining).toBe(16)
    reader.getInt32()
    expect(reader.remaining).toBe(12)
    reader.getInt32()
    expect(reader.remaining).toBe(8)
  })

  it('should allow position reset', () => {
    const writer = BinaryWriter.withCapacity(8)
    writer.setInt32(111)
    writer.setInt32(222)
    const reader = new BinaryReader(writer.buffer)
    expect(reader.getInt32()).toBe(111)
    expect(reader.getInt32()).toBe(222)
    reader.position = 0
    expect(reader.getInt32()).toBe(111)
  })

  it('should handle empty buffer', () => {
    const reader = new BinaryReader(new ArrayBuffer(0))
    expect(reader.remaining).toBe(0)
    expect(() => reader.getInt8()).toThrow()
  })
})

describe('BinaryWriter Boundary Tests', () => {
  it('should track bytesWritten correctly', () => {
    const writer = BinaryWriter.withCapacity(32)
    expect(writer.bytesWritten).toBe(0)
    writer.setInt8(1)
    expect(writer.bytesWritten).toBe(1)
    writer.setInt16(2)
    expect(writer.bytesWritten).toBe(3)
    writer.setInt32(3)
    expect(writer.bytesWritten).toBe(7)
    writer.setFloat32(4.0)
    expect(writer.bytesWritten).toBe(11)
    writer.setFloat64(5.0)
    expect(writer.bytesWritten).toBe(19)
  })

  it('should allow position reset for overwrite', () => {
    const writer = BinaryWriter.withCapacity(8)
    writer.setInt32(100)
    writer.setInt32(200)
    writer.position = 0
    writer.setInt32(999)
    const reader = new BinaryReader(writer.buffer)
    expect(reader.getInt32()).toBe(999)
    expect(reader.getInt32()).toBe(200)
  })
})

describe('Float32 Boundary Values', () => {
  it('should handle very small values', () => {
    const writer = BinaryWriter.withCapacity(4)
    writer.setFloat32(0.0000001)
    const reader = new BinaryReader(writer.buffer)
    const value = reader.getFloat32()
    expect(value).toBeCloseTo(0.0000001, 6)
  })

  it('should handle large coordinate values', () => {
    const writer = BinaryWriter.withCapacity(12)
    writer.writeXYZ(9999.5, -9999.5, 5000.25)
    const reader = new BinaryReader(writer.buffer)
    const xyz = reader.readXYZ()
    expect(Math.abs(xyz.x - 9999.5)).toBeLessThan(0.01)
    expect(Math.abs(xyz.y - -9999.5)).toBeLessThan(0.01)
    expect(Math.abs(xyz.z - 5000.25)).toBeLessThan(0.01)
  })

  it('should handle negative values correctly', () => {
    const writer = BinaryWriter.withCapacity(28)
    writer.setFloat32(-0.5)
    writer.setFloat32(-100.75)
    writer.setFloat32(-0.0001)
    writer.writeXYZ(-5.5, -10.25, -100.0)

    const reader = new BinaryReader(writer.buffer)
    expect(reader.getFloat32()).toBeCloseTo(-0.5, 4)
    expect(reader.getFloat32()).toBeCloseTo(-100.75, 2)
    expect(reader.getFloat32()).toBeCloseTo(-0.0001, 4)

    const xyz = reader.readXYZ()
    expect(xyz.x).toBeCloseTo(-5.5, 2)
    expect(xyz.y).toBeCloseTo(-10.25, 2)
    expect(xyz.z).toBeCloseTo(-100.0, 1)
  })
})

describe('Unsigned Integer Operations', () => {
  it('should write and read Uint8 correctly', () => {
    const writer = BinaryWriter.withCapacity(4)
    writer.setUint8(0)
    writer.setUint8(255)
    writer.setUint8(128)

    const reader = new BinaryReader(writer.buffer)
    expect(reader.getUint8()).toBe(0)
    expect(reader.getUint8()).toBe(255)
    expect(reader.getUint8()).toBe(128)
  })

  it('should write and read Uint16 correctly', () => {
    const writer = BinaryWriter.withCapacity(8)
    writer.setUint16(0)
    writer.setUint16(65535)
    writer.setUint16(32768)

    const reader = new BinaryReader(writer.buffer)
    expect(reader.getUint16()).toBe(0)
    expect(reader.getUint16()).toBe(65535)
    expect(reader.getUint16()).toBe(32768)
  })

  it('should write and read Uint32 correctly', () => {
    const writer = BinaryWriter.withCapacity(12)
    writer.setUint32(0)
    writer.setUint32(4294967295)
    writer.setUint32(2147483648)

    const reader = new BinaryReader(writer.buffer)
    expect(reader.getUint32()).toBe(0)
    expect(reader.getUint32()).toBe(4294967295)
    expect(reader.getUint32()).toBe(2147483648)
  })
})

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
      { input: 0.333333, tolerance: 0.001 }
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
      { x: 10.5, y: -5.25, z: 0 }
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
