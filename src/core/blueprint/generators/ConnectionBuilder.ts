import type { IBlueprintBuilding } from '../../types/blueprint'
import type { ISorterMap, ISorterInfo } from '../types/buildingGenerator'

export interface IConnectionConfig {
  maxSorterNumOneBelt: number
  stackLayers: number
}

export const DEFAULT_CONNECTION_CONFIG: IConnectionConfig = {
  maxSorterNumOneBelt: 8,
  stackLayers: 1
}

export class ConnectionBuilder {
  private config: IConnectionConfig

  constructor(config: Partial<IConnectionConfig> = {}) {
    this.config = { ...DEFAULT_CONNECTION_CONFIG, ...config }
  }

  updateConfig(config: Partial<IConnectionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  private buildBuildingIndexMap(buildings: IBlueprintBuilding[]): Map<number, IBlueprintBuilding> {
    const map = new Map<number, IBlueprintBuilding>()
    for (const building of buildings) {
      map.set(building.index, building)
    }
    return map
  }

  connectSortersToConveyor(
    buildings: IBlueprintBuilding[],
    sorters: ISorterMap,
    conveyorStartIndex: number,
    itemSummary: Record<string, { rate: number; fromBuildingNum: number }>
  ): number {
    const sortersPerNode = this.calculateSortersPerNode()
    const buildingMap = this.buildBuildingIndexMap(buildings)
    let currentIndex = conveyorStartIndex

    for (const itemName in sorters) {
      const itemSorters = sorters[itemName]
      const itemEntry = itemSummary[itemName]

      if (!itemEntry) {
        continue
      }

      const outputSorters = itemSorters.output || []
      const inputSorters = itemSorters.input || []

      const outputNodeCount = this.calculateConveyorNodeCount(itemEntry.rate)
      const inputNodeCount = this.calculateConveyorNodeCount(itemEntry.rate)

      this.connectOutputSorters(buildingMap, outputSorters, currentIndex, sortersPerNode)

      this.connectInputSorters(
        buildingMap,
        inputSorters,
        currentIndex + outputNodeCount,
        sortersPerNode
      )

      currentIndex += outputNodeCount + inputNodeCount
    }

    return currentIndex
  }

  private connectOutputSorters(
    buildingMap: Map<number, IBlueprintBuilding>,
    sorters: ISorterInfo[],
    conveyorStartIndex: number,
    sortersPerNode: number
  ): void {
    let nodeIndex = conveyorStartIndex
    let sortersOnCurrentNode = 0

    for (const sorter of sorters) {
      const building = buildingMap.get(sorter.ownerObjIdx)
      if (!building) {
        continue
      }

      building.outputObjIdx = nodeIndex
      sortersOnCurrentNode++

      if (sortersOnCurrentNode >= sortersPerNode) {
        nodeIndex++
        sortersOnCurrentNode = 0
      }
    }
  }

  private connectInputSorters(
    buildingMap: Map<number, IBlueprintBuilding>,
    sorters: ISorterInfo[],
    conveyorStartIndex: number,
    sortersPerNode: number
  ): void {
    let nodeIndex = conveyorStartIndex
    let sortersOnCurrentNode = 0

    for (const sorter of sorters) {
      const building = buildingMap.get(sorter.ownerObjIdx)
      if (!building) {
        continue
      }

      building.inputObjIdx = nodeIndex
      sortersOnCurrentNode++

      if (sortersOnCurrentNode >= sortersPerNode) {
        nodeIndex++
        sortersOnCurrentNode = 0
      }
    }
  }

  private calculateSortersPerNode(): number {
    const stackLayers = this.config.stackLayers || 1
    if (stackLayers > 1) {
      return Math.max(1, Math.floor(this.config.maxSorterNumOneBelt / stackLayers))
    }
    return this.config.maxSorterNumOneBelt
  }

  private calculateConveyorNodeCount(rate: number): number {
    const maxSpeed = 30
    return Math.ceil(rate / maxSpeed)
  }

  connectBuildings(
    buildings: IBlueprintBuilding[],
    connections: Array<{
      fromIndex: number
      toIndex: number
      fromSlot?: number
      toSlot?: number
    }>
  ): void {
    for (const conn of connections) {
      const fromBuilding = buildings.find(b => b.index === conn.fromIndex)
      const toBuilding = buildings.find(b => b.index === conn.toIndex)

      if (!fromBuilding || !toBuilding) {
        continue
      }

      fromBuilding.outputObjIdx = conn.toIndex
      if (conn.fromSlot !== undefined) {
        fromBuilding.outputFromSlot = conn.fromSlot
      }
      if (conn.toSlot !== undefined) {
        fromBuilding.outputToSlot = conn.toSlot
      }
    }
  }

  disconnectBuilding(building: IBlueprintBuilding): void {
    building.outputObjIdx = -1
    building.inputObjIdx = -1
    building.outputToSlot = 0
    building.inputFromSlot = 0
    building.outputFromSlot = 0
    building.inputToSlot = 0
  }

  validateConnections(buildings: IBlueprintBuilding[]): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    const indexSet = new Set(buildings.map(b => b.index))

    for (const building of buildings) {
      if (building.outputObjIdx !== -1 && !indexSet.has(building.outputObjIdx)) {
        errors.push(
          `Building ${building.index} references non-existent output ${building.outputObjIdx}`
        )
      }
      if (building.inputObjIdx !== -1 && !indexSet.has(building.inputObjIdx)) {
        errors.push(
          `Building ${building.index} references non-existent input ${building.inputObjIdx}`
        )
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
