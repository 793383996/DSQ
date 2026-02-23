import { describe, it, expect, beforeEach } from 'vitest'
import { RecipeDataBuilder } from '../RecipeDataBuilder'
import type { IConsumptionItem, IResultItemOutput } from '../../types/recipe'

type TableItem = IConsumptionItem | IResultItemOutput

describe('RecipeDataBuilder', () => {
  let builder: RecipeDataBuilder

  beforeEach(() => {
    builder = new RecipeDataBuilder()
  })

  describe('buildRecipeData', () => {
    it('should return empty recipe list for empty input', () => {
      const result = builder.buildRecipeData([], [])

      expect(result.recipeList).toEqual([])
      expect(result.proliferator).toBeNull()
      expect(result.blueprintTitle).toBe('蓝图')
    })

    it('should build recipe data from consumption items', () => {
      const items: TableItem[] = [
        {
          name: '铁板',
          number1: '60',
          number2: '2',
          time: '1',
          t: '1',
          speed: '1',
          speedClass: 'time',
          rowClass: '',
          machineName: '电弧熔炉',
          m: [
            {
              class: 'm selected',
              itemName: '铁板',
              href: '',
              name: '电弧熔炉',
              title: '电弧熔炉',
              showName: '电弧熔炉'
            }
          ],
          pf: []
        }
      ]

      const demandList = [{ name: '铁板', num: 60 }]

      const result = builder.buildRecipeData(items, demandList)

      expect(result.recipeList.length).toBeGreaterThan(0)
      expect(result.blueprintTitle).toContain('铁板')
    })

    it('should handle items with building info', () => {
      const items: TableItem[] = [
        {
          name: '齿轮',
          number1: '30',
          number2: '1',
          time: '2',
          t: '2',
          speed: '1',
          speedClass: 'time',
          rowClass: '',
          machineName: '制作台Mk.Ⅰ',
          m: [
            {
              class: 'm selected',
              itemName: '齿轮',
              href: '',
              name: '制作台Mk.Ⅰ',
              title: '制作台Mk.Ⅰ',
              showName: 'Mk.Ⅰ'
            }
          ],
          pf: []
        }
      ]

      const result = builder.buildRecipeData(items, [{ name: '齿轮', num: 30 }])

      expect(result.recipeList.length).toBeGreaterThan(0)
    })

    it('should detect hydrogen input and output', () => {
      const items: TableItem[] = [
        {
          name: '氢',
          number1: '60',
          number2: '2',
          time: '1',
          t: '1',
          speed: '1',
          speedClass: 'time',
          rowClass: '',
          machineName: '化工厂',
          m: [
            {
              class: 'm selected',
              itemName: '氢',
              href: '',
              name: '化工厂',
              title: '化工厂',
              showName: '化工厂'
            }
          ],
          pf: []
        }
      ]

      const result = builder.buildRecipeData(items, [{ name: '氢', num: 60 }])

      expect(result.recipeList.length).toBeGreaterThan(0)
    })

    it('should build blueprint title from demand list', () => {
      const demandList = [
        { name: '铁板', num: 60 },
        { name: '齿轮', num: 30 }
      ]

      const result = builder.buildRecipeData([], demandList)

      expect(result.blueprintTitle).toContain('铁板')
      expect(result.blueprintDesc).toContain('齿轮')
    })

    it('should handle empty demand list', () => {
      const result = builder.buildRecipeData([], [])

      expect(result.blueprintTitle).toBe('蓝图')
      expect(result.blueprintDesc).toBe('')
    })

    it('should handle items without machine name', () => {
      const items: TableItem[] = [
        {
          name: '铁矿',
          number1: '60',
          number2: '-',
          time: '1',
          t: '1',
          speed: '1',
          speedClass: 'time',
          rowClass: '',
          m: [],
          pf: []
        }
      ]

      const result = builder.buildRecipeData(items, [{ name: '铁矿', num: 60 }])

      expect(result.recipeList.length).toBeGreaterThan(0)
    })

    it('should handle items with accelerator mode', () => {
      const items: TableItem[] = [
        {
          name: '电路板',
          number1: '30',
          number2: '1',
          time: '1',
          t: '1',
          speed: '1',
          speedClass: 'time',
          rowClass: '',
          machineName: '制作台Mk.Ⅱ',
          m: [
            {
              class: 'm selected',
              itemName: '电路板',
              href: '',
              name: '制作台Mk.Ⅱ',
              title: '制作台Mk.Ⅱ',
              showName: 'Mk.Ⅱ'
            }
          ],
          pf: [],
          accType: [
            {
              class: 'm selected',
              itemName: '电路板',
              href: '',
              name: '增产剂Mk.Ⅰ',
              title: '增产剂Mk.Ⅰ',
              showName: 'Mk.Ⅰ'
            }
          ],
          accValue: [
            {
              class: 'm selected',
              itemName: '电路板',
              href: '',
              name: '加速',
              title: '加速',
              showName: '加速'
            }
          ]
        } as IConsumptionItem
      ]

      const result = builder.buildRecipeData(items, [{ name: '电路板', num: 30 }])

      expect(result.recipeList[0].acceleratorMode).toBe(1)
      expect(result.proliferator).toBe('proliferatorMk1')
    })
  })
})
