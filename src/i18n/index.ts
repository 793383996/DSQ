import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

function getDefaultLocale(): string {
  if (typeof window === 'undefined') {
    return 'zh-CN'
  }

  const stored = localStorage.getItem('locale')
  if (stored && ['zh-CN', 'en-US'].includes(stored)) {
    return stored
  }

  const browserLang =
    navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage
  if (browserLang?.startsWith('zh')) {
    return 'zh-CN'
  }
  return 'en-US'
}

export const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export function setLocale(locale: string): void {
  if (typeof window === 'undefined') {
    return
  }

  if (i18n.mode === 'legacy') {
    ;(i18n.global as unknown as { locale: string }).locale = locale
  } else {
    ;(i18n.global.locale as unknown as { value: string }).value = locale
  }
  localStorage.setItem('locale', locale)
}

export function getLocale(): string {
  if (i18n.mode === 'legacy') {
    return (i18n.global as unknown as { locale: string }).locale
  }
  return (i18n.global.locale as unknown as { value: string }).value
}

export type MessageSchema = typeof zhCN
