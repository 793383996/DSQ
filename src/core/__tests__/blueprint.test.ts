import { describe, it, expect } from 'vitest'
import { encodeBlueprint, ALL_ASSEMBLERS } from '../utils/BlueprintEncoder'
import { decodeBlueprint } from '../utils/BlueprintDecoder'
import type { IBlueprintData, IBlueprintBuilding, IBlueprintArea, IBlueprintHeader } from '../types/blueprint'

function createMinimalBlueprint(): IBlueprintData {
  const header: IBlueprintHeader = {
    layout: 10,
    icons: [1001],
    time: new Date('2026-01-01T00:00:00Z'),
    gameVersion: '0.9.26.13026',
    shortDesc: 'Test Blueprint',
    desc: ''
  }

  const area: IBlueprintArea = {
    index: 0,
    parentIndex: -1,
    tropicAnchor: 0,
    areaSegments: 200,
    anchorLocalOffset: { x: 0, y: 0 },
    size: { x: 1, y: 1 }
  }

  const building: IBlueprintBuilding = {
    index: 0,
    areaIndex: 0,
    localOffset: [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    ],
    yaw: [0, 0],
    itemId: 2303,
    modelIndex: 0,
    outputObjIdx: -1,
    inputObjIdx: -1,
    outputToSlot: 0,
    inputFromSlot: 0,
    outputFromSlot: 0,
    inputToSlot: 0,
    outputOffset: 0,
    inputOffset: 0,
    recipeId: 1,
    filterId: 0,
    parameters: null
  }

  return {
    version: 1,
    cursorOffset: { x: 0, y: 0 },
    cursorTargetArea: 0,
    dragBoxSize: { x: 1, y: 1 },
    primaryAreaIdx: 0,
    areas: [area],
    buildings: [building],
    header
  }
}

describe('BlueprintEncoder', () => {
  describe('encodeBlueprint', () => {
    it('should produce valid blueprint string format', () => {
      const data = createMinimalBlueprint()
      const result = encodeBlueprint(data)
      
      expect(result).toMatch(/^BLUEPRINT:/)
      expect(result).toContain('"')
    })

    it('should include header information', () => {
      const data = createMinimalBlueprint()
      const result = encodeBlueprint(data)
      
      expect(result).toContain('Test%20Blueprint')
      expect(result).toContain('0.9.26.13026')
    })

    it('should produce consistent output for same input', () => {
      const data = createMinimalBlueprint()
      data.header.time = new Date('2026-01-01T00:00:00Z')
      
      const result1 = encodeBlueprint(data)
      data.header.time = new Date('2026-01-01T00:00:00Z')
      const result2 = encodeBlueprint(data)
      
      expect(result1).toBe(result2)
    })

    it('should handle multiple buildings', () => {
      const data = createMinimalBlueprint()
      
      const building2: IBlueprintBuilding = {
        index: 1,
        areaIndex: 0,
        localOffset: [
          { x: 5, y: 0, z: 0 },
          { x: 5, y: 0, z: 0 }
        ],
        yaw: [0, 0],
        itemId: 2304,
        modelIndex: 0,
        outputObjIdx: -1,
        inputObjIdx: 0,
        outputToSlot: 0,
        inputFromSlot: 0,
        outputFromSlot: 0,
        inputToSlot: 0,
        outputOffset: 0,
        inputOffset: 0,
        recipeId: 2,
        filterId: 0,
        parameters: null
      }
      
      data.buildings.push(building2)
      
      const result = encodeBlueprint(data)
      expect(result).toMatch(/^BLUEPRINT:/)
    })
  })

  describe('ALL_ASSEMBLERS', () => {
    it('should contain expected assembler IDs', () => {
      expect(ALL_ASSEMBLERS.has(2303)).toBe(true)
      expect(ALL_ASSEMBLERS.has(2304)).toBe(true)
      expect(ALL_ASSEMBLERS.has(2305)).toBe(true)
      expect(ALL_ASSEMBLERS.has(2302)).toBe(true)
    })
  })
})

describe('BlueprintDecoder', () => {
  describe('decodeBlueprint', () => {
    it('should throw error for invalid blueprint string', () => {
      expect(() => decodeBlueprint('invalid')).toThrow()
      expect(() => decodeBlueprint('BLUEPRINT:invalid')).toThrow()
    })

    it('should decode encoded blueprint', () => {
      const original = createMinimalBlueprint()
      original.header.time = new Date('2026-01-01T00:00:00Z')
      
      const encoded = encodeBlueprint(original)
      const decoded = decodeBlueprint(encoded)
      
      expect(decoded.version).toBe(original.version)
      expect(decoded.areas.length).toBe(original.areas.length)
      expect(decoded.buildings.length).toBe(original.buildings.length)
    })

    it('should preserve building data through round-trip', () => {
      const original = createMinimalBlueprint()
      original.header.time = new Date('2026-01-01T00:00:00Z')
      original.buildings[0].itemId = 2305
      original.buildings[0].recipeId = 42
      original.buildings[0].localOffset = [
        { x: 10.5, y: 2.0, z: -3.25 },
        { x: 10.5, y: 2.0, z: -3.25 }
      ]
      
      const encoded = encodeBlueprint(original)
      const decoded = decodeBlueprint(encoded)
      
      expect(decoded.buildings[0].itemId).toBe(2305)
      expect(decoded.buildings[0].recipeId).toBe(42)
      expect(decoded.buildings[0].localOffset![0].x).toBeCloseTo(10.5)
      expect(decoded.buildings[0].localOffset![0].y).toBeCloseTo(2.0)
      expect(decoded.buildings[0].localOffset![0].z).toBeCloseTo(-3.25)
    })

    it('should preserve header data through round-trip', () => {
      const original = createMinimalBlueprint()
      original.header.time = new Date('2026-01-01T00:00:00Z')
      original.header.layout = 20
      original.header.icons = [1001, 1002, 1003]
      
      const encoded = encodeBlueprint(original)
      const decoded = decodeBlueprint(encoded)
      
      expect(decoded.header.layout).toBe(20)
      expect(decoded.header.icons).toEqual([1001, 1002, 1003])
      expect(decoded.header.gameVersion).toBe('0.9.26.13026')
    })

    it('should preserve area data through round-trip', () => {
      const original = createMinimalBlueprint()
      original.header.time = new Date('2026-01-01T00:00:00Z')
      original.areas[0].areaSegments = 100
      original.areas[0].size = { x: 5, y: 10 }
      
      const encoded = encodeBlueprint(original)
      const decoded = decodeBlueprint(encoded)
      
      expect(decoded.areas[0].areaSegments).toBe(100)
      expect(decoded.areas[0].size.x).toBe(5)
      expect(decoded.areas[0].size.y).toBe(10)
    })
  })
})
