/**
 * RecipeDataService - 配方数据服务
 *
 * 功能：
 * - 独立加载配方数据（不依赖 window.data）
 * - 构建产物索引和原料索引
 * - 提供配方查询接口
 * - 支持单例模式，全局共享数据
 *
 * 主要方法：
 * - initialize(): 初始化数据服务
 * - getRecipes(): 获取所有配方
 * - getIndexByProduct(): 获取产物索引
 * - getIndexByMaterial(): 获取原料索引
 * - isInitialized(): 检查是否已初始化
 *
 * 上游调用：
 * - core/services/UpdateAllService.ts: 计算服务
 * - core/adapters/RecipeAdapter.ts: 配方适配器
 * - main.ts: 应用入口初始化
 *
 * 下游依赖：
 * - core/data/recipes.json: 配方数据文件
 * - core/types/settings.ts: 设置类型定义
 *
 * 架构师注：
 * - 此服务替代对 window.data 的依赖
 * - 索引构建逻辑与 legacy/data.js 保持一致
 * - 支持异步初始化，不阻塞应用启动
 */
import type { IRawRecipe } from '../types/settings'
import { logger } from '../../utils/logger'
import { initializationService, InitState } from './InitializationService'

export interface IRecipeIndex {
  byProduct: Record<string, number[]>
  byMaterial: Record<string, number[]>
}

class RecipeDataService {
  private recipes: IRawRecipe[] = []
  private index: IRecipeIndex = {
    byProduct: {},
    byMaterial: {}
  }
  private initialized: boolean = false
  private initPromise: Promise<void> | null = null

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this.doInitialize()
    return this.initPromise
  }

  private async doInitialize(): Promise<void> {
    try {
      const currentState = initializationService.getState()
      if (currentState === InitState.IDLE) {
        initializationService.setSkipIconsLoading(true)
        initializationService.startInitialization()
      }

      const dataModule = await import('../data/recipes.json')
      this.recipes = dataModule.default || dataModule

      logger.log('[RecipeDataService] Loaded recipes (before buildIndex):', {
        count: this.recipes.length,
        firstRecipe: {
          id: this.recipes[0]?.id,
          name: this.recipes[0]?.s?.[0]?.name,
          m: this.recipes[0]?.m,
          'typeof m': typeof this.recipes[0]?.m
        },
        ironOreRecipe: {
          id: this.recipes.find(r => r.s?.[0]?.name === '铁矿')?.id,
          m: this.recipes.find(r => r.s?.[0]?.name === '铁矿')?.m,
          'typeof m': typeof this.recipes.find(r => r.s?.[0]?.name === '铁矿')?.m
        }
      })

      if (initializationService.getState() === InitState.LOADING_RECIPES) {
        initializationService.setRecipesLoaded()
      }

      this.buildIndex()

      if (initializationService.getState() === InitState.BUILDING_INDEX) {
        initializationService.setIndexBuilt()
      }

      this.initialized = true
    } catch (error) {
      logger.error('[RecipeDataService] Failed to initialize:', error)
      if (initializationService.getState() !== InitState.READY) {
        initializationService.setError(error as Error)
      }
      throw error
    }
  }

  initializeWithData(recipes: IRawRecipe[], indexByProduct?: Record<string, number[]>): void {
    if (this.initialized) {
      return
    }

    this.recipes = recipes
    if (indexByProduct) {
      this.index.byProduct = indexByProduct
      this.buildMaterialIndex()
    } else {
      this.buildIndex()
    }
    this.initialized = true
  }

  private buildMaterialIndex(): void {
    this.index.byMaterial = {}
    this.recipes.forEach((item, i) => {
      item.id = i
      if (item.q && Array.isArray(item.q)) {
        for (let j = 0; j < item.q.length; j++) {
          const materialName = item.q[j].name
          if (!this.index.byMaterial[materialName]) {
            this.index.byMaterial[materialName] = []
          }
          this.index.byMaterial[materialName].push(i)
        }
      }
    })
  }

  private buildIndex(): void {
    this.index.byProduct = {}
    this.index.byMaterial = {}

    this.recipes.forEach((item, i) => {
      item.id = i

      if (item.s && Array.isArray(item.s)) {
        for (let j = 0; j < item.s.length; j++) {
          const productName = item.s[j].name
          if (!this.index.byProduct[productName]) {
            this.index.byProduct[productName] = []
          }
          this.index.byProduct[productName].push(i)
        }
      }

      if (item.q && Array.isArray(item.q)) {
        for (let j = 0; j < item.q.length; j++) {
          const materialName = item.q[j].name
          if (!this.index.byMaterial[materialName]) {
            this.index.byMaterial[materialName] = []
          }
          this.index.byMaterial[materialName].push(i)
        }
      }

      logger.log('[RecipeDataService] Before convertMachineType:', {
        recipeId: item.id,
        recipeName: item.s?.[0]?.name,
        'item.m': item.m,
        'typeof item.m': typeof item.m
      })
      this.convertMachineType(item)
      logger.log('[RecipeDataService] After convertMachineType:', {
        recipeId: item.id,
        recipeName: item.s?.[0]?.name,
        'item.m': item.m,
        'item.mName': item.mName
      })
    })
  }

  private convertMachineType(item: IRawRecipe): void {
    const mValue = item.m

    if (Array.isArray(mValue)) {
      logger.log('[RecipeDataService] convertMachineType: m is array, skipping', {
        recipeId: item.id,
        recipeName: item.s?.[0]?.name,
        'item.mName': item.mName
      })
      // 如果 item.m 已经是数组，说明已经被 legacy/data.js 初始化过
      // 不要修改 item.mName，保持原始的机器类型（如 "冶炼设备"）
      return
    }

    if (typeof mValue !== 'string') {
      logger.warn(
        `[RecipeDataService] Skipping convertMachineType: m is not string (type: ${typeof mValue}, value:`,
        mValue,
        ')'
      )
      return
    }

    const machineType = item.m as string
    let ms: Array<{ name: string; speed: number }> = []

    if (machineType === '研究站') {
      ms = [
        { name: '矩阵研究站', speed: 1 },
        { name: '自演化研究站', speed: 3 }
      ]
    } else if (machineType === '制作台') {
      ms = [
        { name: '制作台Mk.Ⅰ', speed: 0.75 },
        { name: '制作台Mk.Ⅱ', speed: 1 },
        { name: '制作台Mk.Ⅲ', speed: 1.5 },
        { name: '重组式制造台', speed: 3 }
      ]
    } else if (machineType === '冶炼设备') {
      ms = [
        { name: '电弧熔炉', speed: 1 },
        { name: '位面熔炉', speed: 2 },
        { name: '负熵熔炉', speed: 3 }
      ]
    } else if (machineType === '采矿机') {
      ms = [
        { name: '采矿机', speed: 0.5 * 6 },
        { name: '大型采矿机', speed: 1 * 20 },
        { name: '矿脉', speed: 0.5 * 1 }
      ]
    } else if (machineType === '能量枢纽') {
      ms = [{ name: '能量枢纽', speed: 1 }]
    } else if (machineType === '黑雾掉落') {
      ms = [{ name: '黑雾掉落', speed: 1 }]
    } else if (machineType === '原油萃取站') {
      ms = [{ name: '原油萃取站', speed: 4 }]
    } else if (machineType === '抽水机') {
      ms = [{ name: '抽水机', speed: 50 / 60 }]
    } else if (machineType === '原油精炼机') {
      ms = [{ name: '原油精炼机', speed: 1 }]
    } else if (machineType === '化工设备') {
      ms = [
        { name: '化工厂', speed: 1 },
        { name: '量子化工厂', speed: 2 }
      ]
    } else if (machineType === '粒子对撞机') {
      ms = [{ name: '粒子对撞机', speed: 1 }]
    } else if (machineType === '轨道采集器') {
      ms = [{ name: '轨道采集器(巨冰)', speed: 1 }]
    } else if (machineType === '轨道采集器2') {
      ms = [{ name: '轨道采集器(气态)', speed: 1 }]
    } else if (machineType === '射线接收塔') {
      ms = [{ name: '射线接收塔', speed: 1 }]
    } else if (machineType === '分馏塔') {
      ms = [{ name: '分馏塔', speed: 30 }]
    } else if (machineType) {
      ms = [{ name: machineType, speed: 1 }]
    }

    item.mName = machineType
    item.m = ms as unknown as IRawRecipe['m']
    logger.log('[RecipeDataService] convertMachineType: converted', {
      recipeId: item.id,
      recipeName: item.s?.[0]?.name,
      machineType,
      resultM: item.m
    })
  }

  getRecipes(): IRawRecipe[] {
    return this.recipes
  }

  getIndexByProduct(): Record<string, number[]> {
    return this.index.byProduct
  }

  getIndexByMaterial(): Record<string, number[]> {
    return this.index.byMaterial
  }

  isInitialized(): boolean {
    return this.initialized
  }

  reset(): void {
    this.recipes = []
    this.index = { byProduct: {}, byMaterial: {} }
    this.initialized = false
    this.initPromise = null
  }
}

export const recipeDataService = new RecipeDataService()
