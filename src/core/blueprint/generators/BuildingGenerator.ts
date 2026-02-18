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
