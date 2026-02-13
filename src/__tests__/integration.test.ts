import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, createApp } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../App.vue'
import { useBlueprintStore } from '../stores/blueprint'
import { initLegacyBridge, syncStateToLegacy, legacyGetProductionSettings, legacySetProductionSettings, clearLegacyState, legacyGetConfigFromDOM, legacyUpdateConfig } from '../core/bridge'
import { useToast, cocoMessageProxy } from '../composables/useToast'

describe('DSQ Calculator Integration Tests', () => {
  describe('Legacy Bridge Module', () => {
    beforeEach(() => {
      initLegacyBridge()
    })

    it('should initialize legacy bridge correctly', () => {
      expect(window.xqs).toEqual([])
      expect(window.ig_names).toEqual([])
      expect(window.settingsLocal).toBeDefined()
      expect(window.defaultAccType).toBe('增产剂Mk.Ⅰ')
    })

    it('should sync state to legacy variables', () => {
      const state = {
        demandList: [{ name: '铁块', num: 60 }],
        excludeList: ['铜矿'],
        machineSettings: {
          modeIn: '制作台Mk.Ⅱ',
          furnace: '位面熔炉',
          chemical: '化工厂',
          accType: '增产剂Mk.Ⅱ',
          accValue: '加速',
          research: '矩阵研究站'
        }
      }

      syncStateToLegacy(state)

      expect(window.xqs).toEqual([
        { name: '铁块', number: 60, item: { name: '铁块' } }
      ])
      expect(window.ig_names).toEqual(state.excludeList)
    })

    it('should clear legacy state', () => {
      window.xqs = [{ name: '测试', num: 100 }]
      window.ig_names = ['测试排除']
      window.out_list = [{ name: '结果', rate: 10 }]

      clearLegacyState()

      expect(window.xqs).toEqual([])
      expect(window.ig_names).toEqual([])
      expect(window.out_list).toEqual([])
    })
  })

  describe('Blueprint Store Module', () => {
    let store: ReturnType<typeof useBlueprintStore>

    beforeEach(() => {
      const pinia = createPinia()
      const app = createApp({})
      app.use(pinia)
      store = useBlueprintStore()
    })

    it('should have correct initial state', () => {
      expect(store.demandList).toEqual([])
      expect(store.excludeList).toEqual([])
      expect(store.machineSettings.modeIn).toBe('制作台Mk.Ⅰ')
      expect(store.resultItems).toEqual([])
      expect(store.isCalculating).toBe(false)
    })

    it('should add demand item', () => {
      store.addDemand('铁块', 60)

      expect(store.demandList.length).toBe(1)
      expect(store.demandList[0].name).toBe('铁块')
      expect(store.demandList[0].num).toBe(60)
    })

    it('should accumulate demand quantity for existing item', () => {
      store.addDemand('铁块', 60)
      store.addDemand('铁块', 30)

      expect(store.demandList.length).toBe(1)
      expect(store.demandList[0].num).toBe(90)
    })

    it('should remove demand item', () => {
      store.addDemand('铁块', 60)
      store.addDemand('铜块', 30)
      store.removeDemand('铁块')

      expect(store.demandList.length).toBe(1)
      expect(store.demandList[0].name).toBe('铜块')
    })

    it('should update demand quantity', () => {
      store.addDemand('铁块', 60)
      store.updateDemand('铁块', 100)

      expect(store.demandList[0].num).toBe(100)
    })

    it('should add exclude item', () => {
      store.addExclude('铜矿')

      expect(store.excludeList).toContain('铜矿')
    })

    it('should not duplicate exclude items', () => {
      store.addExclude('铜矿')
      store.addExclude('铜矿')

      expect(store.excludeList.length).toBe(1)
    })

    it('should remove exclude item', () => {
      store.addExclude('铜矿')
      store.addExclude('铁矿')
      store.removeExclude('铜矿')

      expect(store.excludeList).toEqual(['铁矿'])
    })

    it('should set machine setting', () => {
      store.setMachineSetting('modeIn', '制作台Mk.Ⅲ')

      expect(store.machineSettings.modeIn).toBe('制作台Mk.Ⅲ')
    })

    it('should load machine settings', () => {
      const newSettings = {
        modeIn: '重组式制造台',
        furnace: '负熵熔炉',
        chemical: '量子化工厂',
        accType: '增产剂Mk.Ⅲ',
        accValue: '增产',
        research: '自演化研究站'
      }

      store.loadMachineSettings(newSettings)

      expect(store.machineSettings).toEqual(newSettings)
    })

    it('should clear all state', () => {
      store.addDemand('铁块', 60)
      store.addExclude('铜矿')

      store.clearAll()

      expect(store.demandList).toEqual([])
      expect(store.excludeList).toEqual([])
      expect(store.resultItems).toEqual([])
    })

    it('should compute hasDemand correctly', () => {
      expect(store.hasDemand).toBe(false)

      store.addDemand('铁块', 60)

      expect(store.hasDemand).toBe(true)
    })

    it('should compute demandCount correctly', () => {
      expect(store.demandCount).toBe(0)

      store.addDemand('铁块', 60)
      store.addDemand('铜块', 30)

      expect(store.demandCount).toBe(2)
    })
  })

  describe('Toast Composable', () => {
    it('should provide toast functions', () => {
      const toast = useToast()

      expect(typeof toast.success).toBe('function')
      expect(typeof toast.error).toBe('function')
      expect(typeof toast.warning).toBe('function')
      expect(typeof toast.info).toBe('function')
      expect(typeof toast.loading).toBe('function')
      expect(typeof toast.hide).toBe('function')
    })

    it('should not throw when called without instance', () => {
      const toast = useToast()

      expect(() => toast.success('test')).not.toThrow()
      expect(() => toast.error('test')).not.toThrow()
      expect(() => toast.warning('test')).not.toThrow()
      expect(() => toast.info('test')).not.toThrow()
    })
  })

  describe('CocoMessage Proxy', () => {
    it('should not throw when called', () => {
      expect(() => cocoMessageProxy('测试消息')).not.toThrow()
      expect(() => cocoMessageProxy('成功消息', 'success')).not.toThrow()
      expect(() => cocoMessageProxy('错误消息', 'error')).not.toThrow()
      expect(() => cocoMessageProxy('警告消息', 'warning')).not.toThrow()
      expect(() => cocoMessageProxy('默认消息', 'info')).not.toThrow()
    })
  })

  describe('Blueprint Config Helpers', () => {
    beforeEach(() => {
      initLegacyBridge()
    })

    it('should get config from DOM with defaults', () => {
      const config = legacyGetConfigFromDOM()

      expect(config.conveyorBeltStackLayer).toBe(4)
      expect(config.x_y_ratio).toBe(2)
      expect(config.onlyConveyorBeltMk3).toBe(true)
      expect(config.onlySorterMk3).toBe(true)
      expect(config.generateTeslaTower).toBe(true)
      expect(config.teslaTowerLineInterval).toBe(1)
      expect(config.stackLayers).toBe(1)
    })

    it('should update config', () => {
      legacyUpdateConfig({
        conveyorBeltStackLayer: 2,
        onlyConveyorBeltMk3: false,
        generateTeslaTower: false
      })

      const config = legacyGetConfigFromDOM()

      expect(config.conveyorBeltStackLayer).toBe(2)
      expect(config.onlyConveyorBeltMk3).toBe(false)
      expect(config.generateTeslaTower).toBe(false)
    })

    it('should get production settings', () => {
      const settings = legacyGetProductionSettings()

      expect(settings.productionPerMinute).toBe(60)
      expect(settings.machineCount).toBe(1)
    })

    it('should set production settings', () => {
      legacySetProductionSettings(120, 5)

      const settings = legacyGetProductionSettings()

      expect(settings.productionPerMinute).toBe(120)
      expect(settings.machineCount).toBe(5)
    })
  })
})

describe('Vue Components', () => {
  it('should mount App component', () => {
    const pinia = createPinia()
    const app = createApp(App)
    app.use(pinia)

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.html()).toContain('戴森球计划量产量化计算器')
  })
})
