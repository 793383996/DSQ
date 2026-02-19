/**
 * RecipeCalculator - 配方计算器
 *
 * 功能：
 * - 执行配方递归计算
 * - 管理消耗列表(xhList)和产出列表(outList)
 * - 处理增产剂效果计算
 * - 支持多产出配方合并
 * - 支持临界光子特殊处理
 *
 * 主要方法：
 * - find(name, options): 查找配方
 * - loadNumber(itemName, n, options): 递归计算物品需求
 * - checkResultWithMachineInfo(getMachineInfo, settingsPf, settings, defaultAccValue): 检查结果溢出
 * - fixGzSpeed(settingsTime, settingsPf): 修正光栅石速度
 * - mergeMul(): 合并多产出配方
 * - getPfs(productName): 获取产品所有可选配方
 * - clearState(): 清空状态
 * - getState(): 获取当前状态
 *
 * 上游调用：
 * - core/services/UpdateAllService.ts: 更新服务
 * - core/workers/calculator.worker.ts: Worker计算
 *
 * 下游依赖：
 * - core/types/settings.ts: 设置类型定义
 * - utils/logger.ts: 日志记录
 *
 * 状态结构：
 * - xhList: 消耗列表
 * - outList: 产出列表
 * - xhMap: 消耗映射（快速查找）
 * - outMap: 产出映射（快速查找）
 * - igNames: 排除列表
 *
 * 递归深度控制：
 * - 默认最大深度200
 * - 超过深度时记录警告并返回
 */
import type { IRawRecipe } from '../types/settings'
import { logger } from '../../utils/logger'

export interface ICalculationState {
  xhList: Array<{ name: string; value: number; value2?: number; accTotal?: number }>
  outList: Array<{ name: string; value: number }>
  xhMap: Record<string, { name: string; value: number; value2?: number; accTotal?: number }>
  outMap: Record<string, { name: string; value: number }>
  igNames: string[]
}

export interface IRecipeFinderOptions {
  normalizeRecipe?: boolean
  settingsPf?: Record<string, string | number>
  settings?: Record<string, { accType?: string; accValue?: string }>
  defaultAccValue?: string
}

export interface ILoadNumberOptions {
  settings?: Record<string, { accType?: string; accValue?: string }>
  settingsPf?: Record<string, string | number>
  defaultAccType?: string
  defaultAccValue?: string
  selfAcc?: boolean
  isAddSelfAccP?: boolean
  maxDepth?: number
  // P3-2修复：添加递归深度超限回调，用于通知用户
  onDepthExceeded?: (itemName: string, depth: number) => void
}

const DEFAULT_MAX_DEPTH = 200

export class RecipeCalculator {
  private state: ICalculationState
  private recipes: IRawRecipe[]
  private recipeIndexByProduct: Record<string, number[]>
  private loadNumberDepth: number = 0
  private maxLoadNumberDepth: number
  // P10-1修复：添加临界光子缓存，支持从UpdateAllService传入
  private criticalPhotonTCache: number | null = null
  private criticalPhotonLensNCache: number | null = null
  // P0-1修复：添加轨道采集器缓存，支持从UpdateAllService传入
  // 老代码doSpeed1直接修改data数组的t值，新代码使用缓存机制
  private orbitalCollectorTCache: Map<string, number> = new Map()

  constructor(
    recipes: IRawRecipe[],
    recipeIndexByProduct: Record<string, number[]>,
    maxDepth: number = DEFAULT_MAX_DEPTH
  ) {
    this.recipes = recipes
    this.recipeIndexByProduct = recipeIndexByProduct
    this.maxLoadNumberDepth = maxDepth
    this.state = this.createEmptyState()
  }

  // P10-1修复：设置临界光子缓存值
  setCriticalPhotonCache(t: number | null, lensN: number | null): void {
    this.criticalPhotonTCache = t
    this.criticalPhotonLensNCache = lensN
  }

  // P0-1修复：设置轨道采集器缓存值
  setOrbitalCollectorCache(cache: Map<string, number>): void {
    this.orbitalCollectorTCache = cache
  }

  private createEmptyState(): ICalculationState {
    return {
      xhList: [],
      outList: [],
      xhMap: {},
      outMap: {},
      igNames: []
    }
  }

  clearState(): void {
    this.state = this.createEmptyState()
    this.loadNumberDepth = 0
  }

  getState(): ICalculationState {
    return this.state
  }

  setIgNames(names: string[]): void {
    this.state.igNames = [...names]
  }

  private addXH(name: string, value: number): void {
    const item = this.state.xhMap[name]
    if (item) {
      item.value += value
      return
    }
    const newItem = { name, value }
    this.state.xhList.push(newItem)
    this.state.xhMap[name] = newItem
  }

  private addAccTotal(name: string, value: number): void {
    const item = this.state.xhMap[name]
    if (item) {
      item.accTotal = (item.accTotal || 0) + value
    }
  }

  private addOut(name: string, value: number): void {
    const item = this.state.outMap[name]
    if (item) {
      item.value += value
      return
    }
    const newItem = { name, value }
    this.state.outList.push(newItem)
    this.state.outMap[name] = newItem
  }

  findOut(name: string): number | null {
    const item = this.state.outMap[name]
    return item ? item.value : null
  }

  find(name: string, options: IRecipeFinderOptions = {}): IRawRecipe | null {
    const {
      normalizeRecipe = false,
      settingsPf = {},
      settings = {},
      defaultAccValue = '无'
    } = options

    const getRecipe = (item: IRawRecipe): IRawRecipe | null => {
      const o = structuredClone(item)
      if (!o.s) return null

      // P10-1修复：应用临界光子缓存值
      // 老代码直接修改data数组，新代码使用缓存机制
      // P12-1修复：使用o.s[0].name检查临界光子，因为原始配方对象没有name属性
      const mainProductName = o.s?.[0]?.name
      if (mainProductName === '临界光子' && o.mName === '射线接收塔') {
        if (this.criticalPhotonTCache !== null) {
          o.t = this.criticalPhotonTCache
        }
        if (this.criticalPhotonLensNCache !== null && o.q) {
          const lensInput = o.q.find(q => q.name === '引力透镜')
          if (lensInput) {
            lensInput.n = this.criticalPhotonLensNCache
          }
        }
      }

      // P0-1修复：应用轨道采集器缓存值
      // 老代码doSpeed1直接修改data数组的t值，新代码使用缓存机制
      // 轨道采集器生产氢/重氢/可燃冰时，需要根据用户设置的速度计算实际t值
      if (mainProductName === '氢' || mainProductName === '重氢' || mainProductName === '可燃冰') {
        const cacheKey = `${o.id}-${mainProductName}`
        const cachedT = this.orbitalCollectorTCache.get(cacheKey)
        if (cachedT !== undefined) {
          o.t = cachedT
        }
      }

      if (normalizeRecipe) {
        for (let i = 0; i < o.s.length; i++) {
          o.s[i].n = o.s[i].n || 1
        }
        if (o.q) {
          for (let i = 0; i < o.q.length; i++) {
            o.q[i].n = o.q[i].n || 1
          }
        }

        for (let i = 0; i < o.s.length; i++) {
          const sName = o.s[i].name
          if (o.q) {
            for (let j = 0; j < o.q.length; j++) {
              if (sName === o.q[j].name) {
                const toCancel = Math.min(o.s[i].n || 0, o.q[j].n || 0)
                o.s[i].n = (o.s[i].n || 0) - toCancel
                o.q[j].n = (o.q[j].n || 0) - toCancel
              }
            }
          }
        }

        o.s = o.s.filter(s => s.n !== 0)
        if (o.q) {
          o.q = o.q.filter(q => q.n !== 0)
        }
      }

      for (let j = 0; j < o.s.length; j++) {
        if (o.s[j].name === name) {
          Object.assign(o, o.s[j])
          return o
        }
      }
      return null
    }

    const pf = settingsPf[name]
    if (pf !== undefined) {
      const pfValue = typeof pf === 'number' ? pf : parseInt(pf, 10)
      const item = this.recipes[pfValue]
      if (item) return getRecipe(item)
    }

    const indices = this.recipeIndexByProduct[name]
    if (indices && indices.length > 0) {
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i]
        const item = this.recipes[idx]
        if (!item) continue

        // P1-1修复：settings key类型兼容处理，支持数字和字符串key
        // 遗留代码使用数字key，新代码可能使用字符串key
        const settingKey = item.id !== undefined ? item.id : undefined
        let accValue = defaultAccValue
        if (settingKey !== undefined) {
          accValue =
            settings[settingKey as unknown as keyof typeof settings]?.accValue ||
            settings[String(settingKey)]?.accValue ||
            defaultAccValue
        }
        if (accValue === '增产' && item.noExtra) continue

        const result = getRecipe(item)
        if (result) return result
      }
      return getRecipe(this.recipes[indices[0]])
    }

    for (let i = 0; i < this.recipes.length; i++) {
      const item = this.recipes[i]
      if (!item.s || !Array.isArray(item.s)) continue
      for (let j = 0; j < item.s.length; j++) {
        if (item.s[j].name === name) {
          return getRecipe(item)
        }
      }
    }
    return null
  }

  loadNumber(itemName: string, n: number, options: ILoadNumberOptions = {}): void {
    const {
      settings = {},
      settingsPf = {},
      defaultAccType = '增产剂Mk.Ⅰ',
      defaultAccValue = '无',
      selfAcc = false,
      isAddSelfAccP = false
    } = options

    this.loadNumberDepth++
    if (this.loadNumberDepth > this.maxLoadNumberDepth) {
      this.loadNumberDepth--
      logger.warn(`[RecipeCalculator] 配方递归深度超限，可能存在循环依赖: ${itemName}`)
      // P3-2修复：调用回调通知用户
      if (options.onDepthExceeded) {
        options.onDepthExceeded(itemName, this.loadNumberDepth)
      }
      return
    }

    try {
      if (this.state.igNames.includes(itemName)) {
        this.loadNumberDepth--
        return
      }

      if (
        (itemName === '增产剂Mk.Ⅰ' || itemName === '增产剂Mk.Ⅱ' || itemName === '增产剂Mk.Ⅲ') &&
        n < 0.1
      ) {
        this.loadNumberDepth--
        return
      }

      const item = this.find(itemName, {
        normalizeRecipe: true,
        settingsPf,
        settings,
        defaultAccValue
      })
      if (!item || !item.s) {
        this.loadNumberDepth--
        return
      }

      this.addXH(itemName, n)
      for (let i = 0; i < item.s.length; i++) {
        if (item.s[i].name !== itemName) {
          if (item.s[i].n === 0) continue
          this.addOut(item.s[i].name, (-1 * n * (item.s[i].n || 1)) / (item.n || 1))
        }
      }

      // P1-1修复：settings key类型兼容处理，支持数字和字符串key
      // 遗留代码使用数字key，新代码可能使用字符串key
      const itemId = item.id
      const getSetting = (key: string): { accType?: string; accValue?: string } | undefined => {
        if (itemId !== undefined) {
          // 先尝试数字key，再尝试字符串key
          return (
            settings[itemId as unknown as keyof typeof settings] ||
            settings[String(itemId) as keyof typeof settings] ||
            settings[key as keyof typeof settings]
          )
        }
        return settings[key as keyof typeof settings]
      }

      const itemSettings = getSetting('')
      const accType = itemSettings?.accType || defaultAccType
      let accValue = itemSettings?.accValue || defaultAccValue
      let accTotal = 0

      // 架构师注：accValue 修正逻辑与老代码 calculator.js loadNumber 函数对齐
      // 老代码在循环内检查，但逻辑等效于循环外检查
      // 老代码逻辑：accValue == '增产' && item.noExtra → '无'
      // 老代码逻辑：item.q.length == 0 || item.noExtra === null → '无'
      // 注意：noExtra === null 表示无效果（如能量枢纽充能），不应使用增产剂
      if (accValue === '增产' && item.noExtra) {
        accValue = '无'
      }
      if (!item.q || item.q.length === 0 || item.noExtra === null) {
        accValue = '无'
      }

      if (item.q) {
        for (let i = 0; i < item.q.length; i++) {
          const q = item.q[i]
          if (this.state.igNames.includes(q.name)) {
            continue
          }
          if (q.n === 0) continue
          if (q.name !== itemName) {
            let r = (n * (q.n || 1)) / (item.n || 1)
            let v = 1
            let tm = 0

            if (accType === '增产剂Mk.Ⅰ') {
              v = 1.125
              tm = 12
            } else if (accType === '增产剂Mk.Ⅱ') {
              v = 1.2
              tm = 24
            } else if (accType === '增产剂Mk.Ⅲ') {
              v = 1.25
              tm = 60
            }

            if (selfAcc) tm = tm * v - 1

            if (accValue === '加速') {
              accTotal += r / tm
              if (!isAddSelfAccP) {
                this.loadNumber(accType, r / tm, options)
              }
            } else if (accValue === '增产') {
              r /= v
              accTotal += r / tm
              if (!isAddSelfAccP) {
                this.loadNumber(accType, r / tm, options)
              }
            }

            // P0-1修复：添加outMap消费逻辑，与worker版本保持一致
            // 检查副产品是否可以抵消当前需求，避免重复计算
            const outValue = this.findOut(q.name)
            if (outValue !== null && outValue < 0) {
              const absOut = Math.abs(outValue)
              if (absOut >= r) {
                this.addOut(q.name, r)
                continue
              } else {
                this.addOut(q.name, absOut)
                r = r - absOut
              }
            }
            if (r > 0) {
              this.loadNumber(q.name, r, options)
            }
          } else {
            // 架构师注：q.name === itemName 时，仍需处理 outMap 消费逻辑
            // 老代码此处为空块，但 outMap 消费在 loadNumber 递归中处理
          }
        }
      }
      this.addAccTotal(itemName, accTotal)
    } finally {
      this.loadNumberDepth--
    }
  }

  checkResult(): void {
    // 架构师注：此方法已废弃，请使用 checkResultWithMachineInfo
    // 原因：checkResult需要访问机器信息(speed, time)，而RecipeCalculator不持有这些信息
    // UpdateAllService调用的是checkResultWithMachineInfo，传入必要的机器信息
    // 此方法保留仅为向后兼容，实际不执行任何操作
    logger.warn(
      '[RecipeCalculator] checkResult() is deprecated, use checkResultWithMachineInfo() instead'
    )
  }

  // P3-1修复：添加checkResultWithMachineInfo方法，实现完整的checkResult逻辑
  // 此方法由UpdateAllService调用，传入必要的机器信息
  // P11-2修复：与老代码data.js checkResult函数完全对齐（第5472行）
  // 老代码逻辑：isOverflow检查所有产物都有out且out <= -mn才溢出
  // 使用while循环逐步调整value2，而非ratio一次性调整
  // P9-1修复：添加settingsPf参数，确保使用用户选择的配方
  checkResultWithMachineInfo(
    getMachineInfo: (recipe: IRawRecipe) => { speed: number; t: number },
    settingsPf: Record<string, string | number> = {},
    settings: Record<string, { accType?: string; accValue?: string }> = {},
    defaultAccValue: string = '无'
  ): void {
    // P11-2修复：isOverflow逻辑与老代码data.js完全对齐
    // 老代码：如果任何产物的out为null，返回false（不溢出）
    // 老代码：如果任何产物满足out > -mn，返回false（不溢出）
    // 只有所有产物都有out且都满足out <= -mn时，才返回true（溢出）
    const isOverflow = (
      item: IRawRecipe,
      info: { speed: number; t: number },
      nn: number
    ): boolean => {
      if (!item.s) return false
      for (let j = 0; j < item.s.length; j++) {
        const out = this.findOut(item.s[j].name)
        if (out === null) return false
        const mn = ((nn * 60) / info.t) * info.speed * (item.s[j].n || 1)
        if (out > -1 * mn) return false
      }
      return true
    }

    for (let i = 0; i < this.state.xhList.length; i++) {
      const xh = this.state.xhList[i]
      if (!xh.value) continue

      // P9-1修复：传入settingsPf参数，确保使用用户选择的配方
      const item = this.find(xh.name, { settingsPf, settings, defaultAccValue })
      if (!item || !item.s) continue

      const info = getMachineInfo(item)
      let nn = 1
      // P11-2修复：老代码检查value2 < 1，不是value2 <= 0
      if (xh.value2 !== undefined && xh.value2 < 1) {
        nn = xh.value2
      }

      // P11-2修复：老代码while循环条件是 isOverflow && value2 > 0
      // 老代码先检查isOverflow，再检查value2 > 0
      while (isOverflow(item, info, nn) && (xh.value2 || 0) > 0) {
        if ((xh.value2 || 0) < 1) {
          nn = xh.value2!
        }
        xh.value2 = (xh.value2 || 0) - nn

        for (let j = 0; j < item.s.length; j++) {
          const mn = ((nn * 60) / info.t) * info.speed * (item.s[j].n || 1)
          this.addOut(item.s[j].name, mn)
        }

        if ((xh.value2 || 0) < 1) {
          nn = xh.value2 || 0
        }
      }
    }
  }

  // P9-1修复：添加settingsPf参数，确保使用用户选择的配方
  fixGzSpeed(
    settingsTime: Record<string, number> = {},
    settingsPf: Record<string, string | number> = {}
  ): void {
    // P1-2修复：添加fixGzSpeed方法，与worker版本保持一致
    // 光栅石由采矿机生产时，需要根据采矿机速度修正计算结果
    let gzItem: { name: string; value: number } | null = null
    for (let i = 0; i < this.state.xhList.length; i++) {
      if (this.state.xhList[i].name === '光栅石') {
        gzItem = this.state.xhList[i]
        break
      }
    }
    if (!gzItem) return

    // P9-1修复：传入settingsPf参数，确保使用用户选择的配方
    const gzRecipe = this.find('光栅石', { settingsPf })
    if (!gzRecipe) return

    // 使用mName而非m检查机器类型，m是数组类型
    if (gzRecipe.mName !== '采矿机') return

    const gzValue = gzItem.value
    if (gzValue <= 0) return

    const speed = settingsTime['采矿机'] || 1
    gzItem.value = gzValue / speed
  }

  mergeMul(): void {
    // P0-1修复：添加mergeMul方法，处理同一配方的多个产出合并逻辑
    // 老代码逻辑：当同一配方有多个产出时，保留最大的value2，其他产出转为out_list
    // 这对于多产出配方（如精炼油、氢）的正确计算至关重要
    const ids: number[] = []
    const groups: Array<Array<{ name: string; value: number; value2?: number }>> = []

    for (const xh of this.state.xhList) {
      if (!xh.value) continue
      const item = this.find(xh.name)
      if (!item) continue

      const itemId = item.id
      if (itemId === undefined) continue
      if (ids.includes(itemId)) continue

      const xhs: Array<{ name: string; value: number; value2?: number }> = []
      for (const xh2 of this.state.xhList) {
        if (!xh2.value) continue
        const item2 = this.find(xh2.name)
        if (item2 && item2.id === itemId) {
          xhs.push(xh2)
        }
      }

      if (xhs.length > 1) {
        groups.push(xhs)
        ids.push(itemId)
      }
    }

    for (const group of groups) {
      this.doMergeMul(group)
    }
  }

  private doMergeMul(xhs: Array<{ name: string; value: number; value2?: number }>): void {
    // P0-1修复：执行多产出合并
    // 保留value2最大的项，其他项转为out_list
    let maxValue2Index = -1
    let max = 0

    for (let i = 0; i < xhs.length; i++) {
      const v2 = xhs[i].value2 || 0
      if (v2 > max) {
        max = v2
        maxValue2Index = i
      }
    }

    for (let i = 0; i < xhs.length; i++) {
      if (i !== maxValue2Index && (xhs[i].value2 || 0) > 0) {
        const number = xhs[i].value
        xhs[i].value2 = 0
        const item = this.find(xhs[i].name)
        if (!item || !item.s) continue

        for (const s of item.s) {
          this.addOut(s.name, (number * (s.n || 1)) / (item.n || 1))
        }
      }
    }
  }

  static getAccSpeed(type: string, value: string): number {
    if (value === '加速') {
      if (type === '增产剂Mk.Ⅰ') return 1.25
      if (type === '增产剂Mk.Ⅱ') return 1.5
      if (type === '增产剂Mk.Ⅲ') return 2
    } else if (value === '增产') {
      if (type === '增产剂Mk.Ⅰ') return 1.125
      if (type === '增产剂Mk.Ⅱ') return 1.2
      if (type === '增产剂Mk.Ⅲ') return 1.25
    }
    return 1
  }

  // P7-1修复：添加getPfs方法，获取指定产品的所有可选配方
  // 与老代码data.js getPfs函数对齐
  getPfs(productName: string): IRawRecipe[] {
    const indices = this.recipeIndexByProduct[productName]
    if (!indices || indices.length === 0) {
      return []
    }
    const result: IRawRecipe[] = []
    for (const idx of indices) {
      const recipe = this.recipes[idx]
      if (recipe) {
        result.push(structuredClone(recipe))
      }
    }
    return result
  }
}
