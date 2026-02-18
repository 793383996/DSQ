/**
 * I18n - 国际化模块
 *
 * 功能：
 * - 提供多语言支持（中文/英文）
 * - 管理语言切换和持久化
 * - 验证语言包完整性
 * - 支持语言变更回调
 *
 * 主要方法：
 * - getI18n(): 获取i18n实例
 * - setLocale(locale): 设置语言
 * - getLocale(): 获取当前语言
 * - useCurrentLocale(): 响应式当前语言
 * - onLocaleChange(callback): 监听语言变更
 * - destroyI18n(): 销毁i18n实例
 *
 * 上游调用：
 * - main.ts: 应用入口
 * - components/LocaleSwitcher.vue: 语言切换组件
 *
 * 下游依赖：
 * - i18n/locales/zh-CN.ts: 中文语言包
 * - i18n/locales/en-US.ts: 英文语言包
 *
 * 支持语言：
 * - zh-CN: 简体中文
 * - en-US: 英语
 *
 * 语言检测顺序：
 * 1. localStorage存储
 * 2. 浏览器语言
 * 3. 默认英语
 */
import { createI18n } from 'vue-i18n'
import { ref, readonly, type Ref } from 'vue'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
const MAX_VALIDATION_DEPTH = 10

function validateLocaleCompleteness(
  locale: string,
  messages: Record<string, unknown>,
  baseMessages: Record<string, unknown>,
  path: string = '',
  depth: number = 0
): string[] {
  const missingKeys: string[] = []

  if (depth > MAX_VALIDATION_DEPTH) {
    console.warn(`[i18n] Max validation depth reached at ${path}`)
    return missingKeys
  }

  for (const key of Object.keys(baseMessages)) {
    const currentPath = path ? `${path}.${key}` : key

    if (!(key in messages) || messages[key] === null || messages[key] === undefined) {
      missingKeys.push(`${locale}: ${currentPath}`)
    } else if (typeof baseMessages[key] === 'object' && baseMessages[key] !== null) {
      const nestedMissing = validateLocaleCompleteness(
        locale,
        messages[key] as Record<string, unknown>,
        baseMessages[key] as Record<string, unknown>,
        currentPath,
        depth + 1
      )
      missingKeys.push(...nestedMissing)
    }
  }

  return missingKeys
}

function validateAllLocales(): void {
  if (typeof window === 'undefined' || !import.meta.env.DEV || isDestroyed) {
    return
  }

  const zhCNMessages = zhCN as Record<string, unknown>
  const enUSMessages = enUS as Record<string, unknown>

  const missingInEN = validateLocaleCompleteness('en-US', enUSMessages, zhCNMessages)
  const missingInZH = validateLocaleCompleteness('zh-CN', zhCNMessages, enUSMessages)

  if (missingInEN.length > 0) {
    console.warn(
      '[i18n] Missing keys in en-US:',
      missingInEN.slice(0, 10).join(', '),
      missingInEN.length > 10 ? `... and ${missingInEN.length - 10} more` : ''
    )
  }

  if (missingInZH.length > 0) {
    console.warn(
      '[i18n] Missing keys in zh-CN:',
      missingInZH.slice(0, 10).join(', '),
      missingInZH.length > 10 ? `... and ${missingInZH.length - 10} more` : ''
    )
  }
}

let validateTimer: ReturnType<typeof setTimeout> | null = null

function scheduleValidation(): void {
  if (typeof window !== 'undefined' && import.meta.env.DEV && !validateTimer && !isDestroyed) {
    validateTimer = setTimeout(() => {
      validateAllLocales()
      validateTimer = null
    }, 100)
  }
}

let currentLocale: Ref<SupportedLocale> | null = null
let i18nInstance: ReturnType<typeof createI18n> | null = null
let storageEventHandler: ((event: StorageEvent) => void) | null = null
let isDestroyed = false
let isInitializing = false
let initError: Error | null = null
let destroyedLocaleRef: Ref<SupportedLocale> | null = null
const localeChangeCallbacks: Set<(locale: SupportedLocale) => void> = new Set()
const MAX_CALLBACKS = 50
let initResolveQueue: Array<{ resolve: (value: void) => void; reject: (error: Error) => void }> = []

function getDefaultLocale(): SupportedLocale {
  if (typeof window === 'undefined') {
    return 'zh-CN'
  }

  try {
    const stored = localStorage.getItem('locale')
    if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
      return stored as SupportedLocale
    }
  } catch {
    // localStorage 可能被禁用
  }

  try {
    const browserLang =
      navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage
    if (browserLang?.startsWith('zh')) {
      return 'zh-CN'
    }
  } catch {
    // navigator 可能不可用
  }

  return 'en-US'
}

function initI18n(): void {
  if (i18nInstance) return

  if (isInitializing) {
    console.warn('[i18n] Initialization already in progress, waiting...')
    return
  }

  isInitializing = true
  isDestroyed = false
  initError = null

  try {
    const defaultLocale = getDefaultLocale()
    currentLocale = ref<SupportedLocale>(defaultLocale)

    i18nInstance = createI18n({
      legacy: false,
      locale: defaultLocale,
      fallbackLocale: 'zh-CN',
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS
      }
    })

    if (typeof window !== 'undefined') {
      storageEventHandler = (event: StorageEvent) => {
        if (
          event.key === 'locale' &&
          event.newValue &&
          event.newValue.trim() !== '' &&
          currentLocale &&
          i18nInstance
        ) {
          const newLocale = event.newValue.trim()
          if (SUPPORTED_LOCALES.includes(newLocale as SupportedLocale)) {
            ;(i18nInstance.global.locale as unknown as { value: string }).value = newLocale
            currentLocale.value = newLocale as SupportedLocale

            const callbacks = Array.from(localeChangeCallbacks)
            callbacks.forEach(cb => {
              try {
                cb(newLocale as SupportedLocale)
              } catch (e) {
                console.error('[i18n] Locale change callback error:', e)
              }
            })
          }
        }
      }

      window.addEventListener('storage', storageEventHandler)
    }

    scheduleValidation()
  } catch (e) {
    console.error('[i18n] Initialization failed:', e)
    initError = e instanceof Error ? e : new Error(String(e))
    i18nInstance = null
    currentLocale = null
  } finally {
    isInitializing = false

    const queue = initResolveQueue
    initResolveQueue = []

    if (initError) {
      queue.forEach(({ reject }) => reject(initError as Error))
    } else if (i18nInstance) {
      queue.forEach(({ resolve }) => resolve())
    }
  }
}

export function getI18n() {
  if (i18nInstance) return i18nInstance

  if (initError) {
    throw initError
  }

  if (isInitializing) {
    return new Promise<ReturnType<typeof createI18n>>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('[i18n] Initialization timeout'))
      }, 5000)

      initResolveQueue.push({
        resolve: () => {
          clearTimeout(timeoutId)
          if (i18nInstance) {
            resolve(i18nInstance)
          } else {
            reject(new Error('[i18n] Initialization failed'))
          }
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId)
          reject(error)
        }
      })
    }) as unknown as ReturnType<typeof createI18n>
  }

  initI18n()
  if (initError) {
    throw initError
  }
  if (!i18nInstance) {
    throw new Error('[i18n] Failed to initialize i18n instance')
  }
  return i18nInstance
}

export const i18n = new Proxy({} as ReturnType<typeof createI18n>, {
  get(_target, prop) {
    try {
      if (isInitializing && !i18nInstance) {
        console.warn(`[i18n] Accessing '${String(prop)}' during initialization`)
      }

      initI18n()
      if (!i18nInstance) {
        console.error('[i18n] i18nInstance is null after initI18n')
        if (prop === 'global') {
          return {
            locale: { value: 'zh-CN' },
            t: (key: string) => key,
            tm: (key: string) => key,
            availableLocales: ['zh-CN', 'en-US'],
            fallbackLocale: { value: 'zh-CN' },
            messages: { value: { 'zh-CN': zhCN, 'en-US': enUS } }
          }
        }
        return undefined
      }
      return Reflect.get(i18nInstance, prop)
    } catch (e) {
      console.error('[i18n] Proxy get error:', e)
      return undefined
    }
  },
  has(_target, prop) {
    try {
      initI18n()
      if (!i18nInstance) {
        return false
      }
      return Reflect.has(i18nInstance, prop)
    } catch {
      return false
    }
  }
})

export function onLocaleChange(callback: (locale: SupportedLocale) => void): () => void {
  if (localeChangeCallbacks.size >= MAX_CALLBACKS) {
    console.warn('[i18n] Max callbacks reached, removing oldest')
    const oldest = localeChangeCallbacks.values().next().value
    if (oldest) {
      localeChangeCallbacks.delete(oldest)
    }
  }
  localeChangeCallbacks.add(callback)
  return () => {
    localeChangeCallbacks.delete(callback)
  }
}

export function setLocale(locale: string): void {
  if (typeof window === 'undefined') {
    return
  }

  if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
    console.warn(`[i18n] Unsupported locale: ${locale}`)
    return
  }

  if (!i18nInstance || !currentLocale) {
    initI18n()
    if (!i18nInstance || !currentLocale) {
      console.error('[i18n] Failed to initialize i18n for setLocale')
      return
    }
  }

  const typedLocale = locale as SupportedLocale

  ;(i18nInstance.global.locale as unknown as { value: string }).value = typedLocale
  currentLocale.value = typedLocale

  try {
    localStorage.setItem('locale', typedLocale)
  } catch {
    // localStorage 可能被禁用
  }

  try {
    document.documentElement.lang = typedLocale
  } catch {
    // document 可能不可用
  }

  const callbacks = Array.from(localeChangeCallbacks)
  callbacks.forEach(cb => {
    try {
      cb(typedLocale)
    } catch (e) {
      console.error('[i18n] Locale change callback error:', e)
    }
  })
}

export function getLocale(): SupportedLocale {
  if (isDestroyed) {
    return 'zh-CN'
  }
  if (!currentLocale) {
    initI18n()
  }
  return currentLocale?.value ?? 'zh-CN'
}

export function useCurrentLocale() {
  if (isDestroyed) {
    if (!destroyedLocaleRef) {
      destroyedLocaleRef = ref<SupportedLocale>('zh-CN')
    }
    return readonly(destroyedLocaleRef)
  }
  if (!currentLocale) {
    initI18n()
  }
  if (!currentLocale) {
    console.error('[i18n] Failed to initialize currentLocale for useCurrentLocale')
    return readonly(ref<SupportedLocale>('zh-CN'))
  }
  return readonly(currentLocale)
}

export function destroyI18n(): void {
  if (validateTimer) {
    clearTimeout(validateTimer)
    validateTimer = null
  }

  if (storageEventHandler && typeof window !== 'undefined') {
    window.removeEventListener('storage', storageEventHandler)
    storageEventHandler = null
  }

  const queue = initResolveQueue
  initResolveQueue = []
  queue.forEach(({ reject }) => {
    reject(new Error('[i18n] Instance destroyed during initialization'))
  })

  localeChangeCallbacks.clear()

  i18nInstance = null
  currentLocale = null
  destroyedLocaleRef = null
  isInitializing = false
  initError = null
  isDestroyed = true
}

export type MessageSchema = typeof zhCN
