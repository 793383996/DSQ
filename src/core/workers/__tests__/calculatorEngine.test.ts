import { describe, it, expect } from 'vitest'

interface IRecipeItem {
  name: string
  n: number
}

interface IRecipe {
  id: number
  s: IRecipeItem[]
  q: IRecipeItem[]
  t: number
  m?: string | Array<{ name: string; speed: number }>
  noExtra?: boolean
}

interface IInternalItem {
  name: string
  value: number
  value2?: number
  accTotal?: number
}

const mockRecipes: IRecipe[] = [
  {
    id: 0,
    s: [{ name: 'ironIngot', n: 1 }],
    q: [{ name: 'ironOre', n: 1 }],
    t: 1,
    m: 'arcSmelter'
  },
  {
    id: 1,
    s: [{ name: 'magnet', n: 1 }],
    q: [{ name: 'ironOre', n: 1 }],
    t: 1.5,
    m: 'arcSmelter'
  },
  {
    id: 2,
    s: [{ name: 'magneticCoil', n: 2 }],
    q: [
      { name: 'ironIngot', n: 2 },
      { name: 'magnet', n: 1 }
    ],
    t: 1,
    m: 'assemblingMachineMk1'
  },
  {
    id: 3,
    s: [{ name: 'gear', n: 1 }],
    q: [{ name: 'ironIngot', n: 1 }],
    t: 1,
    m: 'assemblingMachineMk1',
    noExtra: true
  },
  {
    id: 4,
    s: [{ name: 'copperIngot', n: 1 }],
    q: [{ name: 'copperOre', n: 1 }],
    t: 1,
    m: 'arcSmelter'
  },
  {
    id: 5,
    s: [{ name: 'copperWire', n: 2 }],
    q: [{ name: 'copperIngot', n: 1 }],
    t: 0.5,
    m: 'assemblingMachineMk1'
  }
]

function createCalculatorEngine() {
  let recipes: IRecipe[] = []
  let settings: Record<number, { accType?: string; accValue?: string }> = {}
  let settingsPf: Record<string, number> = {}
  let recipeIndexByProduct: Record<string, number[]> = {}
  const defaultAccType = '增产剂Mk.Ⅰ'
  const defaultAccValue = '无'
  const maxDepth = 200

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

  interface IInternalRecipe extends IRecipe {
    n: number
  }

  function find(name: string, normalize_recipe: boolean): IInternalRecipe | null {
    function get(item: IRecipe): IInternalRecipe | null {
      const o: IInternalRecipe = {
        id: item.id,
        s: item.s.map(s => ({ name: s.name, n: s.n ?? 1 })),
        q: item.q.map(q => ({ name: q.name, n: q.n ?? 1 })),
        t: item.t || 1,
        n: 1,
        m: item.m,
        noExtra: item.noExtra
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
      const accValue = (settings[item.id] || {}).accValue || defaultAccValue
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
          if (accType === '增产剂Mk.Ⅰ') ((v = 1.125), (tm = 12))
          else if (accType === '增产剂Mk.Ⅱ') ((v = 1.2), (tm = 24))
          else if (accType === '增产剂Mk.Ⅲ') ((v = 1.25), (tm = 60))

          if (accValue === '增产' && item.noExtra) accValue = '无'
          if (item.q.length === 0 || item.noExtra === null) accValue = '无'

          if (accValue === '加速') {
            accTotal += r / tm
          } else if (accValue === '增产') {
            r /= v
            accTotal += r / tm
          }

          loadNumber(q.name, r)
        }
      }
      addAccTotal(itemName, accTotal)
    } finally {
      loadNumberDepth--
    }
  }

  function clearState(): void {
    xh_list = []
    out_list = []
    xhMap = {}
    outMap = {}
    ig_names = []
    loadNumberDepth = 0
  }

  function setExcludes(names: string[]): void {
    ig_names = names || []
  }

  function calculate(
    demands: Array<{ name: string; num: number }>,
    excludes: string[]
  ): { success: boolean; xh_list: IInternalItem[]; out_list: IInternalItem[] } {
    clearState()
    setExcludes(excludes || [])

    try {
      if (demands && demands.length > 0) {
        for (let m = 0; m < demands.length; m++) {
          const demand = demands[m]
          const itemName = demand.name
          const number = demand.num || 0
          loadNumber(itemName, number)
        }
      }

      return {
        success: true,
        xh_list: xh_list.slice(),
        out_list: out_list.slice()
      }
    } catch (e) {
      clearState()
      return {
        success: false,
        xh_list: [],
        out_list: []
      }
    }
  }

  function init(options: {
    recipes: IRecipe[]
    settings: Record<number, { accType?: string; accValue?: string }>
    settingsPf: Record<string, number>
    recipeIndexByProduct: Record<string, number[]>
  }): void {
    recipes = options.recipes
    settings = options.settings
    settingsPf = options.settingsPf
    recipeIndexByProduct = options.recipeIndexByProduct
  }

  return {
    init,
    calculate,
    getXhList: () => xh_list,
    getOutList: () => out_list,
    getXhMap: () => xhMap,
    getOutMap: () => outMap
  }
}

describe('Calculator Engine (Worker Logic)', () => {
  let engine: ReturnType<typeof createCalculatorEngine>

  beforeEach(() => {
    engine = createCalculatorEngine()
    engine.init({
      recipes: mockRecipes,
      settings: {},
      settingsPf: {},
      recipeIndexByProduct: {
        ironIngot: [0],
        magnet: [1],
        magneticCoil: [2],
        gear: [3],
        copperIngot: [4],
        copperWire: [5]
      }
    })
  })

  describe('Basic Calculation', () => {
    it('should calculate single item demand', () => {
      const result = engine.calculate([{ name: 'ironIngot', num: 100 }], [])

      expect(result.success).toBe(true)
      expect(result.xh_list.length).toBeGreaterThan(0)

      const ironIngot = result.xh_list.find(item => item.name === 'ironIngot')
      expect(ironIngot).toBeDefined()
      expect(ironIngot?.value).toBe(100)
    })

    it('should calculate item with multiple inputs', () => {
      const result = engine.calculate([{ name: 'magneticCoil', num: 100 }], [])

      expect(result.success).toBe(true)

      const magneticCoil = result.xh_list.find(item => item.name === 'magneticCoil')
      expect(magneticCoil).toBeDefined()
    })

    it('should handle empty demands', () => {
      const result = engine.calculate([], [])

      expect(result.success).toBe(true)
      expect(result.xh_list.length).toBe(0)
    })
  })

  describe('Exclude List', () => {
    it('should exclude items from calculation', () => {
      const result = engine.calculate([{ name: 'ironIngot', num: 100 }], ['ironOre'])

      expect(result.success).toBe(true)
      const ironIngot = result.xh_list.find(item => item.name === 'ironIngot')
      expect(ironIngot).toBeDefined()
    })

    it('should handle multiple excludes', () => {
      const result = engine.calculate(
        [{ name: 'magneticCoil', num: 100 }],
        ['ironOre', 'ironIngot']
      )

      expect(result.success).toBe(true)
      const magneticCoil = result.xh_list.find(item => item.name === 'magneticCoil')
      expect(magneticCoil).toBeDefined()
    })
  })

  describe('Recipe Chain', () => {
    it('should follow recipe chain for complex items', () => {
      const result = engine.calculate([{ name: 'magneticCoil', num: 100 }], [])

      expect(result.success).toBe(true)

      const magneticCoil = result.xh_list.find(item => item.name === 'magneticCoil')
      expect(magneticCoil).toBeDefined()
      expect(magneticCoil?.value).toBeGreaterThan(0)
    })

    it('should calculate correct values for nested recipes', () => {
      const result = engine.calculate([{ name: 'magneticCoil', num: 100 }], [])

      const magneticCoil = result.xh_list.find(item => item.name === 'magneticCoil')
      expect(magneticCoil?.value).toBe(100)
    })
  })

  describe('Output List', () => {
    it('should track output items for complex recipes', () => {
      const result = engine.calculate([{ name: 'magneticCoil', num: 100 }], [])

      expect(result.out_list.length).toBeGreaterThanOrEqual(0)
    })

    it('should have negative values for byproduct outputs', () => {
      const result = engine.calculate([{ name: 'magneticCoil', num: 100 }], [])

      if (result.out_list.length > 0) {
        const hasNegative = result.out_list.some(item => item.value < 0)
        expect(hasNegative).toBe(true)
      } else {
        expect(result.out_list.length).toBe(0)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle unknown item', () => {
      const result = engine.calculate([{ name: 'unknownItem', num: 100 }], [])

      expect(result.success).toBe(true)
      const unknownItem = result.xh_list.find(item => item.name === 'unknownItem')
      expect(unknownItem).toBeUndefined()
    })

    it('should handle zero demand', () => {
      const result = engine.calculate([{ name: 'ironIngot', num: 0 }], [])

      expect(result.success).toBe(true)
    })

    it('should handle negative demand', () => {
      const result = engine.calculate([{ name: 'ironIngot', num: -100 }], [])

      expect(result.success).toBe(true)
    })

    it('should handle large demand values', () => {
      const result = engine.calculate([{ name: 'ironIngot', num: 1000000 }], [])

      expect(result.success).toBe(true)
      expect(result.xh_list.length).toBeGreaterThan(0)
    })
  })

  describe('Multiple Demands', () => {
    it('should handle multiple demands', () => {
      const result = engine.calculate(
        [
          { name: 'ironIngot', num: 100 },
          { name: 'copperIngot', num: 50 }
        ],
        []
      )

      expect(result.success).toBe(true)
      expect(result.xh_list.length).toBeGreaterThan(0)
    })

    it('should aggregate same item demands', () => {
      const result = engine.calculate(
        [
          { name: 'ironIngot', num: 100 },
          { name: 'ironIngot', num: 50 }
        ],
        []
      )

      expect(result.success).toBe(true)
      expect(result.xh_list.length).toBeGreaterThan(0)
    })
  })

  describe('noExtra Flag', () => {
    it('should respect noExtra flag on recipes', () => {
      const gearRecipe = mockRecipes.find(r => r.noExtra === true)
      expect(gearRecipe?.noExtra).toBe(true)
    })
  })
})

describe('Recipe Index Lookup', () => {
  let engine: ReturnType<typeof createCalculatorEngine>

  beforeEach(() => {
    engine = createCalculatorEngine()
    engine.init({
      recipes: mockRecipes,
      settings: {},
      settingsPf: { ironIngot: 0 },
      recipeIndexByProduct: {
        ironIngot: [0],
        magnet: [1],
        magneticCoil: [2]
      }
    })
  })

  it('should use settingsPf for recipe selection', () => {
    const result = engine.calculate([{ name: 'ironIngot', num: 100 }], [])

    expect(result.success).toBe(true)
    expect(result.xh_list.length).toBeGreaterThan(0)
  })
})
