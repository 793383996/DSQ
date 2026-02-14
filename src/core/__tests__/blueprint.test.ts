import { describe, it, expect } from 'vitest'
import { encodeBlueprint, ALL_ASSEMBLERS } from '../utils/BlueprintEncoder'
import { decodeBlueprint } from '../utils/BlueprintDecoder'
import type {
  IBlueprintData,
  IBlueprintBuilding,
  IBlueprintArea,
  IBlueprintHeader
} from '../types/blueprint'

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

describe('Blueprint Round-trip Stress Tests', () => {
  it('should handle 100 buildings correctly', () => {
    const data = createMinimalBlueprint()
    data.header.time = new Date('2026-01-01T00:00:00Z')

    for (let i = 1; i < 100; i++) {
      data.buildings.push({
        index: i,
        areaIndex: 0,
        localOffset: [
          { x: i * 3, y: Math.floor(i / 10) * 3, z: 0 },
          { x: i * 3, y: Math.floor(i / 10) * 3, z: 0 }
        ],
        yaw: [0, 0],
        itemId: 2303 + (i % 5),
        modelIndex: 0,
        outputObjIdx: i > 0 ? i - 1 : -1,
        inputObjIdx: i < 99 ? i + 1 : -1,
        outputToSlot: 0,
        inputFromSlot: 0,
        outputFromSlot: 0,
        inputToSlot: 0,
        outputOffset: 0,
        inputOffset: 0,
        recipeId: i,
        filterId: 0,
        parameters: null
      })
    }

    const encoded = encodeBlueprint(data)
    const decoded = decodeBlueprint(encoded)

    expect(decoded.buildings.length).toBe(100)
    expect(decoded.buildings[50].index).toBe(50)
    expect(decoded.buildings[99].localOffset![0].x).toBeCloseTo(99 * 3)
  })

  it('should handle negative coordinates correctly', () => {
    const data = createMinimalBlueprint()
    data.header.time = new Date('2026-01-01T00:00:00Z')
    data.buildings[0].localOffset = [
      { x: -100.5, y: -50.25, z: -10.125 },
      { x: -100.5, y: -50.25, z: -10.125 }
    ]

    const encoded = encodeBlueprint(data)
    const decoded = decodeBlueprint(encoded)

    expect(decoded.buildings[0].localOffset![0].x).toBeCloseTo(-100.5)
    expect(decoded.buildings[0].localOffset![0].y).toBeCloseTo(-50.25)
    expect(decoded.buildings[0].localOffset![0].z).toBeCloseTo(-10.125)
  })

  it('should handle large coordinate values', () => {
    const data = createMinimalBlueprint()
    data.header.time = new Date('2026-01-01T00:00:00Z')
    data.buildings[0].localOffset = [
      { x: 9999.9, y: -9999.9, z: 5000.5 },
      { x: 9999.9, y: -9999.9, z: 5000.5 }
    ]

    const encoded = encodeBlueprint(data)
    const decoded = decodeBlueprint(encoded)

    expect(Math.abs(decoded.buildings[0].localOffset![0].x - 9999.9)).toBeLessThan(0.1)
    expect(Math.abs(decoded.buildings[0].localOffset![0].y - -9999.9)).toBeLessThan(0.1)
    expect(Math.abs(decoded.buildings[0].localOffset![0].z - 5000.5)).toBeLessThan(0.1)
  })

  it('should handle large recipeId values', () => {
    const data = createMinimalBlueprint()
    data.header.time = new Date('2026-01-01T00:00:00Z')
    data.buildings[0].recipeId = 30000
    data.buildings[0].filterId = 12345

    const encoded = encodeBlueprint(data)
    const decoded = decodeBlueprint(encoded)

    expect(decoded.buildings[0].recipeId).toBe(30000)
    expect(decoded.buildings[0].filterId).toBe(12345)
  })

  it('should handle multiple areas correctly', () => {
    const data = createMinimalBlueprint()
    data.header.time = new Date('2026-01-01T00:00:00Z')

    data.areas.push({
      index: 1,
      parentIndex: 0,
      tropicAnchor: 1,
      areaSegments: 100,
      anchorLocalOffset: { x: 10, y: 10 },
      size: { x: 5, y: 5 }
    })

    data.areas.push({
      index: 2,
      parentIndex: 1,
      tropicAnchor: 2,
      areaSegments: 50,
      anchorLocalOffset: { x: 20, y: 20 },
      size: { x: 3, y: 3 }
    })

    const encoded = encodeBlueprint(data)
    const decoded = decodeBlueprint(encoded)

    expect(decoded.areas.length).toBe(3)
    expect(decoded.areas[1].parentIndex).toBe(0)
    expect(decoded.areas[2].anchorLocalOffset.x).toBe(20)
  })

  it('should handle blueprint with description', () => {
    const data = createMinimalBlueprint()
    data.header.time = new Date('2026-01-01T00:00:00Z')
    data.header.shortDesc = 'Production Line Alpha'
    data.header.desc = 'A test blueprint description'

    const encoded = encodeBlueprint(data)
    const decoded = decodeBlueprint(encoded)

    expect(decoded.header.shortDesc).toContain('Production Line Alpha')
  })

  it('should handle multiple icons', () => {
    const data = createMinimalBlueprint()
    data.header.time = new Date('2026-01-01T00:00:00Z')
    data.header.icons = [1001, 1002, 1003, 1004, 1005]

    const encoded = encodeBlueprint(data)
    const decoded = decodeBlueprint(encoded)

    expect(decoded.header.icons).toEqual([1001, 1002, 1003, 1004, 1005])
  })

  it('should handle different building types', () => {
    const data = createMinimalBlueprint()
    data.header.time = new Date('2026-01-01T00:00:00Z')

    const buildingTypes = [
      { itemId: 2302, name: '制造台Mk.Ⅰ' },
      { itemId: 2303, name: '制造台Mk.Ⅱ' },
      { itemId: 2304, name: '制造台Mk.Ⅲ' },
      { itemId: 2305, name: '电弧熔炉' },
      { itemId: 2306, name: '位面熔炉' },
      { itemId: 2310, name: '化工厂' },
      { itemId: 2311, name: '精炼厂' },
      { itemId: 2901, name: '矩阵研究站' }
    ]

    buildingTypes.forEach((type, i) => {
      data.buildings.push({
        index: i + 1,
        areaIndex: 0,
        localOffset: [
          { x: i * 5, y: 0, z: 0 },
          { x: i * 5, y: 0, z: 0 }
        ],
        yaw: [0, 0],
        itemId: type.itemId,
        modelIndex: 0,
        outputObjIdx: -1,
        inputObjIdx: -1,
        outputToSlot: 0,
        inputFromSlot: 0,
        outputFromSlot: 0,
        inputToSlot: 0,
        outputOffset: 0,
        inputOffset: 0,
        recipeId: i,
        filterId: 0,
        parameters: null
      })
    })

    const encoded = encodeBlueprint(data)
    const decoded = decodeBlueprint(encoded)

    expect(decoded.buildings.length).toBe(buildingTypes.length + 1)
    buildingTypes.forEach((type, i) => {
      expect(decoded.buildings[i + 1].itemId).toBe(type.itemId)
    })
  })

  it('should handle buildings with sorter connections', () => {
    const data = createMinimalBlueprint()
    data.header.time = new Date('2026-01-01T00:00:00Z')

    data.buildings.push({
      index: 1,
      areaIndex: 0,
      localOffset: [
        { x: 3, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 }
      ],
      yaw: [0, 0],
      itemId: 2011,
      modelIndex: 0,
      outputObjIdx: 0,
      inputObjIdx: 2,
      outputToSlot: 1,
      inputFromSlot: 0,
      outputFromSlot: 0,
      inputToSlot: 1,
      outputOffset: 0,
      inputOffset: 0,
      recipeId: 0,
      filterId: 1001,
      parameters: null
    })

    const encoded = encodeBlueprint(data)
    const decoded = decodeBlueprint(encoded)

    expect(decoded.buildings[1].outputObjIdx).toBe(0)
    expect(decoded.buildings[1].inputObjIdx).toBe(2)
    expect(decoded.buildings[1].filterId).toBe(1001)
  })
})

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
