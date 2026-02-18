/**
 * BuildingGenerator - 建筑生成器基类
 *
 * 功能：
 * - 生成生产建筑的基础模板
 * - 管理建筑索引和占用区域
 * - 维护分拣器映射
 * - 提供建筑布局基础功能
 *
 * 主要方法：
 * - getBuildingTemplate(): 获取建筑模板
 * - getBuildings(): 获取生成的建筑列表
 * - getSorters(): 获取分拣器映射
 * - getBuildingArray(): 获取建筑数组
 * - getOccupiedArea(): 获取占用区域
 * - getBlueprintSize(): 获取蓝图尺寸
 * - updateConfig(config): 更新配置
 *
 * 上游调用：
 * - generators/building/BuildingGeneratorFactory.ts: 建筑生成器工厂
 *
 * 下游依赖：
 * - types/blueprint.ts: 蓝图类型定义
 * - types/buildingGenerator.ts: 建筑生成器类型定义
 *
 * 子类：
 * - AssemblerGenerator: 制造台生成器
 * - SmelterGenerator: 熔炉生成器
 * - LabGenerator: 研究站生成器
 * - RefineryGenerator: 精炼厂生成器
 * - PlantGenerator: 化工厂生成器
 * - ColliderGenerator: 对撞机生成器
 */
import type { IBlueprintBuilding, ICoordinate } from '../../types/blueprint'
import type {
  IBuildingGeneratorConfig,
  IBuildingLayout,
  ISorterInfo,
  ISorterMap,
  ISubRecipe,
  BuildingArray,
  IOccupiedArea,
  DEFAULT_BUILDING_GENERATOR_CONFIG
} from '../types/buildingGenerator'
import { DEFAULT_BUILDING_GENERATOR_CONFIG as defaultConfig } from '../types/buildingGenerator'

export class BuildingGenerator {
  private buildings: IBlueprintBuilding[] = []
  private sorters: ISorterMap = {}
  private buildingArray: BuildingArray = []
  private buildingIndex: number = -1
  private occupiedArea: IOccupiedArea[] = []
  private blueprintSize: { x: number; y: number } = { x: 0, y: 0 }
  private sprayCoaterOffsetList: ICoordinate[] = []
  private lastProductionBuildingType: number = 0
  private config: IBuildingGeneratorConfig

  constructor(config: Partial<IBuildingGeneratorConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  updateConfig(config: Partial<IBuildingGeneratorConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getBuildingTemplate(): IBlueprintBuilding {
    this.buildingIndex++
    return {
      index: this.buildingIndex,
      areaIndex: 0,
      localOffset: null,
      yaw: [0, 0],
      itemId: 0,
      modelIndex: 0,
      outputObjIdx: -1,
      inputObjIdx: -1,
      outputToSlot: 0,
      inputFromSlot: 0,
      outputFromSlot: 0,
      inputToSlot: 0,
      outputOffset: 0,
      inputOffset: 0,
      recipeId: 0,
      filterId: 0,
      parameters: null
    }
  }

  getBuildings(): IBlueprintBuilding[] {
    return this.buildings
  }

  getSorters(): ISorterMap {
    return this.sorters
  }

  getBuildingArray(): BuildingArray {
    return this.buildingArray
  }

  getBuildingIndex(): number {
    return this.buildingIndex
  }

  getSprayCoaterOffsetList(): ICoordinate[] {
    return this.sprayCoaterOffsetList
  }

  getLastProductionBuildingType(): number {
    return this.lastProductionBuildingType
  }

  getOccupiedArea(): IOccupiedArea[] {
    return this.occupiedArea
  }

  getBlueprintSize(): { x: number; y: number } {
    return this.blueprintSize
  }

  reset(): void {
    this.buildings = []
    this.sorters = {}
    this.buildingArray = []
    this.buildingIndex = -1
    this.occupiedArea = []
    this.blueprintSize = { x: 0, y: 0 }
    this.sprayCoaterOffsetList = []
    this.lastProductionBuildingType = 0
  }

  setBlueprintSize(size: { x: number; y: number }): void {
    this.blueprintSize = size
  }

  addOccupiedArea(area: IOccupiedArea): void {
    this.occupiedArea.push(area)
  }

  addBuilding(building: IBlueprintBuilding): void {
    this.buildings.push(building)
  }

  addSorterEntry(itemName: string, type: 'output' | 'input', info: ISorterInfo): void {
    if (!this.sorters[itemName]) {
      this.sorters[itemName] = {}
    }
    if (!this.sorters[itemName][type]) {
      this.sorters[itemName][type] = []
    }
    this.sorters[itemName][type]!.push(info)
  }

  addSprayCoaterOffset(offset: ICoordinate): void {
    this.sprayCoaterOffsetList.push(offset)
  }

  setLastProductionBuildingType(type: number): void {
    this.lastProductionBuildingType = type
  }
}
