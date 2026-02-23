import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SettingsAdapter, settingsAdapter } from '../SettingsAdapter'
import type { IRecipeSettings, ISpeedSettings, IProductivitySettings } from '../../types/settings'

describe('SettingsAdapter', () => {
  let adapter: SettingsAdapter

  beforeEach(() => {
    adapter = new SettingsAdapter()

    localStorage.clear()

    const mockWindow = {
      settings: {},
      settings_time: {},
      settings_pf: {},
      saveSetting: vi.fn(),
      saveSettingTime: vi.fn(),
      saveSettingPf: vi.fn(),
      update_all: vi.fn()
    }

    vi.stubGlobal('window', mockWindow)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  describe('init', () => {
    it('should initialize with empty settings', () => {
      adapter.init()

      expect(window.settings).toEqual({})
      expect(window.settings_time).toEqual({})
      expect(window.settings_pf).toEqual({})
    })

    it('should load settings from localStorage', () => {
      localStorage.setItem(
        'machine_settings20240202',
        JSON.stringify({ 'recipe-1': { m: 'arcSmelter' } })
      )
      localStorage.setItem('machine_settings_time20240202', JSON.stringify({ arcSmelter: 1.0 }))
      localStorage.setItem('machine_settings_pf20240202', JSON.stringify({ ironOre: 0 }))

      adapter.init()

      expect(adapter.getRecipeMachine('recipe-1')).toBe('arcSmelter')
      expect(adapter.getSpeedSetting('arcSmelter')).toBe(1.0)
      expect(adapter.getProductivitySetting('ironOre')).toBe(0)
    })
  })

  describe('recipe settings', () => {
    beforeEach(() => {
      adapter.init()
    })

    it('should get and set recipe machine', () => {
      adapter.setRecipeMachine('recipe-1', 'arcSmelter')

      expect(adapter.getRecipeMachine('recipe-1')).toBe('arcSmelter')
      expect(window.settings['recipe-1']?.m).toBe('arcSmelter')

      const stored = JSON.parse(localStorage.getItem('machine_settings20240202') || '{}')
      expect(stored['recipe-1']?.m).toBe('arcSmelter')
    })

    it('should get and set recipe accType', () => {
      adapter.setRecipeAccType('recipe-1', 'proliferatorMk1')

      expect(adapter.getRecipeAccType('recipe-1')).toBe('proliferatorMk1')
      expect(window.settings['recipe-1']?.accType).toBe('proliferatorMk1')
    })

    it('should get and set recipe accValue', () => {
      adapter.setRecipeAccValue('recipe-1', 'speed')

      expect(adapter.getRecipeAccValue('recipe-1')).toBe('speed')
      expect(window.settings['recipe-1']?.accValue).toBe('speed')
    })

    it('should return undefined for non-existent recipe', () => {
      expect(adapter.getRecipeMachine('non-existent')).toBeUndefined()
      expect(adapter.getRecipeSetting('non-existent')).toBeUndefined()
    })

    it('should get all recipe settings', () => {
      adapter.setRecipeMachine('recipe-1', 'arcSmelter')
      adapter.setRecipeMachine('recipe-2', 'assemblingMachineMk1')

      const allSettings = adapter.getAllRecipeSettings()

      expect(Object.keys(allSettings).length).toBe(2)
      expect(allSettings['recipe-1']?.m).toBe('arcSmelter')
      expect(allSettings['recipe-2']?.m).toBe('assemblingMachineMk1')
    })
  })

  describe('speed settings', () => {
    beforeEach(() => {
      adapter.init()
    })

    it('should get and set speed setting', () => {
      adapter.setSpeedSetting('arcSmelter', 1.5)

      expect(adapter.getSpeedSetting('arcSmelter')).toBe(1.5)
      expect(window.settings_time['arcSmelter']).toBe(1.5)

      const stored = JSON.parse(localStorage.getItem('machine_settings_time20240202') || '{}')
      expect(stored['arcSmelter']).toBe(1.5)
    })

    it('should return undefined for non-existent speed setting', () => {
      expect(adapter.getSpeedSetting('non-existent')).toBeUndefined()
    })

    it('should get all speed settings', () => {
      adapter.setSpeedSetting('arcSmelter', 1.0)
      adapter.setSpeedSetting('assemblingMachineMk1', 0.75)

      const allSettings = adapter.getAllSpeedSettings()

      expect(Object.keys(allSettings).length).toBe(2)
      expect(allSettings['arcSmelter']).toBe(1.0)
      expect(allSettings['assemblingMachineMk1']).toBe(0.75)
    })
  })

  describe('productivity settings', () => {
    beforeEach(() => {
      adapter.init()
    })

    it('should get and set productivity setting', () => {
      adapter.setProductivitySetting('ironOre', 2)

      expect(adapter.getProductivitySetting('ironOre')).toBe(2)
      expect(window.settings_pf['ironOre']).toBe(2)

      const stored = JSON.parse(localStorage.getItem('machine_settings_pf20240202') || '{}')
      expect(stored['ironOre']).toBe(2)
    })

    it('should return undefined for non-existent productivity setting', () => {
      expect(adapter.getProductivitySetting('non-existent')).toBeUndefined()
    })

    it('should get all productivity settings', () => {
      adapter.setProductivitySetting('ironOre', 0)
      adapter.setProductivitySetting('copperOre', 1)

      const allSettings = adapter.getAllProductivitySettings()

      expect(Object.keys(allSettings).length).toBe(2)
      expect(allSettings['ironOre']).toBe(0)
      expect(allSettings['copperOre']).toBe(1)
    })
  })

  describe('reset', () => {
    it('should clear all settings', () => {
      adapter.init()
      adapter.setRecipeMachine('recipe-1', 'arcSmelter')
      adapter.setSpeedSetting('arcSmelter', 1.0)
      adapter.setProductivitySetting('ironOre', 0)

      adapter.reset()

      expect(adapter.getAllRecipeSettings()).toEqual({})
      expect(adapter.getAllSpeedSettings()).toEqual({})
      expect(adapter.getAllProductivitySettings()).toEqual({})
      expect(window.settings).toEqual({})
      expect(window.settings_time).toEqual({})
      expect(window.settings_pf).toEqual({})
    })
  })

  describe('storage operations', () => {
    beforeEach(() => {
      adapter.init()
    })

    it('should save to localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      adapter.setRecipeMachine('recipe-1', 'arcSmelter')
      adapter.saveToStorage()

      expect(setItemSpy).toHaveBeenCalled()
    })

    it('should load from localStorage', () => {
      const getItemSpy = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockReturnValue(JSON.stringify({ 'recipe-1': { m: 'arcSmelter' } }))

      adapter.loadFromStorage()

      expect(getItemSpy).toHaveBeenCalled()
    })
  })
})

describe('settingsAdapter singleton', () => {
  it('should be a singleton instance', () => {
    expect(settingsAdapter).toBeInstanceOf(SettingsAdapter)
  })
})
