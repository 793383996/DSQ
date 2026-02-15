import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import Toast from './components/Toast/Toast.vue'
import BlueprintGenerator from './components/BlueprintGenerator/BlueprintGenerator.vue'
import { setToastInstance } from './composables/useToast'
import { initLegacyBridge, loadLegacyModules } from './core/bridge'
import { logger } from './utils/logger'
import { i18n } from './i18n'
import '../Scripts/style.css'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('发现新版本，是否刷新页面？')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    logger.log('[PWA] 应用已可离线使用')
  },
  onRegisterError(error) {
    logger.error('[PWA] Service Worker 注册失败:', error)
  }
})

initLegacyBridge()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)

const toastApp = createApp(Toast)
toastApp.use(i18n)
toastApp.mount(document.createElement('div'))

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
}

app.config.warnHandler = (msg, instance, trace) => {
  logger.warn('[Vue Warn]', msg, trace)
}

window.addEventListener('unhandledrejection', event => {
  logger.error('[Unhandled Rejection]', event.reason)
})

window.addEventListener('error', event => {
  logger.error('[Global Error]', event.error)
})

app.component('BlueprintGenerator', BlueprintGenerator)

app.mount('#app')

const legacyLoadPromise = loadLegacyModules()
legacyLoadPromise.catch(e => logger.error('Failed to load legacy modules:', e))

if (import.meta.env.DEV) {
  legacyLoadPromise.then(() => {
    logger.log('[main] Legacy modules ready')
  })
}
