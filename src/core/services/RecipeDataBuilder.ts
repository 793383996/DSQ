import type { IConsumptionItem, IResultItemOutput } from '../types/recipe'
import type { ISubRecipe } from '../blueprint/types/buildingGenerator'
import type { DemandItem } from '../../stores/blueprint'
import itemMapData from '../data/itemMap.json'
import { logger } from '../../utils/logger'

type TableItem = IConsumptionItem | IResultItemOutput

export interface IRecipeBuildResult {
  recipeList: ISubRecipe[]
  proliferator: string | null
  blueprintTitle: string
  blueprintDesc: string
  blueprintIcon: number[]
}

interface IItemMapEntry {
  iconId: number
  name: string
  remark?: string
}

interface ItemMapData {
  [key: string]: IItemMapEntry
}

const ITEM_MAP = itemMapData as ItemMapData

function getItemMapByRemark(): Map<string, IItemMapEntry> {
  const map = new Map<string, IItemMapEntry>()
  Object.values(ITEM_MAP).forEach(entry => {
    if (entry.remark) {
      map.set(entry.remark, entry)
    }
  })
  return map
}

export class RecipeDataBuilder {
  private itemMapByRemark: Map<string, IItemMapEntry>

  constructor() {
    this.itemMapByRemark = getItemMapByRemark()
  }

  buildRecipeData(
    consumptionItems: TableItem[],
    demandList: DemandItem[],
    defaultAccType: string = '增产剂Mk.Ⅰ'
  ): IRecipeBuildResult {
    const recipeList: ISubRecipe[] = []
    let proliferator: string | null = null
    let blueprintTitle = ''
    let blueprintDesc = ''
    const blueprintIcon: number[] = []

    let outputHasHydrogen = false
    let inputHasHydrogen = false

    const outputItemNames: string[] = []

    for (const item of consumptionItems) {
      const isInput = this.isInputItem(item)
      const buildingName = this.getBuildingName(item)
      const machineCount = this.getMachineCount(item)
      const acceleratorMode = this.getAcceleratorMode(item)
      const inputOutput = this.getInputOutput(item, isInput)

      if (inputOutput.outputHasHydrogen) {
        outputHasHydrogen = true
      }
      if (inputOutput.inputHasHydrogen) {
        inputHasHydrogen = true
      }

      const proliferatorType = this.getProliferatorType(item, defaultAccType)
      if (proliferatorType) {
        if (proliferator && proliferator !== proliferatorType) {
          logger.warn('[RecipeDataBuilder] 检测到不同等级的增产剂选择，使用第一个增产剂类型')
        } else if (!proliferator) {
          proliferator = proliferatorType
        }
      }

      const subRecipe: ISubRecipe = {
        building: isInput
          ? undefined
          : {
              name: this.convertBuildingName(buildingName),
              num: machineCount
            },
        output: inputOutput.output,
        input: inputOutput.input,
        acceleratorMode,
        recipeID: item.name
      }

      recipeList.push(subRecipe)

      if (!isInput) {
        outputItemNames.push(item.name)
      }
    }

    if (inputHasHydrogen && outputHasHydrogen) {
      for (const recipe of recipeList) {
        if (!recipe.input) continue
        for (const output of recipe.output || []) {
          if (output.name === 'hydrogen') {
            output.name = 'hydrogenOutput'
          }
        }
      }
    }

    const titleResult = this.buildBlueprintTitle(demandList)
    blueprintTitle = titleResult.title
    blueprintDesc = titleResult.desc

    for (const name of outputItemNames) {
      const iconId = this.getIconId(name)
      if (iconId !== null && blueprintIcon.length < 5) {
        blueprintIcon.push(iconId)
      }
    }

    while (blueprintIcon.length < 5) {
      blueprintIcon.push(0)
    }

    return {
      recipeList,
      proliferator,
      blueprintTitle,
      blueprintDesc,
      blueprintIcon
    }
  }

  private isInputItem(item: TableItem): boolean {
    const value = parseFloat(item.number1)
    return value < 0 || (item as IConsumptionItem).accType !== undefined
  }

  private getBuildingName(item: TableItem): string {
    if (item.machineName) {
      return item.machineName
    }
    if (item.m && item.m.length > 0) {
      const selected = item.m.find(m => m.class.includes('selected'))
      return selected?.name || item.m[0].name
    }
    return ''
  }

  private getMachineCount(item: TableItem): number {
    const numStr = item.number2
    if (!numStr || numStr === '-') return 0
    return parseFloat(numStr) || 0
  }

  private getAcceleratorMode(item: TableItem): number {
    const consumItem = item as IConsumptionItem
    if (!consumItem.accValue || consumItem.accValue.length === 0) return -1

    const selected = consumItem.accValue.find(av => av.class.includes('selected'))
    if (!selected) return -1

    if (selected.name === '加速') return 1
    if (selected.name === '增产') return 0
    return -1
  }

  private getProliferatorType(item: TableItem, defaultAccType: string): string | null {
    const consumItem = item as IConsumptionItem
    if (!consumItem.accType || consumItem.accType.length === 0) {
      return null
    }

    const selected = consumItem.accType.find(at => at.class.includes('selected'))
    if (!selected) return null

    const accName = selected.name
    if (accName === '增产剂Mk.Ⅰ') return 'proliferatorMk1'
    if (accName === '增产剂Mk.Ⅱ') return 'proliferatorMk2'
    if (accName === '增产剂Mk.Ⅲ') return 'proliferatorMk3'

    return null
  }

  private getInputOutput(
    item: TableItem,
    isInput: boolean
  ): {
    output: Array<{ name: string; rate: number }>
    input: Array<{ name: string; rate: number }> | null
    outputHasHydrogen: boolean
    inputHasHydrogen: boolean
  } {
    const output: Array<{ name: string; rate: number }> = []
    const input: Array<{ name: string; rate: number }> = []
    let outputHasHydrogen = false
    let inputHasHydrogen = false

    const rate = Math.abs(parseFloat(item.number1)) / 60

    if (isInput) {
      const englishName = this.convertToEnglishName(item.name)
      output.push({ name: englishName, rate })
      if (englishName === 'hydrogen') {
        inputHasHydrogen = true
      }
      return { output, input: null, outputHasHydrogen, inputHasHydrogen }
    }

    const consumItem = item as IConsumptionItem
    const t = parseFloat(item.t) || 1

    const outputName = this.convertToEnglishName(item.name)
    const outputRate = parseFloat(item.number1) / 60
    output.push({ name: outputName, rate: outputRate })
    if (outputName === 'hydrogen') {
      outputHasHydrogen = true
    }

    if (consumItem.pf && consumItem.pf.length > 0) {
      const selectedPf = consumItem.pf.find(pf => pf.class.includes('selected'))
      if (selectedPf && selectedPf.showName) {
        const pfRateMatch = selectedPf.title?.match(/([\d.]+)\/s/)
        if (pfRateMatch) {
          const pfRate = parseFloat(pfRateMatch[1])
          output[0].rate = pfRate
        }
      }
    }

    return { output, input: input.length > 0 ? input : null, outputHasHydrogen, inputHasHydrogen }
  }

  private convertToEnglishName(chineseName: string): string {
    const entry = this.itemMapByRemark.get(chineseName)
    if (entry && entry.name) {
      return entry.name
    }

    const directEntry = Object.values(ITEM_MAP).find(
      e => e.remark === chineseName || e.name === chineseName
    )
    if (directEntry) {
      return directEntry.name
    }

    logger.warn(`[RecipeDataBuilder] 未找到物品映射: ${chineseName}`)
    return chineseName
  }

  private convertBuildingName(chineseName: string): string {
    const buildingMap: Record<string, string> = {
      '制作台Mk.Ⅰ': 'assemblingMachineMk1',
      '制作台Mk.Ⅱ': 'assemblingMachineMk2',
      '制作台Mk.Ⅲ': 'assemblingMachineMk3',
      电弧熔炉: 'arcSmelter',
      位面熔炉: 'planeSmelter',
      原油萃取站: 'oilRefinery',
      化工厂: 'chemicalPlant',
      矩阵研究站: 'lab',
      采矿机: 'miner',
      大型采矿机: 'advancedMiner',
      轨道采集器: 'orbitalCollector',
      '轨道采集器(气态)': 'orbitalCollector',
      '轨道采集器(巨冰)': 'orbitalCollector',
      射线接收塔: 'rayReceiver',
      分馏塔: 'fractionator',
      垂直发射井: 'emitter',
      电磁轨道弹射器: 'silo',
      能量枢纽: 'powerExchanger',
      能量蓄电器: 'accumulator',
      喷涂机: 'sprayCoater',
      巨型储液罐: 'storageTank',
      液灌装站: 'tankStorage'
    }

    return buildingMap[chineseName] || chineseName
  }

  private getIconId(itemName: string): number | null {
    const entry = this.itemMapByRemark.get(itemName)
    if (entry && entry.iconId !== undefined) {
      return entry.iconId
    }

    const directEntry = Object.values(ITEM_MAP).find(
      e => e.remark === itemName || e.name === itemName
    )
    if (directEntry && directEntry.iconId !== undefined) {
      return directEntry.iconId
    }

    return null
  }

  private buildBlueprintTitle(demandList: DemandItem[]): { title: string; desc: string } {
    if (demandList.length === 0) {
      return { title: '蓝图', desc: '' }
    }

    const firstDemand = demandList[0]
    const title = `${firstDemand.name}-${firstDemand.num}min`

    const descParts: string[] = []
    for (let i = 1; i < demandList.length && i < 5; i++) {
      const demand = demandList[i]
      descParts.push(`${demand.name}-${demand.num}min`)
    }

    return { title, desc: descParts.join('\n') }
  }
}

export const recipeDataBuilder = new RecipeDataBuilder()
