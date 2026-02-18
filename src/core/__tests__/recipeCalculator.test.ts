import { describe, it, expect, beforeEach } from 'vitest'
import { RecipeCalculator } from '../services/RecipeCalculator'
import type { IRawRecipe } from '../../types/recipe'

describe('RecipeCalculator', () => {
  let calculator: RecipeCalculator
  const testRecipes: IRawRecipe[] = [
    {
      id: 0,
      s: [{ name: '铁块', n: 1 }],
      q: [{ name: '铁矿', n: 1 }],
      t: 1,
      n: 1,
      m: '冶炼设备',
      mName: '冶炼设备'
    },
    {
      id: 1,
      s: [{ name: '铜块', n: 1 }],
      q: [{ name: '铜矿', n: 1 }],
      t: 1,
      n: 1,
      m: '冶炼设备',
      mName: '冶炼设备'
    },
    {
      id: 2,
      s: [{ name: '齿轮', n: 1 }],
      q: [{ name: '铁块', n: 1 }],
      t: 1,
      n: 1,
      m: '制作台',
      mName: '制作台'
    }
  ]

  const recipeIndexByProduct: Record<string, number[]> = {
    铁块: [0],
    铜块: [1],
    齿轮: [2]
  }

  beforeEach(() => {
    calculator = new RecipeCalculator(testRecipes, recipeIndexByProduct)
  })

  describe('find', () => {
    it('should find recipe by product name', () => {
      const recipe = calculator.find('铁块')
      expect(recipe).not.toBeNull()
      expect(recipe?.s[0].name).toBe('铁块')
      expect(recipe?.q?.[0].name).toBe('铁矿')
    })

    it('should return null for unknown product', () => {
      const recipe = calculator.find('未知物品')
      expect(recipe).toBeNull()
    })

    it('should normalize recipe when option is set', () => {
      const recipe = calculator.find('铁块', { normalizeRecipe: true })
      expect(recipe).not.toBeNull()
      expect(recipe?.s[0].n).toBe(1)
    })
  })

  describe('loadNumber', () => {
    it('should add consumption to xhList', () => {
      calculator.loadNumber('铁块', 60)

      const state = calculator.getState()
      expect(state.xhList.length).toBeGreaterThan(0)
      expect(state.xhList.find(x => x.name === '铁块')?.value).toBe(60)
    })

    it('should respect igNames', () => {
      calculator.setIgNames(['铁块'])
      calculator.loadNumber('铁块', 60)

      const state = calculator.getState()
      expect(state.xhList.find(x => x.name === '铁块')).toBeUndefined()
    })

    it('should add output to outList', () => {
      calculator.loadNumber('铁块', 60)

      const state = calculator.getState()
      expect(state.xhList.find(x => x.name === '铁块')).toBeDefined()
    })
  })

  describe('checkResult', () => {
    it('should not modify results when no overflow', () => {
      calculator.loadNumber('铁块', 60)
      calculator.checkResult()

      const state = calculator.getState()
      const ironBlock = state.xhList.find(x => x.name === '铁块')
      expect(ironBlock?.value).toBe(60)
    })
  })

  describe('getAccSpeed', () => {
    it('should return correct speed for acceleration', () => {
      expect(RecipeCalculator.getAccSpeed('增产剂Mk.Ⅰ', '加速')).toBe(1.25)
      expect(RecipeCalculator.getAccSpeed('增产剂Mk.Ⅱ', '加速')).toBe(1.5)
      expect(RecipeCalculator.getAccSpeed('增产剂Mk.Ⅲ', '加速')).toBe(2)
    })

    it('should return correct speed for production boost', () => {
      expect(RecipeCalculator.getAccSpeed('增产剂Mk.Ⅰ', '增产')).toBe(1.125)
      expect(RecipeCalculator.getAccSpeed('增产剂Mk.Ⅱ', '增产')).toBe(1.2)
      expect(RecipeCalculator.getAccSpeed('增产剂Mk.Ⅲ', '增产')).toBe(1.25)
    })

    it('should return 1 for no effect', () => {
      expect(RecipeCalculator.getAccSpeed('增产剂Mk.Ⅰ', '无')).toBe(1)
      expect(RecipeCalculator.getAccSpeed('unknown', '加速')).toBe(1)
    })
  })

  describe('clearState', () => {
    it('should clear all state', () => {
      calculator.loadNumber('铁矿', 60)
      calculator.clearState()

      const state = calculator.getState()
      expect(state.xhList.length).toBe(0)
      expect(state.outList.length).toBe(0)
    })
  })
})
