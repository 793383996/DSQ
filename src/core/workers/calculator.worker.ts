import type {
  IWorkerCalculateRequest,
  IWorkerCalculateResponse,
  IWorkerInitRequest,
  IWorkerInitResponse
} from './types'

interface ILegacyRecipeItem {
  name: string
  n?: number
}

interface ILegacyRecipe {
  id: number
  s: ILegacyRecipeItem[]
  q: ILegacyRecipeItem[]
  t: number
  m?: string | Array<{ name: string; speed: number }>
  noExtra?: boolean | null
  group?: string
}

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
  for (let i = 0; i < xh_list.length; i++) {
    const xh = xh_list[i]
    if (!xh.value) continue
    const itemName = xh.name
    const item = find(itemName, false)
    if (!item) continue

    let isOverflow = false
    for (let j = 0; j < item.s.length; j++) {
      const s = item.s[j]
      const out = findOut(s.name)
      if (out === null) continue
      if (out < 0) {
        isOverflow = true
        break
      }
    }

    if (isOverflow) {
      let produce = 0
      for (let j = 0; j < item.s.length; j++) {
        const s = item.s[j]
        if (s.name === itemName) {
          produce = (xh.value * (s.n || 1)) / (item.n || 1)
          break
        }
      }

      if (produce > 0) {
        const ratio = xh.value / produce
        if (ratio > 0 && ratio < 1) {
          xh.value = produce
          xh.value2 = xh.value2 ? xh.value2 * ratio : xh.value * (1 - ratio)
        }
      }
    }
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

  const machine = gzRecipe.m
  if (typeof machine !== 'string' || machine !== '采矿机') return

  const gzValue = gzItem.value
  if (gzValue <= 0) return

  const speed = settingsTime['采矿机'] || 1
  gzItem.value = gzValue / speed
}

interface IInternalRecipe {
  id: number
  s: Array<{ name: string; n: number }>
  q: Array<{ name: string; n: number }>
  t: number
  n: number
  m?: string | Array<{ name: string; speed: number }>
  noExtra?: boolean | null
}

function find(name: string, normalize_recipe: boolean): IInternalRecipe | null {
  function get(item: ILegacyRecipe): IInternalRecipe | null {
    const o: IInternalRecipe = {
      id: item.id,
      s: item.s.map(s => ({ name: s.name, n: s.n ?? 1 })),
      q: item.q.map(q => ({ name: q.name, n: q.n ?? 1 })),
      t: item.t || 1,
      n: 1,
      m: item.m,
      noExtra: item.noExtra ?? undefined
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
    const item = recipes[pf]
    if (item) return get(item)
  }

  if (recipeIndexByProduct && recipeIndexByProduct[name]) {
    const indices = recipeIndexByProduct[name]

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i]
      const item = recipes[idx]
      if (!item) continue

      const accValue = (settings[item.id] || {}).accValue || defaultAccValue
      if (accValue === '增产' && item.noExtra) continue

      const result = get(item)
      if (result) return result
    }
    return get(recipes[indices[0]])
  }

  for (let i = 0; i < recipes.length; i++) {
    const item = recipes[i]
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

    const accType = (settings[item.id] || {}).accType || defaultAccType
    let accValue = (settings[item.id] || {}).accValue || defaultAccValue
    let accTotal = 0

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
        if (accValue === '增产' && item.noExtra) accValue = '无'
        if (item.q.length === 0 || item.noExtra === null) accValue = '无'

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
          if (abs_out > r) {
            addOut(q.name, r)
            loadNumberDepth--
            return
          } else {
            addOut(q.name, abs_out)
            r = r - abs_out
          }
        }
        loadNumber(q.name, r)
      }
    }

    if (accTotal > 0) {
      addAccTotal(itemName, accTotal)
    }
    loadNumberDepth--
  } finally {
    if (loadNumberDepth > 0) {
      loadNumberDepth--
    }
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

  try {
    fixGzSpeed()

    for (let i = 0; i < data.demands.length; i++) {
      const d = data.demands[i]
      loadNumber(d.name, d.num)
    }

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
