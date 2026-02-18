/**
 * Main - 应用入口模块
 *
 * 功能：
 * - 初始化Vue应用
 * - 加载遗留模块（data.js、blueprint.js）
 * - 初始化日志、错误上报、性能监控
 * - 注册全局错误处理器
 * - 管理页面可见性状态
 * - 清理应用资源
 *
 * 初始化流程：
 * 1. 初始化日志器
 * 2. 初始化错误上报器
 * 3. 初始化性能监控
 * 4. 初始化遗留桥接
 * 5. 创建Vue应用和Pinia
 * 6. 挂载Toast组件
 * 7. 加载遗留模块
 * 8. 挂载应用
 *
 * 主要导出：
 * - onVisibilityChange(callback): 监听页面可见性变化
 * - getPageVisibility(): 获取页面可见性状态
 *
 * 上游调用：
 * - index.html: HTML入口
 *
 * 下游依赖：
 * - App.vue: 主应用组件
 * - core/bridge.ts: 遗留桥接
 * - utils/logger.ts: 日志工具
 * - utils/errorReporter.ts: 错误上报
 * - utils/webVitals.ts: 性能监控
 * - i18n/index.ts: 国际化
 */
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
    type: 'vue',
    context: {
      info,
      componentName: instance?.$options?.name
    }
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
      type: 'error',
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    })
  }
}

window.addEventListener('unhandledrejection', handleUnhandledRejection)
window.addEventListener('error', handleGlobalError)

app.component('BlueprintGenerator', BlueprintGenerator)

// P0-3修复：legacy模块必须在mount之前加载完成，确保update_all等函数已挂载
// 添加重试机制和更详细的错误处理
const MAX_INIT_RETRIES = 3
const INIT_RETRY_DELAY_MS = 1000

async function initializeApp(retryCount: number = 0): Promise<void> {
  try {
    const loadPromise = loadLegacyModules()
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Legacy modules load timeout')), 15000)
    })

    await Promise.race([loadPromise, timeoutPromise])
    logger.log('[main] Legacy modules loaded successfully')
  } catch (e) {
    logger.error(
      `Failed to load legacy modules (attempt ${retryCount + 1}/${MAX_INIT_RETRIES}):`,
      e
    )

    if (retryCount < MAX_INIT_RETRIES - 1) {
      await new Promise(resolve => setTimeout(resolve, INIT_RETRY_DELAY_MS))
      return initializeApp(retryCount + 1)
    }

    const appEl = document.getElementById('app')
    if (appEl) {
      appEl.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #e74c3c;">
          <h2>应用初始化失败</h2>
          <p>请刷新页面重试，或检查网络连接</p>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
            刷新页面
          </button>
        </div>
      `
    }
    return
  }

  app.mount('#app')
  logger.log('[main] App mounted')
}

initializeApp()

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

  window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  window.removeEventListener('error', handleGlobalError)

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
