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
      const dataModule = await import('../data/recipes.json')
      this.recipes = dataModule.default || dataModule

      this.buildIndex()

      this.initialized = true
      logger.log(`[RecipeDataService] Initialized with ${this.recipes.length} recipes`)
    } catch (error) {
      logger.error('[RecipeDataService] Failed to initialize:', error)
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
    logger.log(`[RecipeDataService] Initialized with ${this.recipes.length} recipes (injected)`)
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
    })

    logger.log(
      `[RecipeDataService] Index built: ${Object.keys(this.index.byProduct).length} products, ${Object.keys(this.index.byMaterial).length} materials`
    )
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
