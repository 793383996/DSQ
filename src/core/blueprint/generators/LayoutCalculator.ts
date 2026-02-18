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
 */
import type { IBuildingLayout, IOccupiedArea } from '../types/buildingGenerator'
import type { IBuildingData } from '../../types/blueprint'

export class LayoutCalculator {
  private occupiedArea: IOccupiedArea[] = []

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
    const newArea: IOccupiedArea = {
      x1: x,
      y1: y,
      x2: x + width - 1,
      y2: y + height - 1
    }

    for (const area of this.occupiedArea) {
      if (this.areasOverlap(area, newArea)) {
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
    this.occupiedArea.push(area)
    return area
  }

  reset(): void {
    this.occupiedArea = []
  }

  getOccupiedArea(): IOccupiedArea[] {
    return this.occupiedArea
  }

  setOccupiedArea(areas: IOccupiedArea[]): void {
    this.occupiedArea = areas
  }
}
