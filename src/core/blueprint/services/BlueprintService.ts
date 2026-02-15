import type { IBlueprintData, IBlueprintBuilding, IBuildingData } from '../../types/blueprint'
import type {
  IBuildingGeneratorConfig,
  ISorterMap,
  ISubRecipe,
  DEFAULT_BUILDING_GENERATOR_CONFIG
} from '../types/buildingGenerator'
import type { IItemSummary, IConveyorGeneratorConfig } from '../types/conveyorGenerator'
import { DEFAULT_BUILDING_GENERATOR_CONFIG as defaultBuildingConfig } from '../types/buildingGenerator'
import { BuildingGenerator } from '../generators/BuildingGenerator'
import { LayoutCalculator } from '../generators/LayoutCalculator'
import { SorterGenerator, PRODUCTION_CATEGORY } from '../generators/SorterGenerator'
import { ItemSummaryCalculator } from '../generators/ItemSummaryCalculator'
import { ConveyorGenerator } from '../generators/ConveyorGenerator'
import { ConnectionBuilder } from '../generators/ConnectionBuilder'

export interface IBlueprintServiceConfig extends IBuildingGeneratorConfig {
  xYRatio: number
  extraRate: number
}

export interface IBlueprintGenerateOptions {
  recipes: ISubRecipe[]
  buildingMap: Record<string, IBuildingData>
  itemMap: Record<string, { iconId: number; name: string }>
  proliferator?: string
}

export const DEFAULT_BLUEPRINT_SERVICE_CONFIG: IBlueprintServiceConfig = {
  conveyorBeltStackLayer: 4,
  onlyConveyorBeltMk3: false,
  onlySorterMk3: false,
  useSorterMk4: false,
  selfSpray: false,
  generateTeslaTower: false,
  teslaTowerInterval: 10,
  teslaTowerLineInterval: 2,
  compactLayout: true,
  maxLabLayers: 4,
  stackLayers: 1,
  upgradeConveyorBelt: true,
  onlyConveyorBeltMk3Downgrade: false,
  xYRatio: 1.5,
  extraRate: 1.25
}

export class BlueprintService {
  private config: IBlueprintServiceConfig
  private buildingGenerator: BuildingGenerator
  private layoutCalculator: LayoutCalculator
  private sorterGenerator: SorterGenerator
  private itemSummaryCalculator: ItemSummaryCalculator
  private conveyorGenerator: ConveyorGenerator
  private connectionBuilder: ConnectionBuilder

  constructor(config: Partial<IBlueprintServiceConfig> = {}) {
    this.config = { ...DEFAULT_BLUEPRINT_SERVICE_CONFIG, ...config }

    this.buildingGenerator = new BuildingGenerator(this.config)
    this.layoutCalculator = new LayoutCalculator()
    this.sorterGenerator = new SorterGenerator()
    this.itemSummaryCalculator = new ItemSummaryCalculator({
      stackLayers: this.config.stackLayers,
      maxLabLayers: this.config.maxLabLayers,
      extraRate: this.config.extraRate
    })
    this.conveyorGenerator = new ConveyorGenerator(
      {},
      {
        onlyConveyorBeltMk3: this.config.onlyConveyorBeltMk3,
        onlyConveyorBeltMk3Downgrade: this.config.onlyConveyorBeltMk3Downgrade,
        upgradeConveyorBelt: this.config.upgradeConveyorBelt,
        conveyorBeltStackLayer: this.config.conveyorBeltStackLayer,
        maxSorterNumOneBelt: 8,
        stackLayers: this.config.stackLayers,
        useSorterMk4: this.config.useSorterMk4,
        onlySorterMk3: this.config.onlySorterMk3,
        selfSpray: this.config.selfSpray
      }
    )
    this.connectionBuilder = new ConnectionBuilder({
      maxSorterNumOneBelt: 8,
      stackLayers: this.config.stackLayers
    })
  }

  generate(options: IBlueprintGenerateOptions): IBlueprintData {
    const { recipes, buildingMap, itemMap, proliferator } = options

    this.reset()

    const blueprintSize = this.calculateBlueprintSize(recipes, buildingMap)
    this.buildingGenerator.setBlueprintSize(blueprintSize)
    this.initOccupiedArea(blueprintSize)

    const buildings = this.generateBuildings(recipes, buildingMap)
    const sorters = this.buildingGenerator.getSorters()
    const itemSummary = this.itemSummaryCalculator.calculate(
      recipes,
      buildingMap,
      PRODUCTION_CATEGORY
    )

    const conveyorBuildings = this.generateConveyors(itemSummary, sorters, buildingMap, itemMap)

    const allBuildings = [...buildings, ...conveyorBuildings]
    this.connectBuildings(allBuildings, sorters, itemSummary)

    return this.createBlueprintData(allBuildings)
  }

  private reset(): void {
    this.buildingGenerator.reset()
    this.layoutCalculator.reset()
    this.conveyorGenerator.reset()
  }

  private calculateBlueprintSize(
    recipes: ISubRecipe[],
    buildingMap: Record<string, IBuildingData>
  ): { x: number; y: number } {
    let totalArea = 0

    for (const subRecipe of recipes) {
      if (!subRecipe.building) {
        continue
      }

      const building = buildingMap[subRecipe.building.name]
      if (!building?.size) {
        continue
      }

      const area = building.size.x * building.size.y
      totalArea += area * Math.ceil(subRecipe.building.num)
    }

    const y = Math.ceil(Math.sqrt(totalArea / this.config.xYRatio))
    const x = Math.ceil(this.config.xYRatio * y)

    return { x, y }
  }

  private initOccupiedArea(size: { x: number; y: number }): void {
    this.buildingGenerator.addOccupiedArea({
      x1: -1,
      y1: -1,
      x2: size.x,
      y2: -1
    })
  }

  private generateBuildings(
    recipes: ISubRecipe[],
    buildingMap: Record<string, IBuildingData>
  ): IBlueprintBuilding[] {
    const buildings: IBlueprintBuilding[] = []

    for (const subRecipe of recipes) {
      if (!subRecipe.building) {
        continue
      }

      const subBuildings = this.generateSubRecipeBuildings(subRecipe, buildingMap)
      buildings.push(...subBuildings)
    }

    return buildings
  }

  private generateSubRecipeBuildings(
    subRecipe: ISubRecipe,
    buildingMap: Record<string, IBuildingData>
  ): IBlueprintBuilding[] {
    const buildings: IBlueprintBuilding[] = []
    const building = buildingMap[subRecipe.building!.name]

    if (!building) {
      return buildings
    }

    const num = Math.ceil(subRecipe.building!.num)
    const layout = this.layoutCalculator.calculateLayout(building, 0, 0)

    for (let i = 0; i < num; i++) {
      const template = this.buildingGenerator.getBuildingTemplate()

      template.itemId = building.itemId
      template.modelIndex = building.modelIndex
      template.recipeId =
        typeof subRecipe.recipeID === 'string'
          ? parseInt(subRecipe.recipeID)
          : subRecipe.recipeID || 0
      template.localOffset = [
        { x: layout.x, y: layout.y, z: 0 },
        { x: layout.x, y: layout.y, z: 0 }
      ]
      template.yaw = layout.yaw

      buildings.push(template)
      this.buildingGenerator.addBuilding(template)
    }

    return buildings
  }

  private generateConveyors(
    itemSummary: IItemSummary,
    sorters: ISorterMap,
    buildingMap: Record<string, IBuildingData>,
    itemMap: Record<string, { iconId: number; name: string }>
  ): IBlueprintBuilding[] {
    this.conveyorGenerator = new ConveyorGenerator(buildingMap, {
      onlyConveyorBeltMk3: this.config.onlyConveyorBeltMk3,
      onlyConveyorBeltMk3Downgrade: this.config.onlyConveyorBeltMk3Downgrade,
      upgradeConveyorBelt: this.config.upgradeConveyorBelt,
      conveyorBeltStackLayer: this.config.conveyorBeltStackLayer,
      maxSorterNumOneBelt: 8,
      stackLayers: this.config.stackLayers,
      useSorterMk4: this.config.useSorterMk4,
      onlySorterMk3: this.config.onlySorterMk3,
      selfSpray: this.config.selfSpray
    })
    this.conveyorGenerator.setBuildingIndex(this.buildingGenerator.getBuildingIndex())
    this.conveyorGenerator.setOccupiedAreaX(
      this.buildingGenerator.getOccupiedArea().slice(-1)[0]?.x2 || 0
    )

    return this.conveyorGenerator.generateConveyorBelts(itemSummary, sorters, itemMap)
  }

  private connectBuildings(
    buildings: IBlueprintBuilding[],
    sorters: ISorterMap,
    itemSummary: IItemSummary
  ): void {
    const conveyorStartIndex = this.buildingGenerator.getBuildingIndex() + 1

    this.connectionBuilder.connectSortersToConveyor(
      buildings,
      sorters,
      conveyorStartIndex,
      itemSummary
    )
  }

  private createBlueprintData(buildings: IBlueprintBuilding[]): IBlueprintData {
    return {
      version: 1,
      cursorOffset: { x: 0, y: 0 },
      cursorTargetArea: 0,
      dragBoxSize: { x: 0, y: 0 },
      primaryAreaIdx: 0,
      areas: [
        {
          index: 0,
          parentIndex: -1,
          tropicAnchor: 0,
          areaSegments: 0,
          anchorLocalOffset: { x: 0, y: 0 },
          size: { x: 100, y: 100 }
        }
      ],
      buildings,
      header: {
        layout: 1,
        icons: [0, 0, 0, 0, 0],
        time: new Date(),
        gameVersion: '0.10.28',
        shortDesc: '',
        desc: ''
      }
    }
  }

  updateConfig(config: Partial<IBlueprintServiceConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): IBlueprintServiceConfig {
    return { ...this.config }
  }
}
