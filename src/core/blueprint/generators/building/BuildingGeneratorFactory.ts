/**
 * BuildingGeneratorFactory - 建筑生成器工厂
 *
 * 功能：
 * - 根据建筑类型创建对应的生成器
 * - 注册和管理所有建筑生成器
 * - 提供建筑区域计算接口
 *
 * 主要方法：
 * - getGenerator(category): 获取指定类型的生成器
 * - hasGenerator(category): 检查是否有指定类型的生成器
 * - calculateBuildingArea(category, compactLayout): 计算建筑区域
 * - registerGenerators(): 注册所有生成器
 *
 * 上游调用：
 * - core/blueprint/services/BlueprintService.ts: 蓝图生成服务
 *
 * 下游依赖：
 * - generators/building/BaseBuildingGenerator.ts: 建筑生成器基类
 * - generators/building/SmelterGenerator.ts: 熔炉生成器
 * - generators/building/AssemblerGenerator.ts: 制造台生成器
 * - generators/building/PlantGenerator.ts: 化工厂生成器
 * - generators/building/RefineryGenerator.ts: 精炼厂生成器
 * - generators/building/ColliderGenerator.ts: 对撞机生成器
 * - generators/building/LabGenerator.ts: 研究站生成器
 *
 * 建筑类型映射：
 * - smelter(0): 熔炉类
 * - assembling(1): 制造台类
 * - plant(2): 化工厂类
 * - refinery(3): 精炼厂类
 * - collider(4): 对撞机类
 * - lab(5): 研究站类
 */
import type {
  IBuildingGeneratorConfig,
  IBuildingLayout,
  ISubRecipe,
  ISingleBuildingGenerateResult
} from '../../types/buildingGenerator'
import {
  BaseBuildingGenerator,
  type IBuildingGenerateParams,
  type IGenerateBuildingParams
} from './BaseBuildingGenerator'
import { SmelterGenerator } from './SmelterGenerator'
import { AssemblerGenerator } from './AssemblerGenerator'
import { PlantGenerator } from './PlantGenerator'
import { RefineryGenerator } from './RefineryGenerator'
import { ColliderGenerator } from './ColliderGenerator'
import { LabGenerator } from './LabGenerator'
import { PRODUCTION_CATEGORY } from '../SorterGenerator'

const DEFAULT_BUILDING_LAYOUT: IBuildingLayout = {
  area: 9,
  x: 3,
  y: 3,
  centerPoint: [1.5, 1.5, 1.5, 1.5],
  yaw: [0, 0]
}

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

  getGenerator(category: number): BaseBuildingGenerator | undefined {
    return this.generators.get(category)
  }

  hasGenerator(category: number): boolean {
    return this.generators.has(category)
  }

  calculateBuildingArea(category: number, compactLayout: boolean): IBuildingLayout {
    const generator = this.generators.get(category)
    if (!generator) {
      return DEFAULT_BUILDING_LAYOUT
    }
    return generator.calculateBuildingArea(compactLayout)
  }

  calculateBuildingAreaForSmelter(
    compactLayout: boolean,
    outputCount: number,
    inputCount: number
  ): IBuildingLayout {
    if (outputCount + inputCount <= 2) {
      return { area: 12, x: 3, y: 4, centerPoint: [2, 1, 1, 1], yaw: [0, 0] }
    }
    return { area: 16, x: 4, y: 4, centerPoint: [2, 2, 1, 1], yaw: [0, 0] }
  }

  calculateBuildingAreaForRecipe(
    category: number,
    compactLayout: boolean,
    subRecipe: ISubRecipe
  ): IBuildingLayout {
    if (category === PRODUCTION_CATEGORY.smelter) {
      const outputCount = subRecipe.output?.length || 0
      const inputCount = subRecipe.input?.length || 0
      return this.calculateBuildingAreaForSmelter(compactLayout, outputCount, inputCount)
    }
    return this.calculateBuildingArea(category, compactLayout)
  }

  generate(
    params: IBuildingGenerateParams & { category: number }
  ): ReturnType<BaseBuildingGenerator['generate']> {
    const generator = this.getGenerator(params.category)
    if (!generator) {
      throw new Error(`Unknown building category: ${params.category}`)
    }
    return generator.generate(params)
  }

  generateSingleBuilding(
    category: number,
    params: IGenerateBuildingParams
  ): ISingleBuildingGenerateResult {
    const generator = this.getGenerator(category)
    if (!generator) {
      throw new Error(`Unknown building category: ${category}`)
    }
    return generator.generateSingleBuilding(params)
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
