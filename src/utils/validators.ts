export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export type ValidatorFn = (value: unknown) => ValidationResult

export function required(message = '此字段必填'): ValidatorFn {
  return (value: unknown): ValidationResult => {
    const valid = value !== null && value !== undefined && value !== ''
    return {
      valid,
      errors: valid ? [] : [message]
    }
  }
}

export function minLength(min: number, message?: string): ValidatorFn {
  return (value: unknown): ValidationResult => {
    if (typeof value !== 'string' && !Array.isArray(value)) {
      return { valid: true, errors: [] }
    }

    const length = typeof value === 'string' ? value.length : value.length
    const valid = length >= min
    return {
      valid,
      errors: valid ? [] : [message || `长度不能少于 ${min} 个字符`]
    }
  }
}

export function maxLength(max: number, message?: string): ValidatorFn {
  return (value: unknown): ValidationResult => {
    if (typeof value !== 'string' && !Array.isArray(value)) {
      return { valid: true, errors: [] }
    }

    const length = typeof value === 'string' ? value.length : value.length
    const valid = length <= max
    return {
      valid,
      errors: valid ? [] : [message || `长度不能超过 ${max} 个字符`]
    }
  }
}

export function pattern(regex: RegExp, message = '格式不正确'): ValidatorFn {
  return (value: unknown): ValidationResult => {
    if (typeof value !== 'string') {
      return { valid: true, errors: [] }
    }

    const valid = regex.test(value)
    return {
      valid,
      errors: valid ? [] : [message]
    }
  }
}

export function email(message = '请输入有效的邮箱地址'): ValidatorFn {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern(emailRegex, message)
}

export function url(message = '请输入有效的URL'): ValidatorFn {
  return (value: unknown): ValidationResult => {
    if (typeof value !== 'string' || value === '') {
      return { valid: true, errors: [] }
    }

    try {
      new URL(value)
      return { valid: true, errors: [] }
    } catch {
      return { valid: false, errors: [message] }
    }
  }
}

export function number(message = '请输入有效的数字'): ValidatorFn {
  return (value: unknown): ValidationResult => {
    if (value === '' || value === null || value === undefined) {
      return { valid: true, errors: [] }
    }

    const valid = !isNaN(Number(value))
    return {
      valid,
      errors: valid ? [] : [message]
    }
  }
}

export function min(minVal: number, message?: string): ValidatorFn {
  return (value: unknown): ValidationResult => {
    if (value === '' || value === null || value === undefined) {
      return { valid: true, errors: [] }
    }

    const num = Number(value)
    const valid = !isNaN(num) && num >= minVal
    return {
      valid,
      errors: valid ? [] : [message || `值不能小于 ${minVal}`]
    }
  }
}

export function max(maxVal: number, message?: string): ValidatorFn {
  return (value: unknown): ValidationResult => {
    if (value === '' || value === null || value === undefined) {
      return { valid: true, errors: [] }
    }

    const num = Number(value)
    const valid = !isNaN(num) && num <= maxVal
    return {
      valid,
      errors: valid ? [] : [message || `值不能大于 ${maxVal}`]
    }
  }
}

export function integer(message = '请输入整数'): ValidatorFn {
  return (value: unknown): ValidationResult => {
    if (value === '' || value === null || value === undefined) {
      return { valid: true, errors: [] }
    }

    const num = Number(value)
    const valid = !isNaN(num) && Number.isInteger(num)
    return {
      valid,
      errors: valid ? [] : [message]
    }
  }
}

export function positiveNumber(message = '请输入正数'): ValidatorFn {
  return (value: unknown): ValidationResult => {
    if (value === '' || value === null || value === undefined) {
      return { valid: true, errors: [] }
    }

    const num = Number(value)
    const valid = !isNaN(num) && num > 0
    return {
      valid,
      errors: valid ? [] : [message]
    }
  }
}

export function range(minVal: number, maxVal: number, message?: string): ValidatorFn {
  return (value: unknown): ValidationResult => {
    if (value === '' || value === null || value === undefined) {
      return { valid: true, errors: [] }
    }

    const num = Number(value)
    const valid = !isNaN(num) && num >= minVal && num <= maxVal
    return {
      valid,
      errors: valid ? [] : [message || `值必须在 ${minVal} 到 ${maxVal} 之间`]
    }
  }
}

export function oneOf<T>(allowed: T[], message = '值不在允许范围内'): ValidatorFn {
  return (value: unknown): ValidationResult => {
    if (value === '' || value === null || value === undefined) {
      return { valid: true, errors: [] }
    }

    const valid = allowed.includes(value as T)
    return {
      valid,
      errors: valid ? [] : [message]
    }
  }
}

export function custom(validator: (value: unknown) => boolean, message: string): ValidatorFn {
  return (value: unknown): ValidationResult => {
    try {
      const valid = validator(value)
      return {
        valid,
        errors: valid ? [] : [message]
      }
    } catch {
      return {
        valid: false,
        errors: [message]
      }
    }
  }
}

export function compose(...validators: ValidatorFn[]): ValidatorFn {
  return (value: unknown): ValidationResult => {
    const errors: string[] = []

    for (const validator of validators) {
      const result = validator(value)
      if (!result.valid) {
        errors.push(...result.errors)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export function validate(value: unknown, validators: ValidatorFn[]): ValidationResult {
  return compose(...validators)(value)
}

export function sanitizeString(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export function sanitizeNumber(value: string): number | null {
  const num = Number(value)
  return isNaN(num) ? null : num
}

export function sanitizeInteger(value: string): number | null {
  const num = parseInt(value, 10)
  return isNaN(num) ? null : num
}

export function sanitizeFloat(value: string): number | null {
  const num = parseFloat(value)
  return isNaN(num) ? null : num
}

export function trim(value: string): string {
  return value.trim()
}

export function toLowerCase(value: string): string {
  return value.toLowerCase()
}

export function toUpperCase(value: string): string {
  return value.toUpperCase()
}

export function removeWhitespace(value: string): string {
  return value.replace(/\s+/g, '')
}

export function sanitizeInput(
  value: unknown,
  transformers: ((v: string) => string)[] = []
): string {
  if (typeof value !== 'string') {
    return ''
  }

  let result = value
  for (const transformer of transformers) {
    result = transformer(result)
  }

  return sanitizeString(result)
}
