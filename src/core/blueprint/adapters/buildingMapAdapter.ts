/**
 * BuildingMapAdapter - 建筑映射适配器
 *
 * 功能：
 * - 将完整建筑映射转换为传送带生成器所需格式
 * - 验证必要建筑是否存在
 * - 提供建筑映射类型转换
 *
 * 主要方法：
 * - adaptBuildingMapForConveyor(buildingMap): 适配传送带建筑映射
 * - hasRequiredConveyorBuildings(buildingMap): 检查传送带建筑
 * - hasRequiredSprayCoaterBuilding(buildingMap): 检查喷涂机建筑
 *
 * 上游调用：
 * - generators/ConveyorGenerator.ts: 传送带生成器
 * - generators/conveyor/*.ts: 传送带构建器
 *
 * 下游依赖：
 * - types/blueprint.ts: 蓝图类型定义
 * - generators/conveyor/ConveyorNodeBuilder.ts: 传送带节点构建器类型
 */
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
