import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import Toast from './components/Toast/Toast.vue'
import BlueprintGenerator from './components/BlueprintGenerator/BlueprintGenerator.vue'
import { setToastInstance } from './composables/useToast'
import { initLegacyBridge, loadLegacyModules } from './core/bridge'
import { logger, initLogger } from './utils/logger'
import {
  initErrorReporter,
  addBreadcrumb,
  captureError,
  destroyErrorReporter
} from './utils/errorReporter'
import { initWebVitals, onMetric, destroyWebVitals } from './utils/webVitals'
import { i18n, destroyI18n } from './i18n'
import '../Scripts/style.css'

initLogger({
  minLevel: import.meta.env.PROD ? 'info' : 'debug',
  enableConsole: true,
  enableRemote: import.meta.env.PROD,
  remoteUrl: import.meta.env.VITE_LOG_URL
})

initErrorReporter({
  dsn: import.meta.env.VITE_ERROR_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  enabled: import.meta.env.PROD
})

initWebVitals()

onMetric(metric => {
  addBreadcrumb({
    type: 'info',
    message: `Performance: ${metric.name}=${metric.value}ms (${metric.rating})`,
    data: { metric }
  })

  if (metric.rating === 'poor') {
    logger.warn(`[Performance] Poor ${metric.name}:`, metric.value)
  }
})

initLegacyBridge()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)

const toastContainer = document.createElement('div')
toastContainer.id = 'toast-container'
document.body.appendChild(toastContainer)

const toastApp = createApp(Toast)
toastApp.mount(toastContainer)

const toastInstance = toastApp.component(Toast.name || 'Toast')
if (toastInstance) {
  setToastInstance(
    toastInstance as unknown as {
      success: (msg: string, dur?: number) => number
      error: (msg: string, dur?: number) => number
      warning: (msg: string, dur?: number) => number
      info: (msg: string, dur?: number) => number
      loading: (msg?: string) => number
      hide: (id: number) => void
      remove: (id: number) => void
    }
  )
  app.config.globalProperties.$toast = toastInstance
}

app.config.errorHandler = (err, instance, info) => {
  logger.error('[Vue Error]', err, info)
  addBreadcrumb({
    type: 'error',
    message: `Vue Error: ${err}`,
    data: { info }
  })
  captureError(err instanceof Error ? err : new Error(String(err)), {
    info,
    componentName: instance?.$options?.name
  })
}

app.config.warnHandler = (msg, instance, trace) => {
  logger.warn('[Vue Warn]', msg, trace)
}

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  logger.error('[Unhandled Rejection]', event.reason)
  captureError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
    type: 'unhandledrejection'
  })
}

const handleGlobalError = (event: ErrorEvent) => {
  logger.error('[Global Error]', event.error)
  if (event.error) {
    captureError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  }
}

if (!import.meta.env.PROD) {
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  window.addEventListener('error', handleGlobalError)
}

app.component('BlueprintGenerator', BlueprintGenerator)

app.mount('#app')

const legacyLoadPromise = loadLegacyModules()
legacyLoadPromise.catch(e => logger.error('Failed to load legacy modules:', e))

if (import.meta.env.DEV) {
  legacyLoadPromise.then(() => {
    logger.debug('[main] Legacy modules ready')
  })
}

let isPageVisible = true
const MAX_VISIBILITY_CALLBACKS = 20
const visibilityChangeCallbacks: Set<(visible: boolean) => void> = new Set()
let visibilityHandler: (() => void) | null = null
let isCleanedUp = false

visibilityHandler = () => {
  isPageVisible = document.visibilityState === 'visible'
  const callbacks = Array.from(visibilityChangeCallbacks)
  callbacks.forEach(cb => {
    try {
      cb(isPageVisible)
    } catch (e) {
      logger.error('[Visibility] Callback error:', e)
    }
  })

  if (!isPageVisible) {
    logger.debug('[Visibility] Page hidden, pausing non-critical operations')
  } else {
    logger.debug('[Visibility] Page visible, resuming operations')
  }
}

document.addEventListener('visibilitychange', visibilityHandler)

export function onVisibilityChange(callback: (visible: boolean) => void): () => void {
  if (visibilityChangeCallbacks.size >= MAX_VISIBILITY_CALLBACKS) {
    logger.warn('[Visibility] Max callbacks reached, removing oldest')
    const oldest = visibilityChangeCallbacks.values().next().value
    if (oldest) {
      visibilityChangeCallbacks.delete(oldest)
    }
  }
  visibilityChangeCallbacks.add(callback)
  return () => {
    visibilityChangeCallbacks.delete(callback)
  }
}

export function getPageVisibility(): boolean {
  return isPageVisible
}

function cleanup(): void {
  if (isCleanedUp) {
    return
  }
  isCleanedUp = true

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }
  visibilityChangeCallbacks.clear()

  if (!import.meta.env.PROD) {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    window.removeEventListener('error', handleGlobalError)
  }

  destroyWebVitals()
  destroyErrorReporter()
  destroyI18n()

  logger.debug('[main] Cleanup completed')
}

window.addEventListener('beforeunload', cleanup)

window.addEventListener('pagehide', event => {
  if (event.persisted) {
    logger.debug('[main] Page persisted in bfcache')
  } else {
    cleanup()
  }
})
