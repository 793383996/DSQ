import { describe, it, expect, beforeEach } from 'vitest'
import { CalculationContext } from '../services/CalculationContext'

describe('CalculationContext', () => {
  let ctx: CalculationContext

  beforeEach(() => {
    ctx = new CalculationContext()
  })

  describe('初始化', () => {
    it('应使用默认配置初始化', () => {
      expect(ctx.maxDepth).toBe(200)
      expect(ctx.config.defaultAccType).toBe('增产剂Mk.Ⅰ')
      expect(ctx.config.defaultAccValue).toBe('无')
    })

    it('应接受自定义配置', () => {
      const customCtx = new CalculationContext({
        maxRecursionDepth: 100,
        defaultAccType: '增产剂Mk.Ⅱ'
      })
      expect(customCtx.maxDepth).toBe(100)
      expect(customCtx.config.defaultAccType).toBe('增产剂Mk.Ⅱ')
    })

    it('应初始化空状态', () => {
      expect(ctx.consumption).toEqual([])
      expect(ctx.production).toEqual([])
      expect(ctx.consumptionMap.size).toBe(0)
      expect(ctx.productionMap.size).toBe(0)
      expect(ctx.excludes.size).toBe(0)
      expect(ctx.demands).toEqual([])
    })
  })

  describe('消耗管理', () => {
    it('应添加消耗项', () => {
      ctx.addConsumption('铁板', 10)
      expect(ctx.consumption.length).toBe(1)
      expect(ctx.consumption[0].name).toBe('铁板')
      expect(ctx.consumption[0].value).toBe(10)
      expect(ctx.consumptionMap.get('铁板')).toBe(10)
    })

    it('应累加相同名称的消耗', () => {
      ctx.addConsumption('铁板', 10)
      ctx.addConsumption('铁板', 5)
      expect(ctx.consumption.length).toBe(1)
      expect(ctx.consumption[0].value).toBe(15)
      expect(ctx.consumptionMap.get('铁板')).toBe(15)
    })

    it('应支持多个不同消耗项', () => {
      ctx.addConsumption('铁板', 10)
      ctx.addConsumption('铜板', 20)
      expect(ctx.consumption.length).toBe(2)
      expect(ctx.getConsumption('铁板')).toBe(10)
      expect(ctx.getConsumption('铜板')).toBe(20)
    })

    it('应正确获取不存在的消耗', () => {
      expect(ctx.getConsumption('不存在')).toBe(0)
    })
  })

  describe('产出管理', () => {
    it('应添加产出项', () => {
      ctx.addProduction('铁板', 100)
      expect(ctx.production.length).toBe(1)
      expect(ctx.production[0].name).toBe('铁板')
      expect(ctx.production[0].value).toBe(100)
      expect(ctx.productionMap.get('铁板')).toBe(100)
    })

    it('应累加相同名称的产出', () => {
      ctx.addProduction('铁板', 100)
      ctx.addProduction('铁板', 50)
      expect(ctx.production.length).toBe(1)
      expect(ctx.production[0].value).toBe(150)
      expect(ctx.productionMap.get('铁板')).toBe(150)
    })

    it('应正确获取不存在的产出', () => {
      expect(ctx.getProduction('不存在')).toBe(0)
    })
  })

  describe('排除列表', () => {
    it('应设置排除列表', () => {
      ctx.setExcludes(['铁矿', '铜矿'])
      expect(ctx.isExcluded('铁矿')).toBe(true)
      expect(ctx.isExcluded('铜矿')).toBe(true)
      expect(ctx.isExcluded('铁板')).toBe(false)
    })

    it('应正确检查排除状态', () => {
      expect(ctx.isExcluded('任何物品')).toBe(false)
    })
  })

  describe('需求列表', () => {
    it('应设置需求列表', () => {
      ctx.setDemands([
        { name: '铁板', num: 100 },
        { name: '铜板', num: 50 }
      ])
      expect(ctx.demands.length).toBe(2)
      expect(ctx.demands[0].name).toBe('铁板')
    })
  })

  describe('递归深度控制', () => {
    it('应正确追踪递归深度', () => {
      expect(ctx.depth).toBe(0)
      ctx.enterRecursion()
      expect(ctx.depth).toBe(1)
      ctx.enterRecursion()
      expect(ctx.depth).toBe(2)
      ctx.exitRecursion()
      expect(ctx.depth).toBe(1)
    })

    it('应在超过最大深度时返回false', () => {
      const shallowCtx = new CalculationContext({ maxRecursionDepth: 2 })
      expect(shallowCtx.enterRecursion()).toBe(true)
      expect(shallowCtx.enterRecursion()).toBe(true)
      expect(shallowCtx.enterRecursion()).toBe(false)
    })
  })

  describe('重置功能', () => {
    it('应重置所有状态', () => {
      ctx.addConsumption('铁板', 10)
      ctx.addProduction('铜板', 20)
      ctx.setExcludes(['铁矿'])
      ctx.setDemands([{ name: '铁板', num: 100 }])
      ctx.enterRecursion()

      ctx.reset()

      expect(ctx.consumption).toEqual([])
      expect(ctx.production).toEqual([])
      expect(ctx.consumptionMap.size).toBe(0)
      expect(ctx.productionMap.size).toBe(0)
      expect(ctx.excludes.size).toBe(0)
      expect(ctx.demands).toEqual([])
      expect(ctx.depth).toBe(0)
    })
  })

  describe('统计信息', () => {
    it('应返回正确的统计信息', () => {
      ctx.addConsumption('铁板', 10)
      ctx.addConsumption('铜板', 20)
      ctx.addProduction('钢材', 30)
      ctx.enterRecursion()

      const stats = ctx.getStats()
      expect(stats.consumptionCount).toBe(2)
      expect(stats.productionCount).toBe(1)
      expect(stats.depth).toBe(1)
    })
  })

  describe('遗留格式转换', () => {
    it('应正确转换为遗留格式', () => {
      ctx.addConsumption('铁板', 10)
      ctx.addProduction('钢材', 30)
      ctx.setExcludes(['铁矿'])
      ctx.setDemands([{ name: '铁板', num: 100 }])

      const legacy = ctx.toLegacyFormat()

      expect(legacy.xh_list).toEqual([{ name: '铁板', value: 10 }])
      expect(legacy.out_list).toEqual([{ name: '钢材', value: 30 }])
      expect(legacy.ig_names).toEqual(['铁矿'])
      expect(legacy.xqs).toEqual([{ name: '铁板', num: 100 }])
    })
  })

  describe('设置管理', () => {
    it('应设置配方设置', () => {
      ctx.setSettings({ 铁板: { machine: '电弧熔炉' } })
      expect(ctx.settings['铁板']?.machine).toBe('电弧熔炉')
    })

    it('应设置速度设置', () => {
      ctx.setSpeedSettings({ 铁板: 1.5 })
      expect(ctx.speedSettings['铁板']).toBe(1.5)
    })

    it('应设置增产剂设置', () => {
      ctx.setProductivitySettings({ 铁板: { type: '增产剂Mk.Ⅱ', value: '加速' } })
      expect(ctx.productivitySettings['铁板']?.type).toBe('增产剂Mk.Ⅱ')
    })
  })
})
