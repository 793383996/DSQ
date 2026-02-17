import type { IItemSummary, IItemSummaryEntry } from '../types/conveyorGenerator'
import type { ISubRecipe, ISorterMap } from '../types/buildingGenerator'
import type { IBuildingData } from '../../types/blueprint'
import { PRODUCTION_CATEGORY } from './SorterGenerator'

const PROLIFERATOR_PRIORITY_LIST = ['proliferatorMk3', 'proliferatorMk2', 'proliferatorMk1']
const BYPRODUCT_PRIORITY_LIST = ['refinedOil', 'hydrogen', 'graphene', 'deuterium']

export interface IProliferatorItemMap {
  extra_rate?: number
  accelerate?: number
}

export interface IItemSummaryCalculatorConfig {
  stackLayers: number
  maxLabLayers: number
  extraRate: number
  proliferator?: string
  itemMap?: Record<string, IProliferatorItemMap>
}

export const DEFAULT_ITEM_SUMMARY_CONFIG: IItemSummaryCalculatorConfig = {
  stackLayers: 1,
  maxLabLayers: 4,
  extraRate: 1.25,
  proliferator: undefined,
  itemMap: undefined
}

export class ItemSummaryCalculator {
  private config: IItemSummaryCalculatorConfig

  constructor(config: Partial<IItemSummaryCalculatorConfig> = {}) {
    this.config = { ...DEFAULT_ITEM_SUMMARY_CONFIG, ...config }
  }

  updateConfig(config: Partial<IItemSummaryCalculatorConfig>): void {
    this.config = { ...this.config, ...config }
  }

  private calculateExtraRate(acceleratorMode: number): number {
    let extraRate = 1

    if (this.config.proliferator && this.config.itemMap && acceleratorMode !== -1) {
      const prolifItem = this.config.itemMap[this.config.proliferator]
      if (acceleratorMode === 0) {
        extraRate += prolifItem?.extra_rate || 0
      } else if (acceleratorMode === 1) {
        extraRate += prolifItem?.accelerate || 0
      }
    }

    return extraRate
  }

  calculate(
    subRecipes: ISubRecipe[],
    buildingMap: Record<string, IBuildingData>,
    productionCategory: typeof PRODUCTION_CATEGORY
  ): IItemSummary {
    const itemSummary: IItemSummary = {}

    for (const subRecipe of subRecipes) {
      if (!subRecipe.building) {
        continue
      }

      const building = buildingMap[subRecipe.building.name]
      if (!building) {
        continue
      }

      const productionSpeed = building.productionSpeed || 1
      const category = building.category ?? 0

      this.processOutputs(
        subRecipe,
        building,
        productionSpeed,
        category,
        productionCategory,
        itemSummary
      )
      this.processInputs(
        subRecipe,
        building,
        productionSpeed,
        category,
        productionCategory,
        itemSummary
      )
    }

    this.normalizeItemSummary(itemSummary)
    this.applyStackLayers(itemSummary)
    const sortedSummary = this.sortItemSummary(itemSummary)

    return sortedSummary
  }

  private processOutputs(
    subRecipe: ISubRecipe,
    building: IBuildingData,
    productionSpeed: number,
    category: number,
    productionCategory: typeof PRODUCTION_CATEGORY,
    itemSummary: IItemSummary
  ): void {
    if (!subRecipe.output) {
      return
    }

    const buildingNum = subRecipe.building?.num || 0
    const isRawMaterial = subRecipe.input === null

    let fromBuildingNum = 0
    if (isRawMaterial) {
      fromBuildingNum = 0
    } else {
      if (category === productionCategory.lab) {
        fromBuildingNum = Math.ceil(buildingNum / this.config.maxLabLayers)
      } else {
        fromBuildingNum = buildingNum
      }
    }

    const extraRate = this.calculateExtraRate(subRecipe.acceleratorMode ?? -1)

    for (const outputItem of subRecipe.output) {
      let outputRate: number
      if (isRawMaterial) {
        outputRate = outputItem.rate
      } else {
        outputRate = outputItem.rate * productionSpeed * buildingNum * extraRate
      }

      if (itemSummary[outputItem.name]) {
        itemSummary[outputItem.name].fromBuildingNum += fromBuildingNum
        itemSummary[outputItem.name].rate += outputRate
      } else {
        itemSummary[outputItem.name] = {
          rate: outputRate,
          fromBuildingNum,
          toBuildingNum: 0
        }
      }
    }
  }

  private processInputs(
    subRecipe: ISubRecipe,
    building: IBuildingData,
    productionSpeed: number,
    category: number,
    productionCategory: typeof PRODUCTION_CATEGORY,
    itemSummary: IItemSummary
  ): void {
    if (!subRecipe.input) {
      return
    }

    const buildingNum = subRecipe.building?.num || 0
    let toBuildingNum = buildingNum

    if (category === productionCategory.lab) {
      toBuildingNum = Math.ceil(buildingNum / this.config.maxLabLayers)
    }

    const acceleratorMode = subRecipe.acceleratorMode ?? -1
    const needProliferator = acceleratorMode !== -1

    let inputExtraRate = 1
    if (acceleratorMode === 1 && this.config.proliferator && this.config.itemMap) {
      const prolifItem = this.config.itemMap[this.config.proliferator]
      inputExtraRate += prolifItem?.accelerate || 0
    }

    for (const inputItem of subRecipe.input) {
      const itemInputRate = inputItem.rate * productionSpeed * buildingNum * inputExtraRate

      if (itemSummary[inputItem.name]) {
        itemSummary[inputItem.name].toBuildingNum += toBuildingNum
        if (!itemSummary[inputItem.name].needProliferator && needProliferator) {
          itemSummary[inputItem.name].needProliferator = true
        }
        itemSummary[inputItem.name].inputRate =
          (itemSummary[inputItem.name].inputRate || 0) + itemInputRate
      } else {
        itemSummary[inputItem.name] = {
          rate: 0,
          inputRate: itemInputRate,
          fromBuildingNum: 0,
          toBuildingNum,
          needProliferator
        }
      }
    }
  }

  private normalizeItemSummary(itemSummary: IItemSummary): void {
    for (const key in itemSummary) {
      const entry = itemSummary[key]
      if (entry.rate === 0 && (entry.inputRate ?? 0) !== 0) {
        entry.rate = entry.inputRate ?? 0
      }
    }
  }

  private applyStackLayers(itemSummary: IItemSummary): void {
    if (this.config.stackLayers <= 1) {
      return
    }

    for (const key in itemSummary) {
      itemSummary[key].rate *= this.config.stackLayers
      if (itemSummary[key].inputRate !== undefined) {
        itemSummary[key].inputRate! *= this.config.stackLayers
      }
    }
  }

  static applyStackLayersToSorters(sorters: ISorterMap, stackLayers: number): void {
    if (stackLayers <= 1) {
      return
    }

    for (const itemName in sorters) {
      const sorter = sorters[itemName]
      if (sorter.output) {
        for (const s of sorter.output) {
          s.rate *= stackLayers
        }
      }
      if (sorter.input) {
        for (const s of sorter.input) {
          s.rate *= stackLayers
        }
      }
    }
  }

  sortItemSummary(itemSummary: IItemSummary): IItemSummary {
    const sorted: IItemSummary = {}
    const addedKeys = new Set<string>()

    for (const key of PROLIFERATOR_PRIORITY_LIST) {
      if (itemSummary[key] && itemSummary[key].toBuildingNum === 0) {
        sorted[key] = itemSummary[key]
        addedKeys.add(key)
        break
      }
    }

    for (const key in itemSummary) {
      if (!addedKeys.has(key) && itemSummary[key].fromBuildingNum === 0) {
        sorted[key] = itemSummary[key]
        addedKeys.add(key)
      }
    }

    for (const key in itemSummary) {
      if (!addedKeys.has(key) && itemSummary[key].toBuildingNum === 0) {
        sorted[key] = itemSummary[key]
        addedKeys.add(key)
      }
    }

    for (const key of BYPRODUCT_PRIORITY_LIST) {
      if (
        !addedKeys.has(key) &&
        itemSummary[key] &&
        itemSummary[key].fromBuildingNum - itemSummary[key].toBuildingNum > 0
      ) {
        sorted[key] = itemSummary[key]
        addedKeys.add(key)
      }
    }

    for (const key in itemSummary) {
      if (
        !addedKeys.has(key) &&
        itemSummary[key].toBuildingNum !== 0 &&
        itemSummary[key].fromBuildingNum !== 0
      ) {
        sorted[key] = itemSummary[key]
        addedKeys.add(key)
      }
    }

    return sorted
  }
}
