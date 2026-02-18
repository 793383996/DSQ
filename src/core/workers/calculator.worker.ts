import type {
  IWorkerCalculateRequest,
  IWorkerCalculateResponse,
  IWorkerInitRequest,
  IWorkerInitResponse
} from './types'
import type { IRawRecipe } from '../types/settings'

type ILegacyRecipe = IRawRecipe

let recipes: ILegacyRecipe[] = []
let settings: Record<number, { accType?: string; accValue?: string; m?: string }> = {}
let settingsPf: Record<string, number> = {}
let settingsTime: Record<string, number> = {}
let recipeIndexByProduct: Record<string, number[]> = {}
let defaultAccType = '增产剂Mk.Ⅰ'
let defaultAccValue = '无'
let selfAcc = false
let isAddSelfAccP = false
const maxDepth = 200

interface IInternalItem {
  name: string
  value: number
  value2?: number
  accTotal?: number
}

let xh_list: IInternalItem[] = []
let out_list: IInternalItem[] = []
let xhMap: Record<string, IInternalItem> = {}
let outMap: Record<string, IInternalItem> = {}
let ig_names: string[] = []
let loadNumberDepth = 0

// P6-4修复：添加轨道采集器t值缓存
let orbitalCollectorTCache: Map<string, number> = new Map()
// P10-1修复：添加临界光子缓存
let criticalPhotonTCache: number | null = null
let criticalPhotonLensNCache: number | null = null

function addXH(name: string, value: number): void {
  const item = xhMap[name]
  if (item) {
    item.value += value
    return
  }
  const newItem = { name, value }
  xh_list.push(newItem)
  xhMap[name] = newItem
}

function addAccTotal(name: string, value: number): void {
  const item = xhMap[name]
  if (item) {
    item.accTotal = (item.accTotal || 0) + value
  }
}

function addOut(name: string, value: number): void {
  const item = outMap[name]
  if (item) {
    item.value += value
    return
  }
  const newItem = { name, value }
  out_list.push(newItem)
  outMap[name] = newItem
}

function findOut(name: string): number | null {
  const item = outMap[name]
  return item ? item.value : null
}

function checkResult(): void {
  // P0-2修复：重写checkResult逻辑，与老代码data.js checkResult函数对齐
  // 老代码逻辑：当设备产出超过需求时，减少设备数量(value2)并增加产出(out_list)

  // P6-5修复：isOverflow函数与老代码完全对齐
  // 老代码：如果任何产物的out为null，返回false（不溢出）
  // 老代码：如果任何产物满足out > -mn，返回false（不溢出）
  // 只有所有产物都有out且都满足out <= -mn时，才返回true（溢出）
  const isOverflow = (
    item: IInternalRecipe,
    info: { speed: number; t: number },
    nn: number
  ): boolean => {
    for (let j = 0; j < item.s.length; j++) {
      const out = findOut(item.s[j].name)
      if (out === null) return false
      const mn = ((nn * 60) / info.t) * info.speed * (item.s[j].n || 1)
      if (out > -1 * mn) return false
    }
    return true
  }

  for (let i = 0; i < xh_list.length; i++) {
    const xh = xh_list[i]
    if (!xh.value) continue

    const item = find(xh.name, false)
    if (!item || !item.s) continue

    const machineInfo = getMachineInfo(item)
    let nn = 1
    if (xh.value2 !== undefined && xh.value2 < 1) {
      nn = xh.value2
    }

    while (isOverflow(item, machineInfo, nn) && (xh.value2 || 0) > 0) {
      if ((xh.value2 || 0) < 1) {
        nn = xh.value2!
      }
      xh.value2 = (xh.value2 || 0) - nn

      for (let j = 0; j < item.s.length; j++) {
        const mn = ((nn * 60) / machineInfo.t) * machineInfo.speed * (item.s[j].n || 1)
        addOut(item.s[j].name, mn)
      }

      if ((xh.value2 || 0) < 1) {
        nn = xh.value2 || 0
      }
    }
  }
}

// P0-1修复：添加getMachineInfo函数，获取机器信息
// P6-4修复：添加轨道采集器t值缓存支持，与主线程UpdateAllService对齐
function getMachineInfo(item: IInternalRecipe): { speed: number; t: number } {
  const mArray = Array.isArray(item.m) ? item.m : []
  const machineName = mArray[0]?.name || item.mName || ''
  const machine =
    mArray.find((m: { name: string; speed: number }) => m.name === machineName) || mArray[0]

  const baseSpeed = machine?.speed || 1
  const customSpeed = settingsTime[machineName]
  const speed = customSpeed !== undefined ? customSpeed : baseSpeed

  let recipeT = item.t || 1
  // P6-4修复：轨道采集器使用缓存的t值
  // 老代码doSpeed1直接修改data数组的t值，新代码使用缓存机制
  if (machineName === '轨道采集器(气态)' || machineName === '轨道采集器(巨冰)') {
    const cacheKey = `${item.id}-${item.s?.[0]?.name || ''}`
    const cachedT = orbitalCollectorTCache.get(cacheKey)
    if (cachedT !== undefined) {
      recipeT = cachedT
    }
  }

  return { speed, t: recipeT }
}

// P0-2修复：添加calculateValue2函数，在checkResult之前计算value2
function calculateValue2(): void {
  for (let i = 0; i < xh_list.length; i++) {
    const xh = xh_list[i]
    if (!xh.value || xh.value <= 0) continue

    const item = find(xh.name, false)
    if (!item || !item.s) continue

    const machineInfo = getMachineInfo(item)

    // 获取增产剂设置
    const itemId = item.id
    const itemSettings = itemId !== undefined ? settings[itemId] : undefined
    const accType = itemSettings?.accType || defaultAccType
    let accValue = itemSettings?.accValue || defaultAccValue

    // 架构师注：accValue 修正逻辑与老代码对齐
    if (accValue === '增产' && item.noExtra) {
      accValue = '无'
    }
    if (!item.q || item.q.length === 0 || item.noExtra === null) {
      accValue = '无'
    }

    // 计算fixValue2Times
    let fixValue2Times = 1
    if (item.q) {
      for (let j = 0; j < item.q.length; j++) {
        if (item.q[j].name === xh.name) {
          const recipeN = item.n || 1
          const inputN = item.q[j].n || 0
          if (recipeN > inputN) {
            fixValue2Times = recipeN / (recipeN - inputN)
          }
        }
      }
    }

    // P7-4修复：value2计算逻辑与老代码data.js完全对齐
    // 老代码：先计算基础value2，再根据条件应用getAccSpeed和fixValue2Times
    xh.value2 = xh.value / (1 / machineInfo.t) / 60 / (item.n || 1)

    // 架构师注：老代码用item.name检查产物名称，但新代码IInternalRecipe没有name属性
    // 老代码的item.name实际上是主产物名称，这里用xh.name代替
    // 临界光子（射线接收塔）不应用getAccSpeed和fixValue2Times，保持基础value2
    if (xh.name !== '临界光子' || item.mName !== '射线接收塔') {
      xh.value2 = (xh.value2 / getAccSpeed(accType, accValue)) * fixValue2Times
    }
  }
}

// P0-1修复：添加getAccSpeed函数
function getAccSpeed(type: string, value: string): number {
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

// P0-2修复：添加mergeMul函数，处理同一配方的多个产出合并
function getXhs(itemId: number): IInternalItem[] {
  const result: IInternalItem[] = []
  for (let i = 0; i < xh_list.length; i++) {
    const xh = xh_list[i]
    if (!xh.value) continue
    const item = find(xh.name, false)
    if (item && item.id === itemId) {
      result.push(xh)
    }
  }
  return result
}

function doMergeMul(xhs: IInternalItem[]): void {
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
      const item = find(xhs[i].name, false)
      if (!item) continue
      for (let j = 0; j < item.s.length; j++) {
        addOut(item.s[j].name, (number * (item.s[j].n || 1)) / (item.n || 1))
      }
    }
  }
}

// P0-2修复：mergeMul已被老代码注释掉，保留实现但标记为未使用
// 老代码注释：//mergeMul();//处理合并 多个产出使用了同一个配方 ,暂时弃用，checkResult会处理这种情况
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _mergeMul(): void {
  const ids: number[] = []
  const groups: IInternalItem[][] = []

  for (let i = 0; i < xh_list.length; i++) {
    const xh = xh_list[i]
    if (!xh.value) continue
    const item = find(xh.name, false)
    if (!item) continue

    const itemId = item.id
    if (itemId === undefined) continue
    if (ids.indexOf(itemId) !== -1) continue

    const xhs = getXhs(itemId)
    if (xhs.length > 1) {
      groups.push(xhs)
      ids.push(itemId)
    }
  }

  for (let i = 0; i < groups.length; i++) {
    doMergeMul(groups[i])
  }
}

function fixGzSpeed(): void {
  let gzItem: IInternalItem | null = null
  for (let i = 0; i < xh_list.length; i++) {
    if (xh_list[i].name === '光栅石') {
      gzItem = xh_list[i]
      break
    }
  }
  if (!gzItem) return

  const gzRecipe = find('光栅石', false)
  if (!gzRecipe) return

  // P0-1修复：使用mName而非m检查机器类型，与主线程版本保持一致
  // m是数组类型，mName是字符串类型，用于标识机器类别
  if (gzRecipe.mName !== '采矿机') return

  const gzValue = gzItem.value
  if (gzValue <= 0) return

  const speed = settingsTime['采矿机'] || 1
  gzItem.value = gzValue / speed
}

interface IInternalRecipe {
  id?: number
  s: Array<{ name: string; n: number }>
  q: Array<{ name: string; n: number }>
  t: number
  n: number
  m?: string | Array<{ name: string; speed: number }>
  mName?: string
  noExtra?: boolean | null
}

function find(name: string, normalize_recipe: boolean): IInternalRecipe | null {
  function get(item: ILegacyRecipe): IInternalRecipe | null {
    const o: IInternalRecipe = {
      id: item.id,
      s: item.s?.map(s => ({ name: s.name, n: s.n ?? 1 })) || [],
      q: item.q?.map(q => ({ name: q.name, n: q.n ?? 1 })) || [],
      t: item.t || 1,
      n: 1,
      m: item.m,
      mName: item.mName,
      noExtra: item.noExtra ?? undefined
    }

    // P10-1修复：应用临界光子缓存值
    // 老代码直接修改data数组，新代码使用缓存机制
    if (item.name === '临界光子' && item.mName === '射线接收塔') {
      if (criticalPhotonTCache !== null) {
        o.t = criticalPhotonTCache
      }
      if (criticalPhotonLensNCache !== null && o.q) {
        const lensInput = o.q.find(q => q.name === '引力透镜')
        if (lensInput) {
          lensInput.n = criticalPhotonLensNCache
        }
      }
    }

    if (normalize_recipe) {
      for (let i = 0; i < o.s.length; i++) {
        o.s[i].n = o.s[i].n || 1
      }
      for (let i = 0; i < o.q.length; i++) {
        o.q[i].n = o.q[i].n || 1
      }

      for (let i = 0; i < o.s.length; i++) {
        const s_name = o.s[i].name
        for (let j = 0; j < o.q.length; j++) {
          if (s_name === o.q[j].name) {
            const to_cancel = Math.min(o.s[i].n, o.q[j].n)
            o.s[i].n -= to_cancel
            o.q[j].n -= to_cancel
          }
        }
      }

      const o_s = o.s
      o.s = []
      for (let i = 0; i < o_s.length; i++) {
        if (o_s[i].n === 0) continue
        o.s.push(o_s[i])
      }
      const o_q = o.q
      o.q = []
      for (let i = 0; i < o_q.length; i++) {
        if (o_q[i].n === 0) continue
        o.q.push(o_q[i])
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
    // P1-3修复：处理string/number类型，与RecipeCalculator保持一致
    const pfValue = typeof pf === 'number' ? pf : parseInt(String(pf), 10)
    const item = recipes[pfValue]
    if (item) return get(item)
  }

  if (recipeIndexByProduct && recipeIndexByProduct[name]) {
    const indices = recipeIndexByProduct[name]

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i]
      const item = recipes[idx]
      if (!item) continue

      // P1-1修复：item.id可能为undefined，需要类型安全检查
      const accValue =
        (item.id !== undefined ? settings[item.id] : undefined)?.accValue || defaultAccValue
      if (accValue === '增产' && item.noExtra) continue

      const result = get(item)
      if (result) return result
    }
    return get(recipes[indices[0]])
  }

  for (let i = 0; i < recipes.length; i++) {
    const item = recipes[i]
    // P1-1修复：item.s可能为undefined，需要类型安全检查
    if (!item.s) continue
    for (let j = 0; j < item.s.length; j++) {
      if (item.s[j].name === name) {
        return get(item)
      }
    }
  }
  return null
}

function loadNumber(itemName: string, n: number): void {
  loadNumberDepth++
  if (loadNumberDepth > maxDepth) {
    loadNumberDepth--
    return
  }
  try {
    if (ig_names.indexOf(itemName) !== -1) {
      loadNumberDepth--
      return
    }
    if (
      (itemName === '增产剂Mk.Ⅰ' || itemName === '增产剂Mk.Ⅱ' || itemName === '增产剂Mk.Ⅲ') &&
      n < 0.1
    ) {
      loadNumberDepth--
      return
    }
    const item = find(itemName, true)
    if (!item) {
      loadNumberDepth--
      return
    }

    addXH(itemName, n)
    for (let i = 0; i < item.s.length; i++) {
      if (item.s[i].name !== itemName) {
        if (item.s[i].n === 0) continue
        addOut(item.s[i].name, (-1 * n * (item.s[i].n || 1)) / (item.n || 1))
      }
    }

    // P1-1修复：settings key类型兼容处理，支持数字和字符串key
    // 遗留代码使用数字key，新代码可能使用字符串key
    const itemId = item.id
    const getItemSetting = (): { accType?: string; accValue?: string } | undefined => {
      if (itemId !== undefined) {
        // 先尝试数字key，再尝试字符串key
        return settings[itemId] || settings[String(itemId) as unknown as keyof typeof settings]
      }
      return undefined
    }

    const itemSettings = getItemSetting()
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

    for (let i = 0; item.q && i < item.q.length; i++) {
      const q = item.q[i]
      if (ig_names.indexOf(q.name) !== -1) {
        continue
      }
      if (q.n === 0) continue
      if (q.name !== itemName) {
        let r = (n * (q.n || 1)) / (item.n || 1)
        let v = 1,
          tm = 0
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
            loadNumber(accType, r / tm)
          }
        } else if (accValue === '增产') {
          r = r / v
          accTotal += r / tm
          if (!isAddSelfAccP) {
            loadNumber(accType, r / tm)
          }
        }

        const outValue = findOut(q.name)
        if (outValue !== null && outValue < 0) {
          const abs_out = Math.abs(outValue)
          if (abs_out >= r) {
            addOut(q.name, r)
            continue
          } else {
            addOut(q.name, abs_out)
            r = r - abs_out
          }
        }
        if (r > 0) {
          loadNumber(q.name, r)
        }
      }
    }

    if (accTotal > 0) {
      addAccTotal(itemName, accTotal)
    }
  } finally {
    loadNumberDepth--
  }
}

function init(data: IWorkerInitRequest): IWorkerInitResponse {
  recipes = data.recipes as unknown as ILegacyRecipe[]
  settings = data.settings
  settingsPf = data.settingsPf
  settingsTime = data.settingsTime
  recipeIndexByProduct = data.recipeIndexByProduct

  return {
    type: 'ready',
    recipeCount: recipes.length
  }
}

function calculate(data: IWorkerCalculateRequest): IWorkerCalculateResponse {
  xh_list = []
  out_list = []
  xhMap = {}
  outMap = {}
  ig_names = data.excludes || []
  loadNumberDepth = 0

  recipes = data.recipes as unknown as ILegacyRecipe[]
  settings = data.settings
  settingsPf = data.settingsPf
  settingsTime = data.settingsTime
  recipeIndexByProduct = data.recipeIndexByProduct
  defaultAccType = data.defaultAccType
  defaultAccValue = data.defaultAccValue
  selfAcc = data.selfAcc ?? false
  isAddSelfAccP = data.isAddSelfAccP ?? false

  // P6-4修复：初始化轨道采集器t值缓存
  orbitalCollectorTCache = new Map()
  if (data.orbitalCollectorTCache) {
    for (const [key, value] of Object.entries(data.orbitalCollectorTCache)) {
      orbitalCollectorTCache.set(key, value)
    }
  }

  // P10-1修复：初始化临界光子缓存
  criticalPhotonTCache = data.criticalPhotonTCache ?? null
  criticalPhotonLensNCache = data.criticalPhotonLensNCache ?? null

  try {
    // P0-3修复：doSpeed1逻辑已在主线程UpdateAllService中处理
    // Worker版本通过settingsTime参数获取已计算的速度设置

    for (let i = 0; i < data.demands.length; i++) {
      const d = data.demands[i]
      loadNumber(d.name, d.num)
    }

    // P0-2修复：fixGzSpeed在calculateValue2之前调用，与老代码对齐
    fixGzSpeed()

    // P0-1修复：mergeMul已被老代码注释掉，checkResult会处理这种情况
    // 老代码注释：//mergeMul();//处理合并 多个产出使用了同一个配方 ,暂时弃用，checkResult会处理这种情况
    // mergeMul()

    // P0-2修复：calculateValue2必须在checkResult之前调用
    // 老代码顺序：计算value2 -> checkResult
    calculateValue2()

    checkResult()

    return {
      type: 'result',
      id: data.id,
      result: {
        success: true,
        xh_list: xh_list,
        out_list: out_list,
        xhMap: xhMap,
        outMap: outMap
      }
    }
  } catch (e) {
    const error = e as Error
    return {
      type: 'error',
      id: data.id,
      error: error.message
    }
  }
}

self.onmessage = function (e: MessageEvent) {
  const data = e.data

  if (data.type === 'init') {
    const response = init(data as IWorkerInitRequest)
    self.postMessage(response)
  } else if (data.type === 'calculate') {
    const response = calculate(data as IWorkerCalculateRequest)
    self.postMessage(response)
  }
}

export { init, calculate, loadNumber, find, addXH, addOut, findOut }
