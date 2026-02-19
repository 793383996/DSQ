import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RecipeAdapter } from '../RecipeAdapter'

const mockRawRecipes = [
  {
    id: 0,
    name: '铁板',
    s: [{ name: '铁板', n: 1 }],
    q: [{ name: '铁块', n: 1 }],
    t: 2,
    m: [{ name: '电弧熔炉', speed: 1 }],
    mName: '电弧熔炉'
  },
  {
    id: 1,
    name: '齿轮',
    s: [{ name: '齿轮', n: 1 }],
    q: [{ name: '铁块', n: 2 }],
    t: 1,
    m: [{ name: '制作台Mk.Ⅰ', speed: 0.75 }],
    mName: '制作台Mk.Ⅰ'
  }
]

describe('RecipeAdapter', () => {
  let adapter: RecipeAdapter

  beforeEach(() => {
    adapter = new RecipeAdapter()
    vi.stubGlobal('window', {
      data: mockRawRecipes,
      recipeIndexByProduct: {
        铁板: [0],
        齿轮: [1]
      },
      recipeIndexByMaterial: {
        铁块: [0, 1]
      }
    })
  })

  describe('loadFromRawData', () => {
    it('should load recipes from raw data', () => {
      adapter.loadFromRawData(mockRawRecipes)
      expect(adapter.isLoaded()).toBe(true)
    })

    it('should skip reload if already loaded', () => {
      adapter.loadFromRawData(mockRawRecipes)
      adapter.loadFromRawData(mockRawRecipes)
      expect(adapter.getAllRecipes().length).toBe(2)
    })

    it('should handle invalid data format', () => {
      adapter.loadFromRawData(null as unknown as [])
      expect(adapter.isLoaded()).toBe(false)
    })

    it('should handle empty array', () => {
      adapter.loadFromRawData([])
      expect(adapter.getAllRecipes().length).toBe(0)
      expect(adapter.isLoaded()).toBe(true)
    })
  })

  describe('findByProductName', () => {
    beforeEach(() => {
      adapter.loadFromRawData(mockRawRecipes)
    })

    it('should find recipe by product name', () => {
      const recipes = adapter.findByProductName('铁板')
      expect(recipes.length).toBeGreaterThan(0)
      expect(recipes[0].name).toBe('铁板')
    })

    it('should return empty array for non-existent product', () => {
      const recipes = adapter.findByProductName('不存在')
      expect(recipes).toEqual([])
    })
  })

  describe('findByInputName', () => {
    beforeEach(() => {
      adapter.loadFromRawData(mockRawRecipes)
    })

    it('should find recipes by input name', () => {
      const recipes = adapter.findByInputName('铁块')
      expect(recipes.length).toBe(2)
    })

    it('should return empty array for non-existent input', () => {
      const recipes = adapter.findByInputName('不存在')
      expect(recipes).toEqual([])
    })
  })

  describe('findById', () => {
    beforeEach(() => {
      adapter.loadFromRawData(mockRawRecipes)
    })

    it('should find recipe by id', () => {
      const recipe = adapter.findById('recipe_0')
      expect(recipe).not.toBeNull()
      expect(recipe?.name).toBe('铁板')
    })

    it('should return undefined for non-existent id', () => {
      const recipe = adapter.findById('recipe_999')
      expect(recipe).toBeUndefined()
    })
  })

  describe('getAllRecipes', () => {
    it('should return all recipes', () => {
      adapter.loadFromRawData(mockRawRecipes)
      const recipes = adapter.getAllRecipes()
      expect(recipes.length).toBe(2)
    })
  })

  describe('reset', () => {
    it('should reset adapter state', () => {
      adapter.loadFromRawData(mockRawRecipes)
      expect(adapter.isLoaded()).toBe(true)
      adapter.reset()
      expect(adapter.isLoaded()).toBe(false)
      expect(adapter.getAllRecipes().length).toBe(0)
    })
  })
})
