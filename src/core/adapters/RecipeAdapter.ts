/**
 * RecipeAdapter - 配方适配器
 *
 * 功能：
 * - 将简写数据转换为语义化接口
 * - 复用data.js已构建的索引，避免双重索引
 * - 提供配方查询接口（按产物/原料/ID）
 *
 * 主要方法：
 * - loadFromRawData(rawData): 从原始数据加载配方
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
 * - utils/logger.ts: 日志记录
 *
 * 架构师注：
 * - 此类为只读适配器，不修改原始数据
 * - 复用 data.js 已构建的索引，避免双重索引
 * - 所有对 window.data 的访问必须通过此适配器进行
 */
import type { IRecipe, IRecipeItem, IRecipeIndex } from '../types/recipe'
import type { IRawRecipe } from '../types/settings'
import { logger } from '../../utils/logger'

declare global {
  interface Window {
    data: IRawRecipe[]
    recipeIndexByProduct: Record<string, number[]>
    recipeIndexByMaterial: Record<string, number[]>
  }
}

/**
 * 配方适配器 - 将简写数据转换为语义化接口
 *
 * 架构师注：
 * - 此类为只读适配器，不修改原始数据
 * - 复用 data.js 已构建的索引，避免双重索引
 * - 所有对 window.data 的访问必须通过此适配器进行
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
    this.reuseExistingIndex()
    this.loaded = true

    logger.log(
      `[RecipeAdapter] Loaded ${this.rawRecipes.length} recipes (reused existing index, lazy transform)`
    )
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

  private reuseExistingIndex(): void {
    if (typeof window === 'undefined') {
      this.buildIndex()
      return
    }

    const productIndex = window.recipeIndexByProduct
    const materialIndex = window.recipeIndexByMaterial

    if (productIndex && materialIndex) {
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
    } else {
      this.buildIndex()
    }
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
