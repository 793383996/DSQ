import { describe, it, expect } from 'vitest'
import {
  validateRecipe,
  validateRecipes,
  validateDemand,
  validateMachineSetting,
  validateItemName,
  validateNumberRange
} from '../validator'
import type { IRawRecipe } from '../../types/settings'

describe('validator', () => {
  describe('validateRecipe', () => {
    it('should return errors for missing product list', () => {
      const recipe = { m: 'arcSmelter' } as IRawRecipe
      const errors = validateRecipe(recipe)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors).toContain('配方缺少产物列表')
    })

    it('should return errors for missing machine type', () => {
      const recipe = {
        s: [{ name: 'ironIngot', n: 1 }]
      } as IRawRecipe
      const errors = validateRecipe(recipe)

      expect(errors).toContain('配方缺少设备类型')
    })

    it('should return errors for product without name', () => {
      const recipe = {
        m: 'arcSmelter',
        s: [{ n: 1 }]
      } as IRawRecipe
      const errors = validateRecipe(recipe)

      expect(errors.some(e => e.includes('产物') && e.includes('缺少名称'))).toBe(true)
    })

    it('should return errors for input without name', () => {
      const recipe = {
        m: 'arcSmelter',
        s: [{ name: 'ironIngot', n: 1 }],
        q: [{ n: 1 }]
      } as IRawRecipe
      const errors = validateRecipe(recipe)

      expect(errors.some(e => e.includes('原料') && e.includes('缺少名称'))).toBe(true)
    })

    it('should return error for invalid production time', () => {
      const recipe = {
        m: 'arcSmelter',
        s: [{ name: 'ironIngot', n: 1 }],
        t: 0
      } as IRawRecipe
      const errors = validateRecipe(recipe)

      expect(errors).toContain('生产时间必须大于0')
    })

    it('should return no errors for valid recipe', () => {
      const recipe: IRawRecipe = {
        m: 'arcSmelter',
        s: [{ name: 'ironIngot', n: 1 }],
        q: [{ name: 'ironOre', n: 1 }],
        t: 2
      }
      const errors = validateRecipe(recipe)

      expect(errors.length).toBe(0)
    })
  })

  describe('validateRecipes', () => {
    it('should separate valid and invalid recipes', () => {
      const recipes: IRawRecipe[] = [
        { m: 'arcSmelter', s: [{ name: 'ironIngot', n: 1 }] },
        { m: '', s: [] },
        { m: 'assemblingMachineMk1', s: [{ name: 'magneticCoil', n: 2 }] }
      ]

      const result = validateRecipes(recipes)

      expect(result.valid.length).toBe(2)
      expect(result.invalid.length).toBe(1)
    })

    it('should include index in error messages', () => {
      const recipes: IRawRecipe[] = [{ m: '', s: [] }]

      const result = validateRecipes(recipes)

      expect(result.invalid[0].errors[0]).toContain('[0]')
    })
  })

  describe('validateDemand', () => {
    it('should return error for missing name', () => {
      const errors = validateDemand({ name: '', num: 10 })
      expect(errors).toContain('需求项缺少名称')
    })

    it('should return error for missing number', () => {
      const errors = validateDemand({ name: 'ironIngot', num: undefined as any })
      expect(errors).toContain('需求项缺少数量')
    })

    it('should return error for zero or negative number', () => {
      const errors1 = validateDemand({ name: 'ironIngot', num: 0 })
      expect(errors1).toContain('需求项数量必须大于0')

      const errors2 = validateDemand({ name: 'ironIngot', num: -5 })
      expect(errors2).toContain('需求项数量必须大于0')
    })

    it('should return no errors for valid demand', () => {
      const errors = validateDemand({ name: 'ironIngot', num: 100 })
      expect(errors.length).toBe(0)
    })
  })

  describe('validateMachineSetting', () => {
    it('should return error for missing name', () => {
      const errors = validateMachineSetting({ name: '', speed: 1.0 })
      expect(errors).toContain('机器设置缺少名称')
    })

    it('should return error for missing speed', () => {
      const errors = validateMachineSetting({ name: 'arcSmelter', speed: undefined as any })
      expect(errors).toContain('机器设置缺少速度')
    })

    it('should return error for negative speed', () => {
      const errors = validateMachineSetting({ name: 'arcSmelter', speed: -0.5 })
      expect(errors).toContain('机器速度不能为负数')
    })

    it('should return no errors for valid setting', () => {
      const errors = validateMachineSetting({ name: 'arcSmelter', speed: 1.0 })
      expect(errors.length).toBe(0)
    })
  })

  describe('validateItemName', () => {
    it('should return false for empty string', () => {
      expect(validateItemName('')).toBe(false)
    })

    it('should return false for whitespace only', () => {
      expect(validateItemName('   ')).toBe(false)
    })

    it('should return false for too long name', () => {
      expect(validateItemName('a'.repeat(51))).toBe(false)
    })

    it('should return true for valid name', () => {
      expect(validateItemName('ironIngot')).toBe(true)
    })

    it('should return false for null/undefined', () => {
      expect(validateItemName(null as any)).toBe(false)
      expect(validateItemName(undefined as any)).toBe(false)
    })
  })

  describe('validateNumberRange', () => {
    it('should return error for NaN', () => {
      const error = validateNumberRange(NaN, 0, 100)
      expect(error).toContain('不是有效数字')
    })

    it('should return error for value below min', () => {
      const error = validateNumberRange(-1, 0, 100)
      expect(error).toContain('不能小于')
    })

    it('should return error for value above max', () => {
      const error = validateNumberRange(101, 0, 100)
      expect(error).toContain('不能大于')
    })

    it('should return null for valid value', () => {
      const error = validateNumberRange(50, 0, 100)
      expect(error).toBeNull()
    })

    it('should use custom field name', () => {
      const error = validateNumberRange(-1, 0, 100, '速度')
      expect(error).toContain('速度')
    })
  })
})
