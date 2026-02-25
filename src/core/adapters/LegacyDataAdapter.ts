/**
 * LegacyDataAdapter - 遗留数据适配器
 *
 * 功能：
 * - 提供对遗留数据的类型安全访问
 * - 封装对window全局变量的访问
 * - 支持数据同步和状态管理
 * - 提供数据转换接口
 *
 * 设计原则：
 * - 最小侵入：不修改遗留代码逻辑
 * - 类型安全：使用TypeScript类型定义
 * - 逐步迁移：支持新旧代码共存
 * - 易于测试：提供可mock的接口
 *
 * 上游调用：
 * - core/bridge.ts: 遗留桥接
 * - core/services/LegacyDataService.ts: 遗留数据服务
 *
 * 下游依赖：
 * - core/legacy/data.js: 遗留数据模块
 */

import { logger } from '../../utils/logger'
import { legacyDataService } from '../services/LegacyDataService'
import type { LegacyWindow, ILegacyDataItem } from '../types/legacy'
import type { IRawRecipe } from '../types/settings'

export interface IDemandSync {
  demandList: Array<{ name: string; num?: number; number?: number }>
  excludeList: string[]
  machineSettings?: {
    modeIn?: string
    furnace?: string
    chemical?: string
    accType?: string
    accValue?: string
    research?: string
    hideSource?: boolean
    selfAcc?: boolean
    isAddSelfAccP?: boolean
  }
}

export interface IMachineConfig {
  modeIn: string
  furnace: string
  chemical: string
  accType: string
  accValue: string
  research: string
  hideSource: boolean
}

class LegacyDataAdapter {
  private static instance: LegacyDataAdapter

  private constructor() {}

  static getInstance(): LegacyDataAdapter {
    if (!this.instance) {
      this.instance = new LegacyDataAdapter()
    }
    return this.instance
  }

  private getWin(): LegacyWindow {
    return window as unknown as LegacyWindow
  }

  async ensureInitialized(): Promise<void> {
    await legacyDataService.ensureReady()
  }

  syncStateToLegacy(state: IDemandSync): void {
    try {
      const win = this.getWin()

      win.xqs = win.xqs || []
      win.xqs.length = 0
      state.demandList.forEach(d => {
        win.xqs!.push({
          name: d.name,
          value: d.num || d.number || 1,
          number: d.num || d.number || 1,
          item: { name: d.name }
        })
      })

      win.ig_names = win.ig_names || []
      win.ig_names.length = 0
      state.excludeList.forEach(name => {
        win.ig_names!.push(name)
      })

      if (state.machineSettings) {
        const ms = state.machineSettings
        if (ms.accType !== undefined) {
          win.defaultAccType = ms.accType
        }
        if (ms.accValue !== undefined) {
          win.defaultAccValue = ms.accValue
        }
        if (ms.hideSource !== undefined && win.hideSource) {
          win.hideSource.checked = ms.hideSource
        }
        if (ms.selfAcc !== undefined && win.selfAcc) {
          win.selfAcc.checked = ms.selfAcc
        }
        if (ms.isAddSelfAccP !== undefined && win.isAddSelfAccP) {
          win.isAddSelfAccP.checked = ms.isAddSelfAccP
        }

        if (win.data && win.settings) {
          const data = win.data as ILegacyDataItem[]
          const settings = win.settings
          data.forEach((item: ILegacyDataItem) => {
            if (!settings[item.id]) {
              settings[item.id] = {}
            }
            if (item.mName === '制作台' && ms.modeIn !== undefined && !settings[item.id].m) {
              settings[item.id].m = ms.modeIn
            }
            if (item.mName === '冶炼设备' && ms.furnace !== undefined && !settings[item.id].m) {
              settings[item.id].m = ms.furnace
            }
            if (item.mName === '化工设备' && ms.chemical !== undefined && !settings[item.id].m) {
              settings[item.id].m = ms.chemical
            }
            if (item.mName === '研究站' && ms.research !== undefined && !settings[item.id].m) {
              settings[item.id].m = ms.research
            }
            if (ms.accType !== undefined && !settings[item.id].accType) {
              settings[item.id].accType = ms.accType
            }
            if (ms.accValue !== undefined && !settings[item.id].accValue) {
              settings[item.id].accValue = ms.accValue
            }
          })
        }
      }

      logger.debug('[LegacyDataAdapter] State synced to legacy')
    } catch (error) {
      logger.error('[LegacyDataAdapter] Failed to sync state:', error)
      throw error
    }
  }

  clearLegacyState(): void {
    try {
      const win = this.getWin()

      if (win.xh_list) {
        win.xh_list.length = 0
      }
      if (win.out_list) {
        win.out_list.length = 0
      }
      if (win.xqs) {
        win.xqs.length = 0
      }
      if (win.ig_names) {
        win.ig_names.length = 0
      }
      if (win.xhMap) {
        Object.keys(win.xhMap).forEach(key => delete win.xhMap![key])
      }
      if (win.outMap) {
        Object.keys(win.outMap).forEach(key => delete win.outMap![key])
      }

      logger.debug('[LegacyDataAdapter] Legacy state cleared')
    } catch (error) {
      logger.error('[LegacyDataAdapter] Failed to clear state:', error)
      throw error
    }
  }

  updateMachineSettings(config: IMachineConfig): void {
    try {
      const win = this.getWin()
      const data = win.data || []

      if (!win.settingsLocal) {
        win.settingsLocal = {}
      }
      if (!win.settings) {
        win.settings = {}
      }

      const settingsLocal = win.settingsLocal
      const settings = win.settings

      data.forEach((item: ILegacyDataItem) => {
        if (!settingsLocal[item.id]) {
          settingsLocal[item.id] = {}
        }
        if (!settings[item.id]) {
          settings[item.id] = {}
        }

        if (item.mName === '制作台') {
          settingsLocal[item.id].m = config.modeIn
          settings[item.id].m = config.modeIn
        }
        if (item.mName === '冶炼设备') {
          settingsLocal[item.id].m = config.furnace
          settings[item.id].m = config.furnace
        }
        if (item.mName === '化工设备') {
          settingsLocal[item.id].m = config.chemical
          settings[item.id].m = config.chemical
        }
        if (item.mName === '研究站') {
          settingsLocal[item.id].m = config.research
          settings[item.id].m = config.research
        }

        settingsLocal[item.id].accType = config.accType
        settingsLocal[item.id].accValue = config.accValue
        settings[item.id].accType = config.accType
        settings[item.id].accValue = config.accValue
      })

      win.defaultAccType = config.accType
      win.defaultAccValue = config.accValue

      if (win.hideSource) {
        win.hideSource.checked = config.hideSource
      }

      logger.debug('[LegacyDataAdapter] Machine settings updated')
    } catch (error) {
      logger.error('[LegacyDataAdapter] Failed to update machine settings:', error)
      throw error
    }
  }

  getMachineSettings(): IMachineConfig {
    try {
      const win = this.getWin()
      return {
        modeIn: '制作台Mk.Ⅰ',
        furnace: '电弧熔炉',
        chemical: '化工厂',
        accType: win.defaultAccType || '增产剂Mk.Ⅰ',
        accValue: win.defaultAccValue || '无',
        research: '矩阵研究站',
        hideSource: win.hideSource?.checked ?? false
      }
    } catch (error) {
      logger.error('[LegacyDataAdapter] Failed to get machine settings:', error)
      throw error
    }
  }

  findItem(name: string, normalize?: boolean): ILegacyDataItem | null {
    try {
      const win = this.getWin()
      if (typeof win.find === 'function') {
        return win.find(name, normalize)
      }
      return null
    } catch (error) {
      logger.error('[LegacyDataAdapter] Failed to find item:', error)
      return null
    }
  }

  isGameDataLoaded(): boolean {
    try {
      const win = this.getWin()
      return Array.isArray(win.data) && win.data.length > 0
    } catch (error) {
      logger.error('[LegacyDataAdapter] Failed to check game data loaded:', error)
      return false
    }
  }

  isRecipeIndexReady(): boolean {
    try {
      const win = this.getWin()
      return !!(win.recipeIndexByProduct && Object.keys(win.recipeIndexByProduct).length > 0)
    } catch (error) {
      logger.error('[LegacyDataAdapter] Failed to check recipe index ready:', error)
      return false
    }
  }

  getRecipeData(): ILegacyDataItem[] {
    try {
      const win = this.getWin()
      return win.data || []
    } catch (error) {
      logger.error('[LegacyDataAdapter] Failed to get recipe data:', error)
      return []
    }
  }

  getRecipeIndexByProduct(): Record<string, number[]> {
    try {
      const win = this.getWin()
      return win.recipeIndexByProduct || {}
    } catch (error) {
      logger.error('[LegacyDataAdapter] Failed to get recipe index:', error)
      return {}
    }
  }
}

export const legacyDataAdapter = LegacyDataAdapter.getInstance()
