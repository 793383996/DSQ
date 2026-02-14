import type { IRecipe, IRecipeItem, IRecipeIndex, IRawRecipe } from '../types/recipe'
import { logger } from '../../utils/logger'

/**
 * 配方适配器 - 将简写数据转换为语义化接口
 * 
 * 架构师注：
 * - 此类为只读适配器，不修改原始数据
 * - 所有对 window.data 的访问必须通过此适配器进行
 * - 索引预热确保查询性能
 */
export class RecipeAdapter {
  private recipes: IRecipe[] = []
  private index: IRecipeIndex = {
    byProduct: new Map(),
    byInput: new Map(),
    byId: new Map()
  }
  private loaded: boolean = false

  /**
   * 从原始数据加载配方
   * @param rawData 原始简写格式数据 (window.data)
   */
  loadFromRawData(rawData: IRawRecipe[]): void {
    if (this.loaded) {
      logger.warn('[RecipeAdapter] Data already loaded, skipping reload')
      return
    }

    if (!Array.isArray(rawData)) {
      logger.error('[RecipeAdapter] Invalid data format: expected array')
      return
    }

    this.recipes = rawData.map((item, idx) => this.transformRecipe(item, idx))
    this.buildIndex()
    this.loaded = true

    logger.log(`[RecipeAdapter] Loaded ${this.recipes.length} recipes`)
  }

  /**
   * 转换单个配方
   */
  private transformRecipe(raw: IRawRecipe, idx: number): IRecipe {
    const firstOutput = raw.s?.[0]
    return {
      id: `recipe_${idx}`,
      name: firstOutput?.name || `未知配方_${idx}`,
      outputs: this.transformItems(raw.s || []),
      inputs: this.transformItems(raw.q || []),
      time: raw.t ?? 1,
      machineType: raw.m || '未知设备',
      group: raw.group,
      noExtra: raw.noExtra
    }
  }

  /**
   * 转换物品列表
   */
  private transformItems(items: Array<{ name: string; n?: number }>): IRecipeItem[] {
    return items.map(item => ({
      name: item.name,
      n: item.n ?? 1
    }))
  }

  /**
   * 构建索引 - 预热查询性能
   */
  private buildIndex(): void {
    this.index.byProduct.clear()
    this.index.byInput.clear()
    this.index.byId.clear()

    this.recipes.forEach(recipe => {
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

  /**
   * 获取所有配方
   */
  getAllRecipes(): IRecipe[] {
    return [...this.recipes]
  }

  /**
   * 获取配方数量
   */
  getRecipeCount(): number {
    return this.recipes.length
  }

  /**
   * 检查是否已加载
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * 重置适配器 (用于测试)
   */
  reset(): void {
    this.recipes = []
    this.index.byProduct.clear()
    this.index.byInput.clear()
    this.index.byId.clear()
    this.loaded = false
  }
}

export const recipeAdapter = new RecipeAdapter()
