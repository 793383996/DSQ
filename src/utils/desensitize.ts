type DesensitizeFn = (value: string) => string

const SENSITIVE_KEYS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'privateKey',
  'private_key',
  'credential',
  'auth',
  'authorization',
  'session',
  'cookie',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'pin',
  'otp',
  'oneTimePassword'
]

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return email
  }

  const [localPart, domain] = email.split('@')
  const maskedLocal =
    localPart.length > 2
      ? localPart[0] +
        '*'.repeat(Math.min(localPart.length - 2, 4)) +
        localPart[localPart.length - 1]
      : '*'.repeat(localPart.length)

  return `${maskedLocal}@${domain}`
}

export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length < 7) {
    return '*'.repeat(cleaned.length)
  }

  if (cleaned.length === 11) {
    return cleaned.slice(0, 3) + '****' + cleaned.slice(-4)
  }

  return cleaned.slice(0, 3) + '****' + cleaned.slice(-3)
}

export function maskIdCard(idCard: string): string {
  const cleaned = idCard.replace(/\D/g, '')

  if (cleaned.length < 8) {
    return '*'.repeat(cleaned.length)
  }

  return cleaned.slice(0, 4) + '*'.repeat(cleaned.length - 8) + cleaned.slice(-4)
}

export function maskBankCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '')

  if (cleaned.length < 8) {
    return '*'.repeat(cleaned.length)
  }

  return cleaned.slice(0, 4) + '*'.repeat(cleaned.length - 8) + cleaned.slice(-4)
}

export function maskIp(ip: string): string {
  const parts = ip.split('.')
  if (parts.length !== 4) {
    return ip
  }

  return `${parts[0]}.${parts[1]}.***.***`
}

export function maskUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.password) {
      parsed.password = '***'
    }
    return parsed.toString()
  } catch {
    return url
  }
}

export function maskString(value: string, visibleChars = 2): string {
  if (value.length <= visibleChars * 2) {
    return '*'.repeat(value.length)
  }

  return (
    value.slice(0, visibleChars) +
    '*'.repeat(value.length - visibleChars * 2) +
    value.slice(-visibleChars)
  )
}

export function maskPartial(value: string, startPercent = 0.3, endPercent = 0.3): string {
  const startChars = Math.floor(value.length * startPercent)
  const endChars = Math.floor(value.length * endPercent)
  const maskLength = value.length - startChars - endChars

  if (maskLength <= 0) {
    return '*'.repeat(value.length)
  }

  return value.slice(0, startChars) + '*'.repeat(maskLength) + value.slice(-endChars || undefined)
}

export function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return SENSITIVE_KEYS.some(
    sensitive => lowerKey === sensitive || lowerKey.includes(sensitive.toLowerCase())
  )
}

export function desensitizeValue(value: unknown, key?: string): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    if (key && isSensitiveKey(key)) {
      return '***REDACTED***'
    }

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return maskEmail(value)
    }

    if (/^\d{11}$/.test(value)) {
      return maskPhone(value)
    }

    if (/^\d{15,18}$/.test(value)) {
      return maskIdCard(value)
    }

    if (/^\d{12,19}$/.test(value)) {
      return maskBankCard(value)
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
      return maskIp(value)
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      return maskUrl(value)
    }

    return value
  }

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => desensitizeValue(item, `${key}[${index}]`))
  }

  if (typeof value === 'object') {
    return desensitizeObject(value as Record<string, unknown>)
  }

  return value
}

export function desensitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      result[key] = '***REDACTED***'
    } else {
      result[key] = desensitizeValue(value, key)
    }
  }

  return result
}

export function desensitizeString(str: string): string {
  let result = str

  result = result.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, match => maskEmail(match))

  result = result.replace(/\b1[3-9]\d{9}\b/g, match => maskPhone(match))

  result = result.replace(/\b\d{15,18}\b/g, match => maskIdCard(match))

  result = result.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, match =>
    maskBankCard(match)
  )

  result = result.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, match => maskIp(match))

  return result
}

export function createDesensitizedLog(data: unknown): unknown {
  return desensitizeValue(data)
}

export function registerSensitiveKey(key: string): void {
  if (!SENSITIVE_KEYS.includes(key)) {
    SENSITIVE_KEYS.push(key)
  }
}

export function registerSensitiveKeys(keys: string[]): void {
  keys.forEach(key => registerSensitiveKey(key))
}

export function clearSensitiveKeys(): void {
  SENSITIVE_KEYS.length = 0
  SENSITIVE_KEYS.push(
    'password',
    'passwd',
    'pwd',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'privateKey',
    'private_key',
    'credential',
    'auth',
    'authorization',
    'session',
    'cookie',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'credit_card',
    'cardNumber',
    'card_number',
    'cvv',
    'pin',
    'otp',
    'oneTimePassword'
  )
}
