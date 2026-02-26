/**
 * RecipeAdapter - 配方适配器
 *
 * 功能：
 * - 将简写数据转换为语义化接口
 * - 使用 RecipeDataService 获取数据，避免依赖 window.data
 * - 提供配方查询接口（按产物/原料/ID）
 *
 * 主要方法：
 * - initialize(): 从 RecipeDataService 初始化
 * - loadFromRawData(rawData): 从原始数据加载配方（向后兼容）
 * - findByProductName(name): 按产物名称查找配方
 * - findByInputName(name): 按原料名称查找配方
 * - findById(id): 按ID查找配方
 * - getAllRecipes(): 获取所有配方
 * - isLoaded(): 检查是否已加载
 * - reset(): 重置适配器
 *
 * 上游调用：
 * - core/bridge.ts: 初始化时加载数据
 * - core/services/CalculatorService.ts: 查询配方
 *
 * 下游依赖：
 * - core/types/recipe.ts: 配方类型定义
 * - core/services/RecipeDataService.ts: 配方数据服务
 * - utils/logger.ts: 日志记录
 *
 * 架构师注：
 * - 此类为只读适配器，不修改原始数据
 * - 使用 RecipeDataService 获取数据，移除对 window.data 的依赖
 * - 支持从服务初始化或直接传入数据两种方式
 */
import type { IRecipe, IRecipeItem, IRecipeIndex } from '../types/recipe'
import type { IRawRecipe } from '../types/settings'
import { recipeDataService } from '../services/RecipeDataService'
import { logger } from '../../utils/logger'

/**
 * 配方适配器 - 将简写数据转换为语义化接口
 *
 * 架构师注：
 * - 此类为只读适配器，不修改原始数据
 * - 使用 RecipeDataService 获取数据，移除对 window.data 的依赖
 * - 支持从服务初始化或直接传入数据两种方式
 */
export class RecipeAdapter {
  private rawRecipes: IRawRecipe[] = []
  private index: IRecipeIndex = {
    byProduct: new Map(),
    byInput: new Map(),
    byId: new Map()
  }
  private loaded: boolean = false
  private recipeCache: Map<number, IRecipe> = new Map()

  async initialize(): Promise<void> {
    if (this.loaded) {
      return
    }

    await recipeDataService.initialize()
    this.rawRecipes = recipeDataService.getRecipes()
    this.buildIndexFromService()
    this.loaded = true
  }

  private buildIndexFromService(): void {
    const productIndex = recipeDataService.getIndexByProduct()
    const materialIndex = recipeDataService.getIndexByMaterial()

    Object.entries(productIndex).forEach(([name, indices]) => {
      const recipes = (indices as number[])
        .map(idx => this.getRecipe(idx))
        .filter((r): r is IRecipe => r !== null)
      if (recipes.length > 0) {
        this.index.byProduct.set(name, recipes)
      }
    })

    Object.entries(materialIndex).forEach(([name, indices]) => {
      const recipes = (indices as number[])
        .map(idx => this.getRecipe(idx))
        .filter((r): r is IRecipe => r !== null)
      if (recipes.length > 0) {
        this.index.byInput.set(name, recipes)
      }
    })

    for (let idx = 0; idx < this.rawRecipes.length; idx++) {
      const recipe = this.getRecipe(idx)
      if (recipe) {
        this.index.byId.set(recipe.id, recipe)
      }
    }
  }

  loadFromRawData(rawData: IRawRecipe[]): void {
    if (this.loaded) {
      logger.warn('[RecipeAdapter] Data already loaded, skipping reload')
      return
    }

    if (!Array.isArray(rawData)) {
      logger.error('[RecipeAdapter] Invalid data format: expected array')
      return
    }

    this.rawRecipes = rawData
    this.buildIndex()
    this.loaded = true
  }

  private getRecipe(idx: number): IRecipe | null {
    if (idx < 0 || idx >= this.rawRecipes.length) return null

    const cached = this.recipeCache.get(idx)
    if (cached) return cached

    const raw = this.rawRecipes[idx]
    if (!raw) return null

    const recipe = this.transformRecipe(raw, idx)
    this.recipeCache.set(idx, recipe)
    return recipe
  }

  private transformRecipe(raw: IRawRecipe, idx: number): IRecipe {
    const firstOutput = raw.s?.[0]
    const machineType = typeof raw.m === 'string' ? raw.m : raw.mName || '未知设备'
    return {
      id: `recipe_${idx}`,
      name: firstOutput?.name || `未知配方_${idx}`,
      outputs: this.transformItems(raw.s || []),
      inputs: this.transformItems(raw.q || []),
      time: raw.t ?? 1,
      machineType,
      group: raw.group,
      noExtra: raw.noExtra
    }
  }

  private transformItems(items: Array<{ name: string; n?: number }>): IRecipeItem[] {
    return items.map(item => ({
      name: item.name,
      n: item.n ?? 1
    }))
  }

  private buildIndex(): void {
    this.index.byProduct.clear()
    this.index.byInput.clear()
    this.index.byId.clear()
    this.recipeCache.clear()

    this.rawRecipes.forEach((raw, idx) => {
      const recipe = this.transformRecipe(raw, idx)
      this.recipeCache.set(idx, recipe)

      recipe.outputs.forEach(output => {
        const list = this.index.byProduct.get(output.name) || []
        list.push(recipe)
        this.index.byProduct.set(output.name, list)
      })

      recipe.inputs.forEach(input => {
        const list = this.index.byInput.get(input.name) || []
        list.push(recipe)
        this.index.byInput.set(input.name, list)
      })

      this.index.byId.set(recipe.id, recipe)
    })
  }

  /**
   * 按产物名称查找配方
   */
  findByProductName(name: string): IRecipe[] {
    return this.index.byProduct.get(name) || []
  }

  /**
   * 按原料名称查找配方
   */
  findByInputName(name: string): IRecipe[] {
    return this.index.byInput.get(name) || []
  }

  /**
   * 按 ID 查找配方
   */
  findById(id: string): IRecipe | undefined {
    return this.index.byId.get(id)
  }

  getAllRecipes(): IRecipe[] {
    const recipes: IRecipe[] = []
    for (let idx = 0; idx < this.rawRecipes.length; idx++) {
      const recipe = this.getRecipe(idx)
      if (recipe) recipes.push(recipe)
    }
    return recipes
  }

  getRecipeCount(): number {
    return this.rawRecipes.length
  }

  isLoaded(): boolean {
    return this.loaded
  }

  reset(): void {
    this.rawRecipes = []
    this.recipeCache.clear()
    this.index.byProduct.clear()
    this.index.byInput.clear()
    this.index.byId.clear()
    this.loaded = false
  }
}

export const recipeAdapter = new RecipeAdapter()
