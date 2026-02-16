import type { IBuildingData } from '../../types/blueprint'
import type { IBuildingMapForConveyor } from '../generators/conveyor/ConveyorNodeBuilder'

export interface IBuildingMapForConveyorExtended extends IBuildingMapForConveyor {
  sprayCoater: { itemId: number; modelIndex: number }
}

export function adaptBuildingMapForConveyor(
  buildingMap: Record<string, IBuildingData>
): IBuildingMapForConveyorExtended {
  const mk1 = buildingMap['传送带MK.I']
  const mk3 = buildingMap['传送带MK.III']
  const sprayCoater = buildingMap['喷涂机']

  if (!mk1 || !mk3) {
    throw new Error('Missing required conveyor belt definitions in buildingMap')
  }

  if (!sprayCoater) {
    throw new Error('Missing required spray coater definition in buildingMap')
  }

  return {
    conveyorBeltMk1: {
      itemId: mk1.itemId,
      modelIndex: mk1.modelIndex,
      transportSpeed: mk1.transportSpeed
    },
    conveyorBeltMK3: {
      itemId: mk3.itemId,
      modelIndex: mk3.modelIndex,
      transportSpeed: mk3.transportSpeed
    },
    sprayCoater: {
      itemId: sprayCoater.itemId,
      modelIndex: sprayCoater.modelIndex
    }
  }
}

export function hasRequiredConveyorBuildings(buildingMap: Record<string, IBuildingData>): boolean {
  return !!(buildingMap['传送带MK.I'] && buildingMap['传送带MK.III'])
}

export function hasRequiredSprayCoaterBuilding(
  buildingMap: Record<string, IBuildingData>
): boolean {
  return !!buildingMap['喷涂机']
}
