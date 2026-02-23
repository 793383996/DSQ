/**
 * LayoutCalculator - 布局计算器
 *
 * 功能：
 * - 计算建筑的占用区域
 * - 计算蓝图整体尺寸
 * - 计算建筑布局位置
 * - 支持紧凑布局模式
 *
 * 主要方法：
 * - calculateBuildingArea(building, yaw, compactLayout): 计算建筑占用区域
 * - calculateBlueprintArea(buildings, spacing): 计算蓝图整体区域
 * - calculateLayout(building, index, yaw, offsetX, offsetY): 计算建筑布局
 * - getOccupiedArea(): 获取占用区域列表
 * - reset(): 重置状态
 *
 * 上游调用：
 * - core/blueprint/services/BlueprintService.ts: 蓝图生成服务
 * - generators/building/*.ts: 各类建筑生成器
 *
 * 下游依赖：
 * - types/buildingGenerator.ts: 建筑生成器类型定义
 * - types/blueprint.ts: 蓝图类型定义
 *
 * 布局规则：
 * - 根据建筑朝向(yaw)旋转占用区域
 * - 紧凑布局时建筑间距为0
 * - 非紧凑布局时建筑间距为1
 *
 * P6-优化：使用网格索引加速空间查询
 */
import type { IBuildingLayout, IOccupiedArea } from '../types/buildingGenerator'
import type { IBuildingData } from '../../types/blueprint'

const GRID_SIZE = 10

export class LayoutCalculator {
  private occupiedArea: IOccupiedArea[] = []
  private gridIndex: Map<string, Set<number>> = new Map()
  private gridWidth: number = 0
  private gridHeight: number = 0

  private getGridKey(gx: number, gy: number): string {
    return `${gx},${gy}`
  }

  private updateGridIndex(area: IOccupiedArea, areaIndex: number): void {
    const startGx = Math.floor(area.x1 / GRID_SIZE)
    const endGx = Math.floor(area.x2 / GRID_SIZE)
    const startGy = Math.floor(area.y1 / GRID_SIZE)
    const endGy = Math.floor(area.y2 / GRID_SIZE)

    for (let gx = startGx; gx <= endGx; gx++) {
      for (let gy = startGy; gy <= endGy; gy++) {
        const key = this.getGridKey(gx, gy)
        if (!this.gridIndex.has(key)) {
          this.gridIndex.set(key, new Set())
        }
        this.gridIndex.get(key)!.add(areaIndex)
      }
    }
  }

  private getOverlappingAreas(x1: number, y1: number, x2: number, y2: number): Set<number> {
    const result = new Set<number>()
    const startGx = Math.floor(x1 / GRID_SIZE)
    const endGx = Math.floor(x2 / GRID_SIZE)
    const startGy = Math.floor(y1 / GRID_SIZE)
    const endGy = Math.floor(y2 / GRID_SIZE)

    for (let gx = startGx; gx <= endGx; gx++) {
      for (let gy = startGy; gy <= endGy; gy++) {
        const key = this.getGridKey(gx, gy)
        const areas = this.gridIndex.get(key)
        if (areas) {
          areas.forEach(idx => result.add(idx))
        }
      }
    }
    return result
  }

  calculateBuildingArea(
    building: IBuildingData,
    yaw: number,
    compactLayout: boolean = true
  ): { width: number; height: number } {
    if (!building.size) {
      return { width: 1, height: 1 }
    }

    let width = building.size.x
    let height = building.size.y

    if (yaw === 1 || yaw === 3) {
      ;[width, height] = [height, width]
    }

    if (compactLayout) {
      return { width, height }
    }

    return { width: width + 1, height: height + 1 }
  }

  calculateBlueprintArea(
    buildings: Array<{ building: IBuildingData; count: number; yaw: number }>,
    spacing: number = 1
  ): { x: number; y: number } {
    let totalX = 0
    let totalY = 0

    for (const { building, count, yaw } of buildings) {
      const area = this.calculateBuildingArea(building, yaw)
      totalX += area.width * count + spacing * (count - 1)
      totalY = Math.max(totalY, area.height)
    }

    return { x: totalX, y: totalY }
  }

  calculateLayout(
    building: IBuildingData,
    index: number,
    yaw: number,
    offsetX: number = 0,
    offsetY: number = 0
  ): IBuildingLayout {
    const area = this.calculateBuildingArea(building, yaw)
    const x = offsetX
    const y = offsetY

    return {
      x,
      y,
      area: area.width * area.height,
      centerPoint: this.calculateCenterPoint(x, y, area.width, area.height),
      yaw: [yaw, yaw]
    }
  }

  calculateCenterPoint(
    x: number,
    y: number,
    width: number,
    height: number
  ): [number, number, number, number] {
    const centerX = x + width / 2
    const centerY = y + height / 2
    return [centerX, centerY, 0, 0]
  }

  findNextAvailablePosition(
    width: number,
    height: number,
    startX: number = 0,
    startY: number = 0
  ): { x: number; y: number } {
    for (let y = startY; y < 1000; y++) {
      for (let x = startX; x < 1000; x++) {
        if (this.isAreaAvailable(x, y, width, height)) {
          return { x, y }
        }
      }
    }
    return { x: startX, y: startY }
  }

  isAreaAvailable(x: number, y: number, width: number, height: number): boolean {
    const x2 = x + width - 1
    const y2 = y + height - 1

    // P6-优化：使用网格索引快速获取可能重叠的区域
    const candidateAreas = this.getOverlappingAreas(x, y, x2, y2)

    if (candidateAreas.size === 0) {
      return true
    }

    // 只检查候选区域，而非全部区域
    for (const areaIndex of candidateAreas) {
      const area = this.occupiedArea[areaIndex]
      if (area && this.areasOverlap(area, { x1: x, y1: y, x2, y2 })) {
        return false
      }
    }
    return true
  }

  areasOverlap(a: IOccupiedArea, b: IOccupiedArea): boolean {
    return !(a.x2 < b.x1 || b.x2 < a.x1 || a.y2 < b.y1 || b.y2 < a.y1)
  }

  occupyArea(x: number, y: number, width: number, height: number): IOccupiedArea {
    const area: IOccupiedArea = {
      x1: x,
      y1: y,
      x2: x + width - 1,
      y2: y + height - 1
    }
    const areaIndex = this.occupiedArea.length
    this.occupiedArea.push(area)

    // P6-优化：更新网格索引
    this.updateGridIndex(area, areaIndex)

    return area
  }

  reset(): void {
    this.occupiedArea = []
    this.gridIndex.clear()
    this.gridWidth = 0
    this.gridHeight = 0
  }

  getOccupiedArea(): IOccupiedArea[] {
    return this.occupiedArea
  }

  setOccupiedArea(areas: IOccupiedArea[]): void {
    this.occupiedArea = areas
    // P6-优化：重建网格索引
    this.gridIndex.clear()
    areas.forEach((area, index) => {
      this.updateGridIndex(area, index)
    })
  }
}
