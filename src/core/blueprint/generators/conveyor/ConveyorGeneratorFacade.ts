import type { IBlueprintBuilding, ICoordinate } from '../../../types/blueprint'
import type { ISorterMap } from '../../types/buildingGenerator'
import type { IItemSummary, IConveyorGeneratorConfig } from '../../types/conveyorGenerator'
import { ConveyorNodeBuilder, type IBuildingMapForConveyor } from './ConveyorNodeBuilder'
import { ConveyorConnectionBuilder } from './ConveyorConnectionBuilder'
import { SprayCoaterConveyorBuilder } from './SprayCoaterConveyorBuilder'
import { DEFAULT_CONVEYOR_GENERATOR_CONFIG } from '../../types/conveyorGenerator'

export interface IConveyorGeneratorFacadeConfig extends IConveyorGeneratorConfig {
  selfSpray: boolean
}

export interface IGenerateConveyorsParams {
  itemSummary: IItemSummary
  sorters: ISorterMap
  itemMap: Record<
    string,
    { iconId: number; rate?: number; extra_rate?: number; accelerate?: number }
  >
  sprayCoaterOffsetList: ICoordinate[]
  lastProductionBuildingType: number
  proliferator?: string
  occupiedAreaX: number
}

export interface IGenerateConveyorsResult {
  buildings: IBlueprintBuilding[]
  buildingIndex: number
}

export class ConveyorGeneratorFacade {
  private connectionBuilder: ConveyorConnectionBuilder
  private sprayCoaterBuilder: SprayCoaterConveyorBuilder
  private config: IConveyorGeneratorFacadeConfig

  constructor(
    buildingMap: IBuildingMapForConveyor & { sprayCoater: { itemId: number; modelIndex: number } },
    config: Partial<IConveyorGeneratorFacadeConfig> = {}
  ) {
    this.config = {
      ...DEFAULT_CONVEYOR_GENERATOR_CONFIG,
      selfSpray: false,
      ...config
    } as IConveyorGeneratorFacadeConfig
    this.connectionBuilder = new ConveyorConnectionBuilder(buildingMap, this.config)
    this.sprayCoaterBuilder = new SprayCoaterConveyorBuilder(buildingMap, this.config)
  }

  setBuildingIndex(index: number): void {
    this.connectionBuilder.setBuildingIndex(index)
    this.sprayCoaterBuilder.setBuildingIndex(index)
  }

  generateConveyors(params: IGenerateConveyorsParams): IGenerateConveyorsResult {
    const {
      itemSummary,
      sorters,
      itemMap,
      sprayCoaterOffsetList,
      lastProductionBuildingType,
      proliferator,
      occupiedAreaX
    } = params

    const connectionBuildings = this.connectionBuilder.buildAllConnections(
      itemSummary,
      sorters,
      itemMap,
      occupiedAreaX
    )

    this.sprayCoaterBuilder.setBuildingIndex(this.connectionBuilder.getBuildingIndex())

    const sprayCoaterResult = this.sprayCoaterBuilder.buildSprayCoaterConveyors({
      sprayCoaterOffsetList,
      lastProductionBuildingType,
      proliferator,
      itemMap,
      selfSpray: this.config.selfSpray,
      conveyorStartOffsetX: occupiedAreaX
    })

    const allBuildings = [...connectionBuildings, ...sprayCoaterResult.buildings]

    const finalIndex = Math.max(
      this.connectionBuilder.getBuildingIndex(),
      this.sprayCoaterBuilder.getBuildingIndex()
    )

    return {
      buildings: allBuildings,
      buildingIndex: finalIndex
    }
  }

  updateConfig(config: Partial<IConveyorGeneratorFacadeConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): IConveyorGeneratorFacadeConfig {
    return { ...this.config }
  }
}

export function createConveyorGeneratorFacade(
  buildingMap: IBuildingMapForConveyor & { sprayCoater: { itemId: number; modelIndex: number } },
  config: Partial<IConveyorGeneratorFacadeConfig> = {}
): ConveyorGeneratorFacade {
  return new ConveyorGeneratorFacade(buildingMap, config)
}
