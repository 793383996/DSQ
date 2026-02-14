import { describe, it, expect } from 'vitest'
import {
  buildIndexMap,
  remapOutputIndex,
  remapInputIndex,
  applyZOffset,
  cloneBuildingWithRemap
} from '../utils/IndexMapper'
import type { IBlueprintBuilding } from '../types/blueprint'

function createTestBuilding(
  index: number,
  inputObjIdx: number = -1,
  outputObjIdx: number = -1
): IBlueprintBuilding {
  return {
    index,
    areaIndex: 0,
    localOffset: [
      { x: index * 3, y: 0, z: 0 },
      { x: index * 3, y: 0, z: 0 }
    ],
    yaw: [0, 0],
    itemId: 2303,
    modelIndex: 0,
    outputObjIdx,
    inputObjIdx,
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
}

describe('buildIndexMap', () => {
  it('should create correct index mapping', () => {
    const buildings = [createTestBuilding(0), createTestBuilding(1), createTestBuilding(2)]

    const map = buildIndexMap(buildings, 100)

    expect(map.size).toBe(3)
    expect(map.get(0)).toBe(101)
    expect(map.get(1)).toBe(102)
    expect(map.get(2)).toBe(103)
  })

  it('should handle empty buildings array', () => {
    const map = buildIndexMap([], 0)
    expect(map.size).toBe(0)
  })

  it('should handle non-sequential indices', () => {
    const buildings = [createTestBuilding(5), createTestBuilding(10), createTestBuilding(20)]

    const map = buildIndexMap(buildings, 0)

    expect(map.get(5)).toBe(1)
    expect(map.get(10)).toBe(2)
    expect(map.get(20)).toBe(3)
  })
})

describe('remapOutputIndex', () => {
  it('should return -1 for -1 input', () => {
    const map = new Map([[0, 100]])
    expect(remapOutputIndex(-1, map)).toBe(-1)
  })

  it('should return mapped index when found', () => {
    const map = new Map([
      [5, 200],
      [10, 300]
    ])
    expect(remapOutputIndex(5, map)).toBe(200)
    expect(remapOutputIndex(10, map)).toBe(300)
  })

  it('should return original index when not found', () => {
    const map = new Map([[5, 200]])
    expect(remapOutputIndex(99, map)).toBe(99)
  })
})

describe('remapInputIndex', () => {
  it('should return foundation index for -1 input (no foundation connection)', () => {
    const map = new Map([[0, 100]])
    expect(remapInputIndex(-1, 1, 50, map)).toBe(51)
    expect(remapInputIndex(-1, 3, 100, map)).toBe(103)
  })

  it('should return mapped index when found in indexMap', () => {
    const map = new Map([[5, 200]])
    expect(remapInputIndex(5, 1, 50, map)).toBe(200)
  })

  it('should return original index when not found in indexMap and not -1', () => {
    const map = new Map<number, number>()
    expect(remapInputIndex(99, 2, 100, map)).toBe(99)
  })
})

describe('applyZOffset', () => {
  it('should add z offset to building coordinates', () => {
    const building = createTestBuilding(0)
    building.localOffset = [
      { x: 10, y: 5, z: 0 },
      { x: 10, y: 5, z: 0 }
    ]

    const result = applyZOffset(building, 20)

    expect(result.localOffset![0].z).toBe(20)
    expect(result.localOffset![1].z).toBe(20)
    expect(result.localOffset![0].x).toBe(10)
    expect(result.localOffset![0].y).toBe(5)
  })

  it('should handle negative z offset', () => {
    const building = createTestBuilding(0)
    building.localOffset = [
      { x: 0, y: 0, z: 30 },
      { x: 0, y: 0, z: 30 }
    ]

    const result = applyZOffset(building, -10)

    expect(result.localOffset![0].z).toBe(20)
  })

  it('should handle null localOffset', () => {
    const building = createTestBuilding(0)
    building.localOffset = null

    const result = applyZOffset(building, 20)

    expect(result.localOffset).toBeNull()
  })

  it('should not modify original building', () => {
    const building = createTestBuilding(0)
    building.localOffset = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    ]

    applyZOffset(building, 50)

    expect(building.localOffset![0].z).toBe(0)
  })
})

describe('cloneBuildingWithRemap', () => {
  it('should create cloned building with new index and z offset', () => {
    const base = createTestBuilding(5, 10, 20)
    const indexMap = new Map([
      [10, 100],
      [20, 200]
    ])

    const result = cloneBuildingWithRemap(base, 50, 30, 2, 500, indexMap)

    expect(result.index).toBe(50)
    expect(result.localOffset![0].z).toBe(30)
    expect(result.inputObjIdx).toBe(100)
    expect(result.outputObjIdx).toBe(200)
  })

  it('should use foundation index for -1 inputObjIdx', () => {
    const base = createTestBuilding(5, -1, 99)
    const indexMap = new Map<number, number>()

    const result = cloneBuildingWithRemap(base, 50, 30, 3, 100, indexMap)

    expect(result.inputObjIdx).toBe(103)
  })

  it('should preserve other building properties', () => {
    const base = createTestBuilding(5)
    base.itemId = 2305
    base.recipeId = 42
    base.filterId = 100

    const result = cloneBuildingWithRemap(base, 50, 30, 1, 100, new Map())

    expect(result.itemId).toBe(2305)
    expect(result.recipeId).toBe(42)
    expect(result.filterId).toBe(100)
  })
})
