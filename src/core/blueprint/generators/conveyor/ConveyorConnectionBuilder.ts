/**
 * ConveyorConnectionBuilder - 传送带连接构建器（简化版）
 *
 * 功能：
 * - 基础传送带节点生成
 * - 简单的物料参数设置
 *
 * 不包含的功能（由 ConveyorGenerator 处理）：
 * - 分拣器连接逻辑
 * - X射线裂解/重整精炼特殊处理
 * - 速率匹配和分拣器分配
 * - 建筑物位置调整
 *
 * 主要方法：
 * - buildConnection(params): 构建传送带连接
 * - setBuildingIndex(index): 设置建筑索引
 *
 * 上游调用：
 * - generators/ConveyorGenerator.ts: 传送带生成器
 *
 * 下游依赖：
 * - generators/conveyor/ConveyorNodeBuilder.ts: 传送带节点构建器
 * - types/conveyorGenerator.ts: 传送带类型定义
 *
 * @see ConveyorGenerator - 完整版传送带生成器
 */
import type { IBlueprintBuilding, ICoordinate } from '../../../types/blueprint'
export interface IConnectionBuildParams {
  itemName: string
  itemEntry: IItemSummaryEntry
  sorters: ISorterMap
  itemMap: Record<string, { iconId: number }>
  startX: number
  startY: number
}

export interface IConnectionResult {
  buildings: IBlueprintBuilding[]
  endX: number
  endY: number
}

export class ConveyorConnectionBuilder {
  private nodeBuilder: ConveyorNodeBuilder
  private config: IConveyorGeneratorConfig

  constructor(
    buildingMap: IBuildingMapForConveyor,
    config: Partial<IConveyorGeneratorConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONVEYOR_GENERATOR_CONFIG, ...config }
    this.nodeBuilder = new ConveyorNodeBuilder(buildingMap, config)
  }

  setBuildingIndex(index: number): void {
    this.nodeBuilder.setBuildingIndex(index)
  }

  getBuildingIndex(): number {
    return this.nodeBuilder.getBuildingIndex()
  }

  buildConnection(params: IConnectionBuildParams): IConnectionResult {
    const { itemName, itemEntry, sorters, itemMap, startX, startY } = params
    const buildings: IBlueprintBuilding[] = []
    const zero = 0.0000000001

    const conveyorBelt = this.nodeBuilder.selectConveyorBelt(
      itemEntry.rate,
      itemEntry.fromBuildingNum
    )
    const maxTransportSpeed = this.nodeBuilder.calculateMaxTransportSpeed(itemEntry.fromBuildingNum)

    const currentX = startX
    let currentY = startY
    const direction = itemEntry.fromBuildingNum === 0 ? -1 : 1

    for (let totalDoneRate = 0; itemEntry.rate - totalDoneRate > zero; ) {
      const currentRate = Math.min(itemEntry.rate - totalDoneRate, maxTransportSpeed)

      const parameters = this.createParameters(
        itemName,
        currentRate,
        itemMap,
        itemEntry.toBuildingNum
      )

      const node = this.nodeBuilder.buildNode({
        offset: { x: currentX, y: currentY, z: 0 },
        yaw: [0, 0],
        conveyor: conveyorBelt,
        outputObjIdx: this.nodeBuilder.getBuildingIndex() + 2,
        outputToSlot: 1,
        parameters
      })
      buildings.push(node)

      currentY += direction
      totalDoneRate += currentRate
    }

    return {
      buildings,
      endX: currentX,
      endY: currentY
    }
  }

  private createParameters(
    itemName: string,
    rate: number,
    itemMap: Record<string, { iconId: number }>,
    toBuildingNum: number
  ): { iconId?: number; count?: string } | null {
    const item = itemMap[itemName]
    if (!item || toBuildingNum === 0) {
      return null
    }
    return {
      iconId: item.iconId,
      count: rate.toFixed(1)
    }
  }

  buildAllConnections(
    itemSummary: IItemSummary,
    sorters: ISorterMap,
    itemMap: Record<string, { iconId: number }>,
    startX: number
  ): IBlueprintBuilding[] {
    const allBuildings: IBlueprintBuilding[] = []
    let currentX = startX

    for (const itemName in itemSummary) {
      const itemEntry = itemSummary[itemName]
      const result = this.buildConnection({
        itemName,
        itemEntry,
        sorters,
        itemMap,
        startX: currentX + 1,
        startY: 0
      })
      allBuildings.push(...result.buildings)
      currentX = result.endX
    }

    return allBuildings
  }
}
