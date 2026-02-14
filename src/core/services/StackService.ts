import type {
  IStackConfig,
  ISubRecipe,
  IItemSummary,
  ISorterMap,
  ICloneFilter,
  ICloneResult
} from '../types/stack'
import { DEFAULT_STACK_CONFIG, BELT_ITEM_IDS, Z_STEP } from '../types/stack'
import type { IBlueprintBuilding } from '../types/blueprint'
import { buildIndexMap, cloneBuildingWithRemap } from '../utils/IndexMapper'
import buildingMapData from '../data/buildingMap.json'
import productionCategoryData from '../data/productionCategory.json'

const LAB_CATEGORY = productionCategoryData.lab
const LAB_ITEM_IDS = new Set<number>()
const SPRAY_COATER_ITEM_ID: number = (() => {
  const buildings = buildingMapData as Record<string, any>
  if (buildings.lab) LAB_ITEM_IDS.add(buildings.lab.itemId)
  if (buildings['自演化研究站']) LAB_ITEM_IDS.add(buildings['自演化研究站'].itemId)
  return buildings.sprayCoater?.itemId ?? 2313
})()

function getBuildingCategory(buildingName: string): number | undefined {
  const building = (buildingMapData as Record<string, any>)[buildingName]
  return building?.category
}

function createFoundationBuilding(zOffset: number, index: number): IBlueprintBuilding {
  return {
    index,
    areaIndex: 0,
    localOffset: [
      { x: 0, y: 0, z: zOffset },
      { x: 0, y: 0, z: zOffset }
    ],
    yaw: [0, 0],
    itemId: 1131,
    modelIndex: 37,
    outputObjIdx: -1,
    inputObjIdx: -1,
    outputToSlot: 0,
    inputFromSlot: 0,
    outputFromSlot: 0,
    inputToSlot: 1,
    outputOffset: 0,
    inputOffset: 0,
    recipeId: 0,
    filterId: 0,
    parameters: null
  }
}

export class StackService {
  private config: IStackConfig
  private buildingIndex: number = 0

  constructor(config: Partial<IStackConfig> = {}) {
    this.config = { ...DEFAULT_STACK_CONFIG, ...config }
    if (this.config.stackLayers < 1) {
      console.warn('[StackService] stackLayers must be >= 1, auto-correcting to 1')
      this.config.stackLayers = 1
    }
    if (this.config.zStep <= 0) {
      console.warn('[StackService] zStep must be > 0, auto-correcting to default')
      this.config.zStep = DEFAULT_STACK_CONFIG.zStep
    }
  }

  getConfig(): IStackConfig {
    return { ...this.config }
  }

  setBuildingIndex(index: number): void {
    this.buildingIndex = index
  }

  getBuildingIndex(): number {
    return this.buildingIndex
  }

  reduceBuildingNum(subRecipes: ISubRecipe[]): void {
    if (this.config.stackLayers <= 1) return

    for (const subRecipe of subRecipes) {
      if (subRecipe.building) {
        const category = getBuildingCategory(subRecipe.building.name)
        if (category !== LAB_CATEGORY) {
          subRecipe.building.num = Math.ceil(subRecipe.building.num / this.config.stackLayers)
        }
      }
    }
  }

  scaleItemSummary(itemSummary: IItemSummary): void {
    if (this.config.stackLayers <= 1) return

    for (const key in itemSummary) {
      itemSummary[key].rate *= this.config.stackLayers
      if (itemSummary[key].inputRate !== undefined) {
        itemSummary[key].inputRate *= this.config.stackLayers
      }
    }
  }

  scaleSorters(sorters: ISorterMap): void {
    if (this.config.stackLayers <= 1) return

    for (const itemName in sorters) {
      const sorter = sorters[itemName]
      if (sorter.output) {
        for (const s of sorter.output) {
          s.rate *= this.config.stackLayers
        }
      }
      if (sorter.input) {
        for (const s of sorter.input) {
          s.rate *= this.config.stackLayers
        }
      }
    }
  }

  getSortersPerNode(): number {
    if (this.config.stackLayers <= 1) {
      return this.config.maxSorterNumOneBelt
    }
    return Math.max(1, Math.floor(this.config.maxSorterNumOneBelt / this.config.stackLayers))
  }

  getZOffset(layer: number): number {
    return layer * this.config.zStep
  }

  createCloneFilter(baseBuildings: IBlueprintBuilding[]): ICloneFilter {
    const labIndices = new Set<number>()
    for (const b of baseBuildings) {
      if (LAB_ITEM_IDS.has(b.itemId)) {
        labIndices.add(b.index)
      }
    }

    return {
      labItemIds: LAB_ITEM_IDS,
      beltItemIds: BELT_ITEM_IDS,
      sprayCoaterItemId: SPRAY_COATER_ITEM_ID,
      labIndices
    }
  }

  isCloneable(building: IBlueprintBuilding, filter: ICloneFilter): boolean {
    if (filter.labItemIds.has(building.itemId)) return false
    if (filter.beltItemIds.has(building.itemId)) return false
    if (building.itemId === filter.sprayCoaterItemId) return false
    if (
      filter.labIndices.has(building.inputObjIdx) ||
      filter.labIndices.has(building.outputObjIdx)
    ) {
      return false
    }
    return true
  }

  /**
   * 将 z=0 层的建筑克隆到 z=10, z=20, ... 层
   *
   * @param baseBuildings - z=0 层的全部建筑（包括传送带、Lab等，会自动过滤）
   * @param currentBuildingIndex - 当前最后一个建筑的 index（即 baseBuildings 中最大 index）
   * @returns 克隆结果，包含克隆建筑、地基、按层存储的 indexMap
   *
   * 地基连接规则：
   * - layer=0 地基(z=-10) → index = foundationStartIndex + 0
   * - layer=1 地基(z=0)   → index = foundationStartIndex + 1
   * - layer=2 地基(z=10)  → index = foundationStartIndex + 2
   * - layer=3 地基(z=20)  → index = foundationStartIndex + 3
   *
   * 设备 inputObjIdx 规则：
   * - layer=1 设备(z=10)  → inputObjIdx = foundationStartIndex + 1 (z=0 地基)
   * - layer=2 设备(z=20)  → inputObjIdx = foundationStartIndex + 2 (z=10 地基)
   * - layer=3 设备(z=30)  → inputObjIdx = foundationStartIndex + 3 (z=20 地基)
   */
  cloneToStackLayers(
    baseBuildings: IBlueprintBuilding[],
    currentBuildingIndex: number
  ): ICloneResult {
    const result: ICloneResult = {
      buildings: [],
      foundations: [],
      indexMap: new Map()
    }

    if (this.config.stackLayers <= 1) {
      return result
    }

    if (baseBuildings.length === 0) {
      return result
    }

    const maxIndex = Math.max(...baseBuildings.map(b => b.index))
    if (currentBuildingIndex < maxIndex) {
      console.warn(
        `[StackService] currentBuildingIndex(${currentBuildingIndex}) < max base index(${maxIndex}), auto-correcting`
      )
      currentBuildingIndex = maxIndex
    }

    const stackLayers = this.config.stackLayers
    const zStep = this.config.zStep
    const foundationStartIndex = currentBuildingIndex + 1

    for (let layer = 0; layer < stackLayers; layer++) {
      const foundationZ = (layer - 1) * zStep
      const foundation = createFoundationBuilding(foundationZ, foundationStartIndex + layer)
      result.foundations.push(foundation)
    }

    const filter = this.createCloneFilter(baseBuildings)
    const cloneableBuildings = baseBuildings.filter(b => this.isCloneable(b, filter))

    let nextBuildingIndex = foundationStartIndex + stackLayers

    for (let layer = 1; layer < stackLayers; layer++) {
      const zOffset = layer * zStep
      const layerIndexMap = buildIndexMap(cloneableBuildings, nextBuildingIndex - 1)
      result.indexMap.set(layer, layerIndexMap)

      for (const base of cloneableBuildings) {
        const newIndex = layerIndexMap.get(base.index)!
        const clone = cloneBuildingWithRemap(
          base,
          newIndex,
          zOffset,
          layer,
          foundationStartIndex,
          layerIndexMap
        )
        result.buildings.push(clone)
        nextBuildingIndex++
      }
    }

    this.buildingIndex = nextBuildingIndex

    return result
  }
}

export function createStackService(config: Partial<IStackConfig> = {}): StackService {
  return new StackService(config)
}
