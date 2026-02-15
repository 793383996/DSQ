export interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
}

export interface WebVitalsReport {
  LCP?: number
  FID?: number
  CLS?: number
  TTFB?: number
  INP?: number
  FCP?: number
}

type MetricRatingThresholds = {
  good: number
  poor: number
}

const LCP_THRESHOLDS: MetricRatingThresholds = { good: 2500, poor: 4000 }
const FID_THRESHOLDS: MetricRatingThresholds = { good: 100, poor: 300 }
const CLS_THRESHOLDS: MetricRatingThresholds = { good: 0.1, poor: 0.25 }
const TTFB_THRESHOLDS: MetricRatingThresholds = { good: 800, poor: 1800 }
const INP_THRESHOLDS: MetricRatingThresholds = { good: 200, poor: 500 }
const FCP_THRESHOLDS: MetricRatingThresholds = { good: 1800, poor: 3000 }

function getRating(
  value: number,
  thresholds: MetricRatingThresholds
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good'
  if (value <= thresholds.poor) return 'needs-improvement'
  return 'poor'
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getNavigationType(): string {
  if (typeof document === 'undefined') return 'unknown'
  const entries = performance.getEntriesByType('navigation')
  if (entries.length > 0 && (entries[0] as PerformanceNavigationTiming).type) {
    return (entries[0] as PerformanceNavigationTiming).type
  }
  const navigation = (performance as any).navigation
  if (navigation) {
    switch (navigation.type) {
      case 0:
        return 'navigate'
      case 1:
        return 'reload'
      case 2:
        return 'back_forward'
      default:
        return 'unknown'
    }
  }
  return 'unknown'
}

const MAX_BUFFER_SIZE = 50
const MAX_CALLBACKS = 10

let metricsBuffer: PerformanceMetric[] = []
let callbacks: ((metric: PerformanceMetric) => void)[] = []
let observers: PerformanceObserver[] = []
let visibilityHandler: (() => void) | null = null
let pageHideHandler: (() => void) | null = null
let inpVisibilityHandler: (() => void) | null = null
let inpPageHideHandler: (() => void) | null = null
let isInitialized = false

const isDev = import.meta.env.DEV

function devLog(...args: any[]): void {
  if (isDev) console.log(...args)
}

function devWarn(...args: any[]): void {
  if (isDev) console.warn(...args)
}

export function onMetric(callback: (metric: PerformanceMetric) => void): () => void {
  callbacks.push(callback)

  if (callbacks.length > MAX_CALLBACKS) {
    devWarn('[WebVitals] Too many callbacks registered, removing oldest')
    callbacks.shift()
  }

  return () => {
    const index = callbacks.indexOf(callback)
    if (index > -1) callbacks.splice(index, 1)
  }
}

function emitMetric(metric: PerformanceMetric): void {
  if (metricsBuffer.length >= MAX_BUFFER_SIZE) {
    metricsBuffer.shift()
  }
  metricsBuffer.push(metric)

  callbacks.forEach(cb => {
    try {
      cb(metric)
    } catch (e) {
      devWarn('[WebVitals] Callback error:', e)
    }
  })

  devLog(`[WebVitals] ${metric.name}:`, metric.value, `(${metric.rating})`)
}

export function observeLCP(): void {
  if (typeof PerformanceObserver === 'undefined') return

  try {
    const observer = new PerformanceObserver(list => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any

      if (lastEntry) {
        const metric: PerformanceMetric = {
          name: 'LCP',
          value: lastEntry.startTime,
          rating: getRating(lastEntry.startTime, LCP_THRESHOLDS),
          delta: lastEntry.startTime,
          id: generateId(),
          navigationType: getNavigationType()
        }
        emitMetric(metric)
      }
    })

    observer.observe({ type: 'largest-contentful-paint', buffered: true })
    observers.push(observer)
  } catch (e) {
    devWarn('[WebVitals] LCP observation failed:', e)
  }
}

export function observeFID(): void {
  if (typeof PerformanceObserver === 'undefined') return

  try {
    const observer = new PerformanceObserver(list => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        const metric: PerformanceMetric = {
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          rating: getRating(entry.processingStart - entry.startTime, FID_THRESHOLDS),
          delta: entry.processingStart - entry.startTime,
          id: generateId(),
          navigationType: getNavigationType()
        }
        emitMetric(metric)
      })
    })

    observer.observe({ type: 'first-input', buffered: true })
    observers.push(observer)
  } catch (e) {
    devWarn('[WebVitals] FID observation failed:', e)
  }
}

export function observeCLS(): void {
  if (typeof PerformanceObserver === 'undefined') return

  let clsValue = 0
  const clsEntries: any[] = []

  try {
    const observer = new PerformanceObserver(list => {
      const entries = list.getEntries() as any[]
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
          clsEntries.push(entry)
        }
      })
    })

    observer.observe({ type: 'layout-shift', buffered: true })
    observers.push(observer)

    const reportCLS = () => {
      if (clsValue > 0) {
        const metric: PerformanceMetric = {
          name: 'CLS',
          value: clsValue,
          rating: getRating(clsValue, CLS_THRESHOLDS),
          delta: clsValue,
          id: generateId(),
          navigationType: getNavigationType()
        }
        emitMetric(metric)
      }
    }

    if (document.visibilityState === 'hidden') {
      reportCLS()
    } else {
      visibilityHandler = () => {
        if (document.visibilityState === 'hidden') {
          reportCLS()
        }
      }
      document.addEventListener('visibilitychange', visibilityHandler)

      pageHideHandler = reportCLS
      window.addEventListener('pagehide', pageHideHandler)
    }
  } catch (e) {
    devWarn('[WebVitals] CLS observation failed:', e)
  }
}

export function observeTTFB(): void {
  if (typeof performance === 'undefined') return

  try {
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    if (entries.length > 0) {
      const entry = entries[0]
      const ttfb = entry.responseStart - entry.requestStart

      const metric: PerformanceMetric = {
        name: 'TTFB',
        value: ttfb,
        rating: getRating(ttfb, TTFB_THRESHOLDS),
        delta: ttfb,
        id: generateId(),
        navigationType: getNavigationType()
      }
      emitMetric(metric)
    }
  } catch (e) {
    devWarn('[WebVitals] TTFB observation failed:', e)
  }
}

export function observeFCP(): void {
  if (typeof PerformanceObserver === 'undefined') return

  try {
    const observer = new PerformanceObserver(list => {
      const entries = list.getEntries() as any[]
      entries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          const metric: PerformanceMetric = {
            name: 'FCP',
            value: entry.startTime,
            rating: getRating(entry.startTime, FCP_THRESHOLDS),
            delta: entry.startTime,
            id: generateId(),
            navigationType: getNavigationType()
          }
          emitMetric(metric)
        }
      })
    })

    observer.observe({ type: 'paint', buffered: true })
    observers.push(observer)
  } catch (e) {
    devWarn('[WebVitals] FCP observation failed:', e)
  }
}

export function observeINP(): void {
  if (typeof PerformanceObserver === 'undefined') return

  let inpValue = 0
  let interactionCount = 0

  const updateINP = (entry: any) => {
    if (entry.interactionId) {
      const duration = entry.duration
      inpValue = Math.max(inpValue, duration)
      interactionCount++
    }
  }

  try {
    const observer = new PerformanceObserver(list => {
      const entries = list.getEntries() as any[]
      entries.forEach(updateINP)
    })

    observer.observe({ type: 'event', buffered: true })
    observers.push(observer)

    const reportINP = () => {
      if (inpValue > 0) {
        const metric: PerformanceMetric = {
          name: 'INP',
          value: inpValue,
          rating: getRating(inpValue, INP_THRESHOLDS),
          delta: inpValue,
          id: generateId(),
          navigationType: getNavigationType()
        }
        emitMetric(metric)
      }
    }

    if (document.visibilityState === 'hidden') {
      reportINP()
    } else {
      inpVisibilityHandler = () => {
        if (document.visibilityState === 'hidden') {
          reportINP()
        }
      }
      document.addEventListener('visibilitychange', inpVisibilityHandler)

      inpPageHideHandler = reportINP
      window.addEventListener('pagehide', inpPageHideHandler)
    }
  } catch (e) {
    devWarn('[WebVitals] INP observation failed:', e)
  }
}

export function getMetrics(): PerformanceMetric[] {
  return [...metricsBuffer]
}

export function getReport(): WebVitalsReport {
  const report: WebVitalsReport = {}

  metricsBuffer.forEach(metric => {
    switch (metric.name) {
      case 'LCP':
        report.LCP = metric.value
        break
      case 'FID':
        report.FID = metric.value
        break
      case 'CLS':
        report.CLS = metric.value
        break
      case 'TTFB':
        report.TTFB = metric.value
        break
      case 'INP':
        report.INP = metric.value
        break
      case 'FCP':
        report.FCP = metric.value
        break
    }
  })

  return report
}

export function destroyWebVitals(): void {
  observers.forEach(observer => {
    try {
      observer.disconnect()
    } catch {
      // ignore
    }
  })
  observers = []

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }

  if (pageHideHandler) {
    window.removeEventListener('pagehide', pageHideHandler)
    pageHideHandler = null
  }

  if (inpVisibilityHandler) {
    document.removeEventListener('visibilitychange', inpVisibilityHandler)
    inpVisibilityHandler = null
  }

  if (inpPageHideHandler) {
    window.removeEventListener('pagehide', inpPageHideHandler)
    inpPageHideHandler = null
  }

  callbacks = []
  metricsBuffer = []
  isInitialized = false
}

export function initWebVitals(): void {
  if (typeof window === 'undefined') return
  if (isInitialized) {
    devWarn('[WebVitals] Already initialized, skipping')
    return
  }
  isInitialized = true

  observeLCP()
  observeFID()
  observeCLS()
  observeTTFB()
  observeFCP()
  observeINP()

  devLog('[WebVitals] Performance monitoring initialized')
}

export const webVitals = {
  init: initWebVitals,
  getMetrics,
  getReport,
  onMetric,
  destroy: destroyWebVitals
}
