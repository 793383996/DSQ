import type { IBlueprintBuilding } from '../types/blueprint'

export function buildIndexMap(
  buildings: IBlueprintBuilding[],
  startIndex: number
): Map<number, number> {
  const indexMap = new Map<number, number>()
  let nextIndex = startIndex + 1

  for (const building of buildings) {
    indexMap.set(building.index, nextIndex)
    nextIndex++
  }

  return indexMap
}

export function remapOutputIndex(outputObjIdx: number, indexMap: Map<number, number>): number {
  if (outputObjIdx < 0) {
    return outputObjIdx
  }

  const mapped = indexMap.get(outputObjIdx)
  return mapped !== undefined ? mapped : outputObjIdx
}

export function remapInputIndex(
  inputObjIdx: number,
  layer: number,
  foundationStartIndex: number,
  indexMap: Map<number, number>
): number {
  if (inputObjIdx === -1) {
    return foundationStartIndex + layer
  }

  const mapped = indexMap.get(inputObjIdx)
  if (mapped !== undefined) {
    return mapped
  }

  return inputObjIdx
}

export function applyZOffset(building: IBlueprintBuilding, zOffset: number): IBlueprintBuilding {
  if (!building.localOffset) {
    return {
      ...building,
      yaw: building.yaw ? building.yaw.slice() : [0, 0],
      parameters:
        building.parameters != null ? JSON.parse(JSON.stringify(building.parameters)) : null
    }
  }

  return {
    ...building,
    localOffset: [
      {
        x: building.localOffset[0].x,
        y: building.localOffset[0].y,
        z: building.localOffset[0].z + zOffset
      },
      {
        x: building.localOffset[1].x,
        y: building.localOffset[1].y,
        z: building.localOffset[1].z + zOffset
      }
    ],
    yaw: building.yaw ? building.yaw.slice() : [0, 0],
    parameters: building.parameters != null ? JSON.parse(JSON.stringify(building.parameters)) : null
  }
}

export function cloneBuildingWithRemap(
  base: IBlueprintBuilding,
  newIndex: number,
  zOffset: number,
  layer: number,
  foundationStartIndex: number,
  indexMap: Map<number, number>
): IBlueprintBuilding {
  const cloned = applyZOffset(base, zOffset)

  return {
    ...cloned,
    index: newIndex,
    inputObjIdx: remapInputIndex(base.inputObjIdx, layer, foundationStartIndex, indexMap),
    outputObjIdx: remapOutputIndex(base.outputObjIdx, indexMap)
  }
}
