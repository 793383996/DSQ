import type { IItemSummary, IItemSummaryEntry } from '../types/conveyorGenerator'
import type { ISubRecipe } from '../types/buildingGenerator'
import type { IBuildingData } from '../../types/blueprint'
import { PRODUCTION_CATEGORY } from './SorterGenerator'

export interface IItemSummaryCalculatorConfig {
  stackLayers: number
  maxLabLayers: number
  extraRate: number
}

export const DEFAULT_ITEM_SUMMARY_CONFIG: IItemSummaryCalculatorConfig = {
  stackLayers: 1,
  maxLabLayers: 4,
  extraRate: 1.25
}

export class ItemSummaryCalculator {
  private config: IItemSummaryCalculatorConfig

  constructor(config: Partial<IItemSummaryCalculatorConfig> = {}) {
    this.config = { ...DEFAULT_ITEM_SUMMARY_CONFIG, ...config }
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
    let fromBuildingNum = buildingNum

    if (category === productionCategory.lab) {
      fromBuildingNum = Math.ceil(buildingNum / this.config.maxLabLayers)
    }

    for (const outputItem of subRecipe.output) {
      let outputRate = outputItem.rate * productionSpeed * buildingNum

      if (subRecipe.acceleratorMode === 1) {
        outputRate *= this.config.extraRate
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

    for (const inputItem of subRecipe.input) {
      let itemInputRate = inputItem.rate * productionSpeed * buildingNum

      if (subRecipe.acceleratorMode === 1) {
        itemInputRate *= this.config.extraRate
      }

      const needProliferator = subRecipe.acceleratorMode !== -1

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

  sortItemSummary(itemSummary: IItemSummary): IItemSummary {
    const sorted: IItemSummary = {}
    const proliferatorList = ['proliferatorMk3', 'proliferatorMk2', 'proliferatorMk1']
    const outItem = ['refinedOil', 'hydrogen', 'graphene', 'deuterium']

    for (const key of proliferatorList) {
      if (itemSummary[key] && itemSummary[key].toBuildingNum === 0) {
        sorted[key] = itemSummary[key]
        break
      }
    }

    for (const key in itemSummary) {
      if (itemSummary[key].fromBuildingNum === 0) {
        sorted[key] = itemSummary[key]
      }
    }

    for (const key in itemSummary) {
      if (itemSummary[key].toBuildingNum === 0) {
        sorted[key] = itemSummary[key]
      }
    }

    for (const key of outItem) {
      if (
        itemSummary[key] &&
        itemSummary[key].fromBuildingNum - itemSummary[key].toBuildingNum > 0
      ) {
        sorted[key] = itemSummary[key]
      }
    }

    for (const key in itemSummary) {
      if (itemSummary[key].toBuildingNum !== 0 && itemSummary[key].fromBuildingNum !== 0) {
        sorted[key] = itemSummary[key]
      }
    }

    return sorted
  }
}
