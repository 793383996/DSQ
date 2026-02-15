import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('calculatorEngine', () => {
  let createCalculator: any
  let defaultCalculator: any

  beforeEach(async () => {
    vi.stubGlobal('window', {
      data: [
        {
          id: 'test_recipe_1',
          s: [{ name: '铁板', n: 1 }],
          q: [{ name: '铁矿', n: 1 }],
          t: 1,
          m: '电弧熔炉',
          noExtra: false
        },
        {
          id: 'test_recipe_2',
          s: [{ name: '铜板', n: 1 }],
          q: [{ name: '铜矿', n: 1 }],
          t: 1,
          m: '电弧熔炉',
          noExtra: false
        }
      ],
      settings: {},
      settings_pf: {},
      settings_time: {},
      recipeIndexByProduct: {
        铁板: [0],
        铜板: [1]
      },
      selfAcc: { checked: false },
      isAddSelfAccP: { checked: false },
      cocoMessage: {
        warning: vi.fn()
      }
    })

    const module = await import('../legacy/calculatorEngine')
    createCalculator = module.createCalculator
    defaultCalculator = module.defaultCalculator
  })

  describe('createCalculator', () => {
    it('应创建独立的计算器实例', () => {
      const calc1 = createCalculator()
      const calc2 = createCalculator()

      expect(calc1).not.toBe(calc2)
      expect(calc1.xh_list).not.toBe(calc2.xh_list)
    })

    it('应使用默认配置', () => {
      const calc = createCalculator()
      expect(calc).toBeDefined()
      expect(typeof calc.loadNumber).toBe('function')
      expect(typeof calc.find).toBe('function')
    })

    it('应接受自定义配置', () => {
      const calc = createCalculator({
        maxDepth: 100,
        defaultAccType: '增产剂Mk.Ⅱ',
        defaultAccValue: '加速'
      })
      expect(calc).toBeDefined()
    })
  })

  describe('状态管理', () => {
    it('应正确初始化空状态', () => {
      const calc = createCalculator()
      expect(calc.xh_list).toEqual([])
      expect(calc.out_list).toEqual([])
      expect(calc.ig_names).toEqual([])
      expect(calc.depth).toBe(0)
    })

    it('应正确清空状态', () => {
      const calc = createCalculator()
      calc.addXH('铁矿', 100)
      calc.addOut('铁板', 50)
      calc.setExcludes(['铜矿'])

      calc.clearState()

      expect(calc.xh_list).toEqual([])
      expect(calc.out_list).toEqual([])
      expect(calc.ig_names).toEqual([])
    })

    it('应正确设置排除列表', () => {
      const calc = createCalculator()
      calc.setExcludes(['铁矿', '铜矿'])
      expect(calc.ig_names).toEqual(['铁矿', '铜矿'])
    })

    it('应正确获取状态快照', () => {
      const calc = createCalculator()
      calc.addXH('铁矿', 100)

      const state = calc.getState()

      expect(state.xh_list).toHaveLength(1)
      expect(state.xh_list[0].name).toBe('铁矿')
      expect(state.xh_list[0].value).toBe(100)
    })
  })

  describe('消耗和产出管理', () => {
    it('应正确添加消耗项', () => {
      const calc = createCalculator()
      calc.addXH('铁矿', 100)

      expect(calc.xh_list).toHaveLength(1)
      expect(calc.xh_list[0].name).toBe('铁矿')
      expect(calc.xh_list[0].value).toBe(100)
    })

    it('应累加相同名称的消耗', () => {
      const calc = createCalculator()
      calc.addXH('铁矿', 100)
      calc.addXH('铁矿', 50)

      expect(calc.xh_list).toHaveLength(1)
      expect(calc.xh_list[0].value).toBe(150)
    })

    it('应正确添加产出项', () => {
      const calc = createCalculator()
      calc.addOut('铁板', -100)

      expect(calc.out_list).toHaveLength(1)
      expect(calc.out_list[0].name).toBe('铁板')
      expect(calc.out_list[0].value).toBe(-100)
    })

    it('应累加相同名称的产出', () => {
      const calc = createCalculator()
      calc.addOut('铁板', -100)
      calc.addOut('铁板', -50)

      expect(calc.out_list).toHaveLength(1)
      expect(calc.out_list[0].value).toBe(-150)
    })
  })

  describe('配方查找', () => {
    it('应正确查找配方', () => {
      const calc = createCalculator()
      const recipe = calc.find('铁板', false)

      expect(recipe).toBeDefined()
      expect(recipe.id).toBe('test_recipe_1')
    })

    it('应返回null当配方不存在时', () => {
      const calc = createCalculator()
      const recipe = calc.find('不存在的物品', false)

      expect(recipe).toBeNull()
    })
  })

  describe('增产剂计算', () => {
    it('应正确计算增产剂速度', () => {
      const calc = createCalculator()

      expect(calc.getAccSpeed('增产剂Mk.Ⅰ', '加速')).toBe(1.25)
      expect(calc.getAccSpeed('增产剂Mk.Ⅱ', '加速')).toBe(1.5)
      expect(calc.getAccSpeed('增产剂Mk.Ⅲ', '加速')).toBe(2)
      expect(calc.getAccSpeed('增产剂Mk.Ⅰ', '增产')).toBe(1.125)
      expect(calc.getAccSpeed('增产剂Mk.Ⅱ', '增产')).toBe(1.2)
      expect(calc.getAccSpeed('增产剂Mk.Ⅲ', '增产')).toBe(1.25)
      expect(calc.getAccSpeed('增产剂Mk.Ⅰ', '无')).toBe(1)
    })
  })

  describe('defaultCalculator', () => {
    it('应提供默认计算器实例', () => {
      expect(defaultCalculator).toBeDefined()
      expect(typeof defaultCalculator.loadNumber).toBe('function')
      expect(typeof defaultCalculator.find).toBe('function')
      expect(typeof defaultCalculator.clearState).toBe('function')
    })
  })

  describe('状态隔离', () => {
    it('多个计算器实例应相互隔离', () => {
      const calc1 = createCalculator()
      const calc2 = createCalculator()

      calc1.addXH('铁矿', 100)
      calc2.addXH('铜矿', 200)

      expect(calc1.xh_list).toHaveLength(1)
      expect(calc1.xh_list[0].name).toBe('铁矿')

      expect(calc2.xh_list).toHaveLength(1)
      expect(calc2.xh_list[0].name).toBe('铜矿')
    })
  })

  describe('calculate方法', () => {
    it('应正确执行计算', () => {
      const calc = createCalculator()
      const result = calc.calculate([{ name: '铁板', num: 60 }], [], [])

      expect(result.success).toBe(true)
      expect(result.xh_list.length).toBeGreaterThan(0)
    })

    it('应正确处理排除列表', () => {
      const calc = createCalculator()
      const result = calc.calculate([{ name: '铁板', num: 60 }], ['铁矿'], [])

      expect(result.success).toBe(true)
      const hasIronOre = result.xh_list.some((xh: any) => xh.name === '铁矿')
      expect(hasIronOre).toBe(false)
    })

    it('应正确处理需求格式', () => {
      const calc = createCalculator()

      const result1 = calc.calculate([{ name: '铁板', num: 60 }], [], [])
      expect(result1.success).toBe(true)

      calc.clearState()
      const result2 = calc.calculate([{ item: { name: '铁板' }, number: 60 }], [], [])
      expect(result2.success).toBe(true)
    })

    it('应正确处理空需求', () => {
      const calc = createCalculator()
      const result = calc.calculate([], [], [])

      expect(result.success).toBe(true)
      expect(result.xh_list).toEqual([])
    })

    it('应正确处理独立生产', () => {
      const calc = createCalculator()
      const result = calc.calculate([], [], [{ id: 0, number: 60 }])

      expect(result.success).toBe(true)
    })

    it('应返回正确的结果结构', () => {
      const calc = createCalculator()
      const result = calc.calculate([{ name: '铁板', num: 60 }], [], [])

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('xh_list')
      expect(result).toHaveProperty('out_list')
      expect(result).toHaveProperty('xhMap')
      expect(result).toHaveProperty('outMap')
    })

    it('应在错误时返回失败结果', () => {
      const calc = createCalculator()

      vi.stubGlobal('window', {
        data: null,
        settings: {},
        settings_pf: {},
        recipeIndexByProduct: null,
        selfAcc: { checked: false },
        isAddSelfAccP: { checked: false }
      })

      const result = calc.calculate([{ name: '铁板', num: 60 }], [], [])

      expect(result.success).toBe(false)
      expect(result).toHaveProperty('error')
    })
  })
})
