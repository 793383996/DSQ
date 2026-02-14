import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  initLegacyBridge,
  syncStateToLegacy,
  clearLegacyState,
  legacyUpdateMachineSettings,
  legacyGetMachineSettings,
  legacyUpdateConfig,
  legacyGetConfigFromDOM,
  legacyUpdateSpeedSettings,
  legacyGetSpeedSettings,
  legacyUpdateLogisticsSettings,
  legacyGetLogisticsSettings,
  legacySetProductionSettings,
  legacyGetProductionSettings,
  getSelectableItems,
  getSelectableItemsWithIcons,
  getIconData,
  isLegacyDataLoaded,
  isGameDataLoaded
} from '../bridge'

declare global {
  interface Window {
    xqs: Array<{ name: string; number: number; item: { name: string } }>
    ig_names: string[]
    icons: Record<string, unknown>
    xh_list: Array<{ name: string; value: number }>
    out_list: Array<{ name: string; value: number }>
    items0: unknown[]
    items: unknown[]
    totalDisplay: unknown[]
    xps_editor_index: number
    items_editor_index: number
    settings_time: Record<string, number>
    onlyConveyorBeltMk3: { checked: boolean }
    onlySorterMk3: { checked: boolean }
    useSorterMk4: { checked: boolean }
    selfAcc: { checked: boolean }
    isAddSelfAccP: { checked: boolean }
    generateTeslaTower: { checked: boolean }
    teslaTowerLineInterval: { value: string }
    conveyorBeltStackLayer: { value: string }
    stackLayers: { value: string }
    x_y_ratio: { value: string }
    maxLabLayers: { value: string }
    pointLength: { value: string }
    hideSource: { checked: boolean }
    txtnumber: { value: string }
    selmaince: { value: string }
    settingsLocal: Record<string, unknown>
    defaultAccType: string
    defaultAccValue: string
    data: Array<{ id: number; mName: string }>
    update_all: () => void
    find: (name: string, normalize?: boolean) => { id: number; mName: string } | null
    saveSetting: () => void
    saveSettingTime: () => void
    game_data: {
      icons1: Array<{ name: string; value: string }>
      icons2: Array<{ name: string; value: string }>
    }
    isDataLoaded: boolean
    loadNumber: () => Promise<unknown>
    generateBlueprint: () => void
    cocoMessage: unknown
    logisticsSettings: { beltType: string; logisticStack: number }
    beltSpeed: number
  }
}

describe('bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    window.xqs = []
    window.ig_names = []
    window.xh_list = []
    window.out_list = []
    window.settings_time = {}
    window.settingsLocal = {}
    window.data = []
    window.game_data = {
      icons1: [],
      icons2: []
    }
    window.isDataLoaded = false
  })

  describe('initLegacyBridge', () => {
    it('should initialize legacy globals', () => {
      initLegacyBridge()

      expect(window.xqs).toEqual([])
      expect(window.ig_names).toEqual([])
      expect(window.xh_list).toEqual([])
      expect(window.out_list).toEqual([])
      expect(window.items0).toEqual([])
      expect(window.items).toEqual([])
      expect(window.totalDisplay).toEqual([])
      expect(window.xps_editor_index).toBe(-1)
      expect(window.items_editor_index).toBe(-1)
      expect(window.settings_time).toEqual({})
    })

    it('should initialize checkbox elements with default values', () => {
      initLegacyBridge()

      expect(window.onlyConveyorBeltMk3.checked).toBe(true)
      expect(window.onlySorterMk3.checked).toBe(true)
      expect(window.useSorterMk4.checked).toBe(false)
      expect(window.selfAcc.checked).toBe(false)
      expect(window.generateTeslaTower.checked).toBe(true)
    })

    it('should initialize input elements with default values', () => {
      initLegacyBridge()

      expect(window.teslaTowerLineInterval.value).toBe('1')
      expect(window.conveyorBeltStackLayer.value).toBe('4')
      expect(window.stackLayers.value).toBe('1')
      expect(window.x_y_ratio.value).toBe('2')
      expect(window.maxLabLayers.value).toBe('15')
      expect(window.pointLength.value).toBe('1')
      expect(window.txtnumber.value).toBe('60')
      expect(window.selmaince.value).toBe('1')
    })

    it('should initialize default accelerator settings only when not set', () => {
      window.defaultAccType = undefined
      window.defaultAccValue = undefined
      initLegacyBridge()

      expect(window.defaultAccType).toBeUndefined()
      expect(window.defaultAccValue).toBeUndefined()
    })

    it('should not overwrite existing accelerator settings from localStorage', () => {
      window.defaultAccType = '增产剂Mk.Ⅲ'
      window.defaultAccValue = '增产'

      initLegacyBridge()

      expect(window.defaultAccType).toBe('增产剂Mk.Ⅲ')
      expect(window.defaultAccValue).toBe('增产')
    })

    it('should not reinitialize if already initialized', () => {
      initLegacyBridge()
      window.xqs = [{ name: 'test', number: 100, item: { name: 'test' } }]

      initLegacyBridge()

      expect(window.xqs).toHaveLength(1)
    })
  })

  describe('syncStateToLegacy', () => {
    it('should sync demand list to window.xqs', () => {
      syncStateToLegacy({
        demandList: [{ name: '铁块', num: 60 }],
        excludeList: [],
        machineSettings: {
          modeIn: '制作台Mk.Ⅰ',
          furnace: '电弧熔炉',
          chemical: '化工厂',
          accType: '增产剂Mk.Ⅰ',
          accValue: '无',
          research: '矩阵研究站'
        }
      })

      expect(window.xqs).toHaveLength(1)
      expect(window.xqs[0].name).toBe('铁块')
      expect(window.xqs[0].number).toBe(60)
    })

    it('should sync exclude list to window.ig_names', () => {
      syncStateToLegacy({
        demandList: [],
        excludeList: ['铜矿', '铁矿'],
        machineSettings: {
          modeIn: '制作台Mk.Ⅰ',
          furnace: '电弧熔炉',
          chemical: '化工厂',
          accType: '增产剂Mk.Ⅰ',
          accValue: '无',
          research: '矩阵研究站'
        }
      })

      expect(window.ig_names).toEqual(['铜矿', '铁矿'])
    })

    it('should handle number field as fallback', () => {
      syncStateToLegacy({
        demandList: [{ name: '铁块', number: 30 }],
        excludeList: [],
        machineSettings: {
          modeIn: '制作台Mk.Ⅰ',
          furnace: '电弧熔炉',
          chemical: '化工厂',
          accType: '增产剂Mk.Ⅰ',
          accValue: '无',
          research: '矩阵研究站'
        }
      })

      expect(window.xqs[0].number).toBe(30)
    })

    it('should default to 1 when no number provided', () => {
      syncStateToLegacy({
        demandList: [{ name: '铁块' }],
        excludeList: [],
        machineSettings: {
          modeIn: '制作台Mk.Ⅰ',
          furnace: '电弧熔炉',
          chemical: '化工厂',
          accType: '增产剂Mk.Ⅰ',
          accValue: '无',
          research: '矩阵研究站'
        }
      })

      expect(window.xqs[0].number).toBe(1)
    })
  })

  describe('clearLegacyState', () => {
    it('should clear all legacy state arrays', () => {
      window.xh_list = [{ name: 'test', value: 100 }]
      window.out_list = [{ name: 'test2', value: 200 }]
      window.xqs = [{ name: 'test', number: 1, item: { name: 'test' } }]
      window.ig_names = ['test']

      clearLegacyState()

      expect(window.xh_list).toEqual([])
      expect(window.out_list).toEqual([])
      expect(window.xqs).toEqual([])
      expect(window.ig_names).toEqual([])
    })
  })

  describe('legacyUpdateMachineSettings', () => {
    it('should update settings for crafting table', () => {
      window.data = [{ id: 1, mName: '制作台' }]
      window.saveSetting = vi.fn()
      window.update_all = vi.fn()

      legacyUpdateMachineSettings({
        modeIn: '制作台Mk.Ⅱ',
        furnace: '电弧熔炉',
        chemical: '化工厂',
        accType: '增产剂Mk.Ⅱ',
        accValue: '加速',
        research: '矩阵研究站',
        hideSource: false
      })

      expect(window.settingsLocal[1].m).toBe('制作台Mk.Ⅱ')
      expect(window.settingsLocal[1].accType).toBe('增产剂Mk.Ⅱ')
      expect(window.settingsLocal[1].accValue).toBe('加速')
      expect(window.defaultAccType).toBe('增产剂Mk.Ⅱ')
      expect(window.defaultAccValue).toBe('加速')
    })

    it('should update settings for smelter', () => {
      window.data = [{ id: 2, mName: '冶炼设备' }]

      legacyUpdateMachineSettings({
        modeIn: '制作台Mk.Ⅰ',
        furnace: '位面熔炉',
        chemical: '化工厂',
        accType: '增产剂Mk.Ⅰ',
        accValue: '无',
        research: '矩阵研究站',
        hideSource: false
      })

      expect(window.settingsLocal[2].m).toBe('位面熔炉')
    })

    it('should update settings for chemical plant', () => {
      window.data = [{ id: 3, mName: '化工设备' }]

      legacyUpdateMachineSettings({
        modeIn: '制作台Mk.Ⅰ',
        furnace: '电弧熔炉',
        chemical: '量子化工',
        accType: '增产剂Mk.Ⅰ',
        accValue: '无',
        research: '矩阵研究站',
        hideSource: false
      })

      expect(window.settingsLocal[3].m).toBe('量子化工')
    })

    it('should update settings for research station', () => {
      window.data = [{ id: 4, mName: '研究站' }]

      legacyUpdateMachineSettings({
        modeIn: '制作台Mk.Ⅰ',
        furnace: '电弧熔炉',
        chemical: '化工厂',
        accType: '增产剂Mk.Ⅰ',
        accValue: '无',
        research: '研究站Mk.Ⅱ',
        hideSource: false
      })

      expect(window.settingsLocal[4].m).toBe('研究站Mk.Ⅱ')
    })

    it('should update hideSource checkbox', () => {
      window.data = []
      window.hideSource = { checked: false }

      legacyUpdateMachineSettings({
        modeIn: '制作台Mk.Ⅰ',
        furnace: '电弧熔炉',
        chemical: '化工厂',
        accType: '增产剂Mk.Ⅰ',
        accValue: '无',
        research: '矩阵研究站',
        hideSource: true
      })

      expect(window.hideSource.checked).toBe(true)
    })
  })

  describe('legacyGetMachineSettings', () => {
    it('should return default settings when not set', () => {
      const settings = legacyGetMachineSettings()

      expect(settings.modeIn).toBe('制作台Mk.Ⅰ')
      expect(settings.furnace).toBe('电弧熔炉')
      expect(settings.chemical).toBe('化工厂')
      expect(settings.accType).toBe('增产剂Mk.Ⅰ')
      expect(settings.accValue).toBe('无')
      expect(settings.research).toBe('矩阵研究站')
    })

    it('should return custom accelerator settings', () => {
      window.defaultAccType = '增产剂Mk.Ⅲ'
      window.defaultAccValue = '增产'

      const settings = legacyGetMachineSettings()

      expect(settings.accType).toBe('增产剂Mk.Ⅲ')
      expect(settings.accValue).toBe('增产')
    })

    it('should return hideSource from checkbox', () => {
      window.hideSource = { checked: true }

      const settings = legacyGetMachineSettings()

      expect(settings.hideSource).toBe(true)
    })
  })

  describe('legacyUpdateConfig', () => {
    beforeEach(() => {
      initLegacyBridge()
    })

    it('should update conveyorBeltStackLayer', () => {
      legacyUpdateConfig({ conveyorBeltStackLayer: 8 })

      expect(window.conveyorBeltStackLayer.value).toBe('8')
    })

    it('should update onlyConveyorBeltMk3', () => {
      legacyUpdateConfig({ onlyConveyorBeltMk3: false })

      expect(window.onlyConveyorBeltMk3.checked).toBe(false)
    })

    it('should update onlySorterMk3', () => {
      legacyUpdateConfig({ onlySorterMk3: false })

      expect(window.onlySorterMk3.checked).toBe(false)
    })

    it('should update useSorterMk4', () => {
      legacyUpdateConfig({ useSorterMk4: true })

      expect(window.useSorterMk4.checked).toBe(true)
    })

    it('should update selfSpray', () => {
      legacyUpdateConfig({ selfSpray: false })

      expect(window.selfAcc.checked).toBe(false)
    })

    it('should update generateTeslaTower', () => {
      legacyUpdateConfig({ generateTeslaTower: false })

      expect(window.generateTeslaTower.checked).toBe(false)
    })

    it('should update teslaTowerLineInterval', () => {
      legacyUpdateConfig({ teslaTowerLineInterval: 5 })

      expect(window.teslaTowerLineInterval.value).toBe('5')
    })

    it('should update stackLayers', () => {
      legacyUpdateConfig({ stackLayers: 3 })

      expect(window.stackLayers.value).toBe('3')
    })

    it('should update x_y_ratio', () => {
      legacyUpdateConfig({ x_y_ratio: 3 })

      expect(window.x_y_ratio.value).toBe('3')
    })

    it('should update maxLabLayers', () => {
      legacyUpdateConfig({ maxLabLayers: 20 })

      expect(window.maxLabLayers.value).toBe('20')
    })
  })

  describe('legacyGetConfigFromDOM', () => {
    beforeEach(() => {
      window.conveyorBeltStackLayer = { value: '4' }
      window.onlyConveyorBeltMk3 = { checked: true }
      window.onlySorterMk3 = { checked: true }
      window.useSorterMk4 = { checked: false }
      window.selfAcc = { checked: false }
      window.generateTeslaTower = { checked: true }
      window.teslaTowerLineInterval = { value: '1' }
      window.stackLayers = { value: '1' }
      window.x_y_ratio = { value: '2' }
      window.maxLabLayers = { value: '15' }
    })

    it('should return config from DOM elements', () => {
      const config = legacyGetConfigFromDOM()

      expect(config.conveyorBeltStackLayer).toBe(4)
      expect(config.onlyConveyorBeltMk3).toBe(true)
      expect(config.onlySorterMk3).toBe(true)
      expect(config.useSorterMk4).toBe(false)
      expect(config.selfSpray).toBe(false)
      expect(config.generateTeslaTower).toBe(true)
      expect(config.teslaTowerLineInterval).toBe(1)
      expect(config.stackLayers).toBe(1)
      expect(config.x_y_ratio).toBe(2)
      expect(config.maxLabLayers).toBe(15)
    })
  })

  describe('legacyUpdateSpeedSettings', () => {
    it('should update settings_time for various machines', () => {
      legacyUpdateSpeedSettings({
        oreSpeed: 100,
        fractionatorSpeed: 20,
        largeMinerSpeed: 100,
        oilSpeed: 5,
        orbitalDeuterium: 0.02,
        orbitalFireIce: 0.5,
        orbitalHydrogenIce: 0.6,
        orbitalHydrogenGas: 1.2,
        criticalPhotonSpeed: 10,
        pointLength: 2
      })

      expect(window.settings_time['采矿机']).toBeDefined()
      expect(window.settings_time['分馏塔']).toBe(20)
      expect(window.settings_time['原油萃取站']).toBe(5)
      expect(window.pointLength.value).toBe('2')
    })

    it('should call saveSettingTime if available', () => {
      window.saveSettingTime = vi.fn()

      legacyUpdateSpeedSettings({
        oreSpeed: 100,
        fractionatorSpeed: 18,
        largeMinerSpeed: 100,
        oilSpeed: 4,
        orbitalDeuterium: 0.02,
        orbitalFireIce: 0.5,
        orbitalHydrogenIce: 0.5,
        orbitalHydrogenGas: 1,
        criticalPhotonSpeed: 5,
        pointLength: 1
      })

      expect(window.saveSettingTime).toHaveBeenCalled()
    })

    it('should call update_all if available', () => {
      window.update_all = vi.fn()

      legacyUpdateSpeedSettings({
        oreSpeed: 100,
        fractionatorSpeed: 18,
        largeMinerSpeed: 100,
        oilSpeed: 4,
        orbitalDeuterium: 0.02,
        orbitalFireIce: 0.5,
        orbitalHydrogenIce: 0.5,
        orbitalHydrogenGas: 1,
        criticalPhotonSpeed: 5,
        pointLength: 1
      })

      expect(window.update_all).toHaveBeenCalled()
    })
  })

  describe('legacyGetSpeedSettings', () => {
    it('should return default speed settings', () => {
      const settings = legacyGetSpeedSettings()

      expect(settings.oreSpeed).toBeDefined()
      expect(settings.fractionatorSpeed).toBe(18)
      expect(settings.oilSpeed).toBe(4)
      expect(settings.pointLength).toBe(1)
    })

    it('should return settings from settings_time', () => {
      window.settings_time = {
        采矿机: 3,
        分馏塔: 25,
        原油萃取站: 6
      }

      const settings = legacyGetSpeedSettings()

      expect(settings.fractionatorSpeed).toBe(25)
      expect(settings.oilSpeed).toBe(6)
    })
  })

  describe('legacyUpdateLogisticsSettings', () => {
    it('should update logistics settings', () => {
      legacyUpdateLogisticsSettings({
        beltType: '极速传送带',
        logisticStack: 4
      })

      expect(window.logisticsSettings.beltType).toBe('极速传送带')
      expect(window.logisticsSettings.logisticStack).toBe(4)
    })

    it('should set beltSpeed based on belt type', () => {
      legacyUpdateLogisticsSettings({
        beltType: '高速传送带',
        logisticStack: 1
      })

      expect(window.beltSpeed).toBe(720)
    })

    it('should default to 1800 for unknown belt type', () => {
      legacyUpdateLogisticsSettings({
        beltType: '未知传送带',
        logisticStack: 1
      })

      expect(window.beltSpeed).toBe(1800)
    })
  })

  describe('legacyGetLogisticsSettings', () => {
    it('should return default logistics settings', () => {
      window.logisticsSettings = { beltType: '极速传送带', logisticStack: 1 }

      const settings = legacyGetLogisticsSettings()

      expect(settings.beltType).toBe('极速传送带')
      expect(settings.logisticStack).toBe(1)
    })

    it('should return stored logistics settings', () => {
      window.logisticsSettings = {
        beltType: '高速传送带',
        logisticStack: 2
      }

      const settings = legacyGetLogisticsSettings()

      expect(settings.beltType).toBe('高速传送带')
      expect(settings.logisticStack).toBe(2)
    })
  })

  describe('legacySetProductionSettings', () => {
    beforeEach(() => {
      initLegacyBridge()
    })

    it('should update txtnumber value', () => {
      legacySetProductionSettings(120)

      expect(window.txtnumber.value).toBe('120')
    })

    it('should update selmaince value when provided', () => {
      legacySetProductionSettings(60, 5)

      expect(window.selmaince.value).toBe('5')
    })
  })

  describe('legacyGetProductionSettings', () => {
    beforeEach(() => {
      window.txtnumber = { value: '60' }
      window.selmaince = { value: '1' }
    })

    it('should return production settings from DOM', () => {
      const settings = legacyGetProductionSettings()

      expect(settings.productionPerMinute).toBe(60)
      expect(settings.machineCount).toBe(1)
    })
  })

  describe('getSelectableItems', () => {
    it('should return empty array when game_data is not loaded', () => {
      window.game_data = undefined as unknown as typeof window.game_data

      const items = getSelectableItems()

      expect(items).toEqual([])
    })

    it('should extract item names from icons', () => {
      window.game_data = {
        icons1: [
          { name: '1-1-铁块', value: 'base64icon1' },
          { name: '1-2-铜块', value: 'base64icon2' }
        ],
        icons2: [{ name: '2-1-齿轮', value: 'base64icon3' }]
      }

      const items = getSelectableItems()

      expect(items).toContain('铁块')
      expect(items).toContain('铜块')
      expect(items).toContain('齿轮')
    })

    it('should not contain duplicates', () => {
      window.game_data = {
        icons1: [
          { name: '1-1-铁块', value: 'base64icon1' },
          { name: '1-2-铁块', value: 'base64icon2' }
        ],
        icons2: []
      }

      const items = getSelectableItems()
      const ironCount = items.filter(i => i === '铁块').length

      expect(ironCount).toBe(1)
    })
  })

  describe('getSelectableItemsWithIcons', () => {
    it('should return empty result when game_data is not loaded', () => {
      window.game_data = undefined as unknown as typeof window.game_data

      const result = getSelectableItemsWithIcons()

      expect(result.icons1).toEqual([])
      expect(result.icons2).toEqual([])
    })

    it('should return items with icons', () => {
      window.game_data = {
        icons1: [{ name: '1-1-铁块', value: 'base64icon1' }],
        icons2: [{ name: '2-1-铜块', value: 'base64icon2' }]
      }

      const result = getSelectableItemsWithIcons()

      expect(result.icons1).toHaveLength(1)
      expect(result.icons1[0]).toEqual({
        name: '铁块',
        icon: 'base64icon1'
      })
      expect(result.icons2).toHaveLength(1)
      expect(result.icons2[0]).toEqual({
        name: '铜块',
        icon: 'base64icon2'
      })
    })
  })

  describe('getIconData', () => {
    it('should return empty object when game_data is not loaded', () => {
      window.game_data = undefined as unknown as typeof window.game_data

      const icons = getIconData()

      expect(icons).toEqual({})
    })

    it('should return icon data with base64 prefix', () => {
      window.game_data = {
        icons1: [{ name: '1-1-铁块', value: 'base64icon1' }],
        icons2: []
      }

      const icons = getIconData()

      expect(icons['铁块']).toBe('data:image/png;base64,base64icon1')
    })
  })

  describe('isLegacyDataLoaded', () => {
    it('should return false when data is not loaded', () => {
      window.data = undefined as unknown as typeof window.data
      window.update_all = undefined as unknown as typeof window.update_all
      window.find = undefined as unknown as typeof window.find

      expect(isLegacyDataLoaded()).toBe(false)
    })

    it('should return true when all required functions exist', () => {
      window.data = []
      window.update_all = () => {}
      window.find = () => null

      expect(isLegacyDataLoaded()).toBe(true)
    })
  })

  describe('isGameDataLoaded', () => {
    it('should return false when isDataLoaded is false', () => {
      window.isDataLoaded = false

      expect(isGameDataLoaded()).toBe(false)
    })

    it('should return true when isDataLoaded is true', () => {
      window.isDataLoaded = true

      expect(isGameDataLoaded()).toBe(true)
    })
  })
})
