import type { IBuildingGeneratorConfig, IBuildingLayout } from '../../types/buildingGenerator'
import { BaseBuildingGenerator, type IBuildingGenerateParams } from './BaseBuildingGenerator'
import { SmelterGenerator } from './SmelterGenerator'
import { AssemblerGenerator } from './AssemblerGenerator'
import { PlantGenerator } from './PlantGenerator'
import { RefineryGenerator } from './RefineryGenerator'
import { ColliderGenerator } from './ColliderGenerator'
import { LabGenerator } from './LabGenerator'
import { PRODUCTION_CATEGORY } from '../SorterGenerator'

export class BuildingGeneratorFactory {
  private generators: Map<number, BaseBuildingGenerator> = new Map()
  private config: IBuildingGeneratorConfig

  constructor(config: Partial<IBuildingGeneratorConfig> = {}) {
    this.config = { ...config } as IBuildingGeneratorConfig
    this.registerGenerators()
  }

  private registerGenerators(): void {
    this.generators.set(PRODUCTION_CATEGORY.smelter, new SmelterGenerator(this.config))
    this.generators.set(PRODUCTION_CATEGORY.assembling, new AssemblerGenerator(this.config))
    this.generators.set(PRODUCTION_CATEGORY.plant, new PlantGenerator(this.config))
    this.generators.set(PRODUCTION_CATEGORY.refinery, new RefineryGenerator(this.config))
    this.generators.set(PRODUCTION_CATEGORY.collider, new ColliderGenerator(this.config))
    this.generators.set(PRODUCTION_CATEGORY.lab, new LabGenerator(this.config))
  }

  getGenerator(category: number): BaseBuildingGenerator {
    const generator = this.generators.get(category)
    if (!generator) {
      throw new Error(`Unknown building category: ${category}`)
    }
    return generator
  }

  calculateBuildingArea(category: number, compactLayout: boolean): IBuildingLayout {
    const generator = this.getGenerator(category)
    return generator.calculateBuildingArea(compactLayout)
  }

  generate(
    params: IBuildingGenerateParams & { category: number }
  ): ReturnType<BaseBuildingGenerator['generate']> {
    const generator = this.getGenerator(params.category)
    return generator.generate(params)
  }

  updateConfig(config: Partial<IBuildingGeneratorConfig>): void {
    this.config = { ...this.config, ...config }
    this.generators.forEach(generator => {
      Object.assign((generator as any).config, config)
    })
  }

  getConfig(): IBuildingGeneratorConfig {
    return { ...this.config }
  }
}

export function createBuildingGeneratorFactory(
  config: Partial<IBuildingGeneratorConfig> = {}
): BuildingGeneratorFactory {
  return new BuildingGeneratorFactory(config)
}
