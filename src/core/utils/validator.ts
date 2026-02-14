import type { IRawRecipe } from '../types/settings'

export function validateRecipe(recipe: IRawRecipe): string[] {
  const errors: string[] = []

  if (!recipe.s || !Array.isArray(recipe.s) || recipe.s.length === 0) {
    errors.push('配方缺少产物列表')
  }

  if (!recipe.m || typeof recipe.m !== 'string') {
    errors.push('配方缺少设备类型')
  }

  if (recipe.s) {
    recipe.s.forEach((item, idx) => {
      if (!item.name) {
        errors.push(`产物[${idx}]缺少名称`)
      }
    })
  }

  if (recipe.q) {
    recipe.q.forEach((item, idx) => {
      if (!item.name) {
        errors.push(`原料[${idx}]缺少名称`)
      }
    })
  }

  if (recipe.t !== undefined && recipe.t <= 0) {
    errors.push('生产时间必须大于0')
  }

  return errors
}

export function validateRecipes(recipes: IRawRecipe[]): {
  valid: IRawRecipe[]
  invalid: Array<{ recipe: IRawRecipe; errors: string[] }>
} {
  const valid: IRawRecipe[] = []
  const invalid: Array<{ recipe: IRawRecipe; errors: string[] }> = []

  recipes.forEach((recipe, idx) => {
    const errors = validateRecipe(recipe)
    if (errors.length === 0) {
      valid.push(recipe)
    } else {
      invalid.push({
        recipe,
        errors: errors.map(e => `[${idx}] ${e}`)
      })
    }
  })

  return { valid, invalid }
}

export function validateDemand(demand: { name: string; num: number }): string[] {
  const errors: string[] = []

  if (!demand.name || demand.name.trim() === '') {
    errors.push('需求项缺少名称')
  }

  if (demand.num === undefined || demand.num === null) {
    errors.push('需求项缺少数量')
  } else if (demand.num <= 0) {
    errors.push('需求项数量必须大于0')
  }

  return errors
}

export function validateMachineSetting(setting: { name: string; speed: number }): string[] {
  const errors: string[] = []

  if (!setting.name || setting.name.trim() === '') {
    errors.push('机器设置缺少名称')
  }

  if (setting.speed === undefined || setting.speed === null) {
    errors.push('机器设置缺少速度')
  } else if (setting.speed < 0) {
    errors.push('机器速度不能为负数')
  }

  return errors
}

export function validateItemName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  return name.trim().length > 0 && name.length <= 50
}

export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string = '值'
): string | null {
  if (isNaN(value)) {
    return `${fieldName}不是有效数字`
  }
  if (value < min) {
    return `${fieldName}不能小于 ${min}`
  }
  if (value > max) {
    return `${fieldName}不能大于 ${max}`
  }
  return null
}
