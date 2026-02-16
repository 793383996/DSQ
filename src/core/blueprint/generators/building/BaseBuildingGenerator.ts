import type { IBlueprintBuilding, ICoordinate } from '../../../types/blueprint'
import type {
  IBuildingGeneratorConfig,
  IBuildingLayout,
  ISorterInfo,
  ISorterMap,
  ISubRecipe,
  BuildingArray,
  IOccupiedArea
} from '../../types/buildingGenerator'
import { DEFAULT_BUILDING_GENERATOR_CONFIG } from '../../types/buildingGenerator'

export type { IBuildingGeneratorConfig, ISorterInfo }

export interface IBuildingContext {
  buildingIndex: number
  buildings: IBlueprintBuilding[]
  sorters: ISorterMap
  buildingArray: BuildingArray
  occupiedArea: IOccupiedArea[]
  blueprintSize: { x: number; y: number }
  sprayCoaterOffsetList: ICoordinate[]
  lastProductionBuildingType: number
}

export interface IBuildingGenerateParams {
  subRecipe: ISubRecipe
  context: IBuildingContext
  position: ICoordinate
  buildingMap: Record<
    string,
    {
      itemId: number
      modelIndex: number
      category: number
      slotMaxIndex: number
      productionSpeed: number
      size?: { x: number; y: number }
      height?: number
    }
  >
  itemMap: Record<string, { iconId: number; extra_rate?: number; accelerate?: number }>
  proliferator?: string
}

export interface ISorterGenerateParams {
  buildingIndex: number
  buildingPosition: ICoordinate
  category: number
  slotIndex: number
  itemName: string
  rate: number
  recipeId: number
  buildingName: string
  isOutput: boolean
  context: IBuildingContext
  buildingMap: Record<
    string,
    {
      itemId: number
      modelIndex: number
      sortingSpeed: number
    }
  >
  itemMap: Record<string, { iconId: number }>
  config: IBuildingGeneratorConfig
}

export abstract class BaseBuildingGenerator {
  protected config: IBuildingGeneratorConfig

  constructor(config: Partial<IBuildingGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_BUILDING_GENERATOR_CONFIG, ...config }
  }

  abstract getCategory(): number

  abstract calculateBuildingArea(compactLayout: boolean): IBuildingLayout

  abstract generate(params: IBuildingGenerateParams): IBlueprintBuilding[]

  getBuildingTemplate(index: number): IBlueprintBuilding {
    return {
      index,
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

  protected selectSorter(
    rate: number,
    buildingMap: Record<string, { itemId?: number; modelIndex?: number; sortingSpeed: number }>
  ): { itemId: number; modelIndex: number; sortingSpeed: number } {
    const mk1 = buildingMap.sorterMk1
    const mk3 = buildingMap.sorterMk3
    const mk4 = buildingMap.sorterMk4

    if (this.config.useSorterMk4 && mk4) {
      return {
        itemId: mk4.itemId || 0,
        modelIndex: mk4.modelIndex || 0,
        sortingSpeed: mk4.sortingSpeed
      }
    }

    if (this.config.onlySorterMk3 || rate > mk1.sortingSpeed) {
      return {
        itemId: mk3.itemId || 0,
        modelIndex: mk3.modelIndex || 0,
        sortingSpeed: mk3.sortingSpeed
      }
    }

    return {
      itemId: mk1.itemId || 0,
      modelIndex: mk1.modelIndex || 0,
      sortingSpeed: mk1.sortingSpeed
    }
  }

  protected addSorterEntry(
    sorters: ISorterMap,
    itemName: string,
    type: 'output' | 'input',
    info: ISorterInfo
  ): void {
    if (!sorters[itemName]) {
      sorters[itemName] = {}
    }
    if (!sorters[itemName][type]) {
      sorters[itemName][type] = []
    }
    sorters[itemName][type]!.push(info)
  }

  protected calculateExtraRate(
    subRecipe: ISubRecipe,
    proliferator: string | undefined,
    itemMap: Record<string, { extra_rate?: number; accelerate?: number }>
  ): number {
    let extraRate = 1
    if (proliferator) {
      if (subRecipe.acceleratorMode === 0) {
        extraRate += itemMap[proliferator]?.extra_rate || 0
      } else if (subRecipe.acceleratorMode === 1) {
        extraRate += itemMap[proliferator]?.accelerate || 0
      }
    }
    return extraRate
  }
}
