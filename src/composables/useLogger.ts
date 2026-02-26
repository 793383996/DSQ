import { getCurrentInstance } from 'vue'
import { logger as baseLogger } from '../utils/logger'

export function useLogger() {
  const instance = getCurrentInstance()
  if (instance?.appContext?.app?.config?.globalProperties) {
    return instance.appContext.app.config.globalProperties.$logger || baseLogger
  }
  return baseLogger
}

export function initLoggerGlobal(app: any) {
  app.config.globalProperties.$logger = baseLogger
  app.provide('$logger', baseLogger)
}
