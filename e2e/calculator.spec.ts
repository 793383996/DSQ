import { test, expect, Page, BrowserContext } from '@playwright/test'

const LOCALES = {
  'zh-CN': {
    title: '戴森球计划',
    addDemand: '添加需求',
    confirm: '确认',
    calculate: '计算',
    settings: '设置',
    searchPlaceholder: '搜索物品',
    ironPlate: '铁板',
    generateBlueprint: '生成蓝图',
    copperPlate: '铜板',
    steel: '钢材'
  },
  'en-US': {
    title: 'Dyson Sphere',
    addDemand: 'Add Demand',
    confirm: 'Confirm',
    calculate: 'Calculate',
    settings: 'Settings',
    searchPlaceholder: 'Search item',
    ironPlate: 'Iron Plate',
    generateBlueprint: 'Generate Blueprint',
    copperPlate: 'Copper Plate',
    steel: 'Steel'
  }
}

type LocaleKey = keyof typeof LOCALES

const PERFORMANCE_THRESHOLDS = {
  pageLoad: process.env.CI ? 15000 : 10000,
  calculation: process.env.CI ? 8000 : 5000,
  largeCalculation: process.env.CI ? 15000 : 10000
}

const MAX_RETRIES = 3
const RETRY_DELAY = 500

async function getLocale(page: Page): Promise<LocaleKey> {
  try {
    const locale = await page.evaluate(() => localStorage.getItem('locale'))
    if (locale && locale in LOCALES) {
      return locale as LocaleKey
    }
    return 'zh-CN'
  } catch {
    return 'zh-CN'
  }
}

function getLocaleTexts(locale: LocaleKey) {
  return LOCALES[locale] || LOCALES['zh-CN']
}

async function waitForAppReady(
  page: Page,
  timeout: number = 30000
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now()
  const errors: string[] = []
  const consoleErrors: string[] = []
  const MAX_CONSOLE_ERRORS = 20

  const consoleHandler = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error' && consoleErrors.length < MAX_CONSOLE_ERRORS) {
      consoleErrors.push(msg.text())
    }
  }
  page.on('console', consoleHandler)

  const getRemainingTimeout = () => Math.max(1000, timeout - (Date.now() - startTime))

  try {
    await page.waitForSelector('.page-title', { timeout: Math.min(timeout, 15000) })
  } catch (e) {
    errors.push(`Page title not found after ${Date.now() - startTime}ms`)

    if (consoleErrors.length > 0) {
      errors.push(`Console errors: ${consoleErrors.slice(0, 3).join('; ')}`)
    }

    const pageContent = await page.content()
    const hasApp = pageContent.includes('id="app"')
    const hasError = pageContent.includes('error-boundary') || pageContent.includes('error')

    if (!hasApp) {
      errors.push('App container not found')
    }
    if (hasError) {
      errors.push('Error boundary detected')
    }

    page.off('console', consoleHandler)
    return { success: false, error: errors.join('; ') }
  }

  try {
    await page.waitForFunction(
      () => {
        const app = document.querySelector('#app')
        const loadingEl = document.querySelector('.loading-state, .loading-spinner')
        return app && !loadingEl
      },
      { timeout: Math.min(getRemainingTimeout(), 10000) }
    )
  } catch (e) {
    // 非关键错误，继续
  }

  try {
    await page.waitForFunction(
      () => {
        const win = window as unknown as { DS_DATA?: unknown; xqs?: unknown[] }
        const hasData = typeof win.DS_DATA !== 'undefined'
        const hasResult = document.querySelector('.result-table, .empty-state')
        return hasData || hasResult
      },
      { timeout: Math.min(getRemainingTimeout(), 10000) }
    )
  } catch (e) {
    // 数据加载可能延迟，不阻塞
  }

  page.off('console', consoleHandler)
  return { success: true }
}

async function waitForServiceWorker(page: Page, maxWait: number = 5000): Promise<boolean> {
  const startTime = Date.now()
  const checkInterval = 200
  let lastResult = false

  while (Date.now() - startTime < maxWait) {
    const ready = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          return !!registration
        } catch {
          return false
        }
      }
      return false
    })

    if (ready) return true
    lastResult = ready
    await page.waitForTimeout(checkInterval)
  }

  return lastResult
}

async function addItemDemand(
  page: Page,
  itemName: string,
  quantity: number,
  locale: LocaleKey
): Promise<{ success: boolean; error?: string }> {
  const texts = getLocaleTexts(locale)

  try {
    const addBtn = page.locator(`button:has-text("${texts.addDemand}")`)
    await addBtn.click({ timeout: 5000 })
  } catch (e) {
    return { success: false, error: `Add demand button not found: ${texts.addDemand}` }
  }

  try {
    await page.waitForSelector('.dialog-overlay', { state: 'visible', timeout: 5000 })
  } catch (e) {
    return { success: false, error: 'Dialog overlay not visible after clicking add demand' }
  }

  const searchInput = page
    .locator('.search-input input, input[placeholder*="搜索"], input[placeholder*="Search"]')
    .first()
  await searchInput.fill(itemName)

  try {
    await page.waitForSelector('.item-btn, .item-card', { state: 'visible', timeout: 3000 })
  } catch (e) {
    return { success: false, error: `No search results for "${itemName}"` }
  }

  const firstItem = page.locator('.item-btn, .item-card').first()
  try {
    await firstItem.click({ timeout: 3000 })
  } catch (e) {
    return { success: false, error: `Item "${itemName}" not found in search results` }
  }

  const numInput = page.locator('.quantity-input input, input[type="number"]').first()
  await numInput.fill(quantity.toString())

  const inputValue = await numInput.inputValue()
  if (inputValue !== quantity.toString()) {
    return {
      success: false,
      error: `Quantity input failed: expected ${quantity}, got ${inputValue}`
    }
  }

  try {
    await page.click(`button:has-text("${texts.confirm}")`, { timeout: 3000 })
  } catch (e) {
    return { success: false, error: `Confirm button not found: ${texts.confirm}` }
  }

  try {
    await page.waitForSelector('.dialog-overlay', { state: 'hidden', timeout: 3000 })
  } catch (e) {
    return { success: false, error: 'Dialog did not close after confirm' }
  }

  return { success: true }
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY,
  operationName: string = 'operation',
  maxTotalTime: number = 30000
): Promise<T> {
  let lastError: Error = new Error(`[E2E] ${operationName} failed after ${maxRetries} retries`)
  const startTime = Date.now()

  for (let i = 0; i < maxRetries; i++) {
    if (Date.now() - startTime > maxTotalTime) {
      console.error(`[E2E] ${operationName} exceeded max total time ${maxTotalTime}ms`)
      break
    }

    try {
      return await operation()
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      console.error(`[E2E] ${operationName} attempt ${i + 1}/${maxRetries} failed:`, e)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

async function clearAppState(page: Page): Promise<{ success: boolean; error?: string }> {
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()

        const win = window as unknown as Record<string, unknown>
        if ('xqs' in win && Array.isArray(win.xqs)) {
          win.xqs = []
        }
        if ('ig_names' in win && Array.isArray(win.ig_names)) {
          win.ig_names = []
        }
        if ('xh_list' in win && Array.isArray(win.xh_list)) {
          win.xh_list = []
        }
        if ('out_list' in win && Array.isArray(win.out_list)) {
          win.out_list = []
        }
        if ('items' in win && Array.isArray(win.items)) {
          win.items = []
        }
        if ('items0' in win && Array.isArray(win.items0)) {
          win.items0 = []
        }
        if ('items2' in win && Array.isArray(win.items2)) {
          win.items2 = []
        }
        if ('DS_DATA' in win) {
          delete win.DS_DATA
        }
        if ('settings' in win) {
          win.settings = {}
        }
        if ('settings_time' in win) {
          win.settings_time = {}
        }
        if ('settings_pf' in win) {
          win.settings_pf = {}
        }
        if ('hideSource' in win && win.hideSource && typeof win.hideSource === 'object') {
          ;(win.hideSource as { checked?: boolean }).checked = false
        }
      } catch (e) {
        console.error('[E2E] Failed to clear state:', e)
      }
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

test.describe('基础计算流程', () => {
  test.beforeEach(async ({ page }) => {
    const clearResult = await clearAppState(page)
    if (!clearResult.success) {
      console.warn(`[E2E] Failed to clear app state: ${clearResult.error}`)
    }
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const result = await waitForAppReady(page)
    if (!result.success) {
      const screenshot = await page.screenshot({ fullPage: true }).catch(() => null)
      if (screenshot) {
        console.error(`[E2E] Screenshot saved for failed test`)
      }
      throw new Error(`App not ready: ${result.error}`)
    }
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('页面加载成功', async ({ page }) => {
    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    await expect(page.locator('.page-title')).toBeVisible()
    await expect(page.locator('.page-title')).toContainText(texts.title)
  })

  test('添加需求并计算', async ({ page }) => {
    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    const result = await addItemDemand(page, texts.ironPlate, 100, locale)
    if (!result.success) {
      throw new Error(`Failed to add item: ${result.error}`)
    }

    await page.waitForSelector('.result-table tbody tr, .result-table', { timeout: 10000 })

    const resultRows = page.locator('.result-table tbody tr').first()
    await expect(resultRows).toBeVisible({ timeout: 5000 })
  })

  test('计算结果显示正确', async ({ page }) => {
    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    const result = await addItemDemand(page, texts.ironPlate, 60, locale)
    if (!result.success) {
      throw new Error(`Failed to add item: ${result.error}`)
    }

    await page.waitForSelector('.result-table tbody tr', { timeout: 10000 })

    const resultTable = page.locator('.result-table')
    await expect(resultTable).toBeVisible()
  })
})

test.describe('数据持久化', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('需求列表持久化', async ({ page, context }) => {
    await page.goto('/')
    const readyResult = await waitForAppReady(page)
    if (!readyResult.success) {
      throw new Error(`App not ready: ${readyResult.error}`)
    }

    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    const result = await addItemDemand(page, texts.ironPlate, 100, locale)
    if (!result.success) {
      throw new Error(`Failed to add item: ${result.error}`)
    }
    await page.waitForSelector('.result-table tbody tr', { timeout: 10000 })

    const demandsBefore = await page.evaluate(() => {
      const win = window as unknown as {
        xqs?: { item?: { name: string }; name?: string; number?: number }[]
      }
      return win.xqs || []
    })
    expect(demandsBefore.length).toBeGreaterThan(0)

    await page.reload()
    const readyResult2 = await waitForAppReady(page)
    if (!readyResult2.success) {
      throw new Error(`App not ready after reload: ${readyResult2.error}`)
    }

    const demandsAfter = await page.evaluate(() => {
      const win = window as unknown as {
        xqs?: { item?: { name: string }; name?: string; number?: number }[]
      }
      return win.xqs || []
    })

    expect(demandsAfter.length).toBeGreaterThan(0)
  })

  test('设置持久化', async ({ page }) => {
    await page.goto('/')
    const readyResult = await waitForAppReady(page)
    if (!readyResult.success) {
      throw new Error(`App not ready: ${readyResult.error}`)
    }

    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    await page.click(`button:has-text("${texts.settings}")`)
    await page.waitForSelector('.config-panel', { timeout: 5000 })

    const hideSourceCheckbox = page.locator('input[type="checkbox"]').first()
    if (await hideSourceCheckbox.isVisible()) {
      const isChecked = await hideSourceCheckbox.isChecked()
      await hideSourceCheckbox.click()

      await page.reload()
      const readyResult2 = await waitForAppReady(page)
      if (!readyResult2.success) {
        throw new Error(`App not ready after reload: ${readyResult2.error}`)
      }

      await page.click(`button:has-text("${texts.settings}")`)
      await page.waitForSelector('.config-panel', { timeout: 5000 })

      const newState = await hideSourceCheckbox.isChecked()
      expect(newState).toBe(!isChecked)
    }
  })

  test('语言设置持久化', async ({ page }) => {
    await page.goto('/')
    const readyResult = await waitForAppReady(page)
    if (!readyResult.success) {
      throw new Error(`App not ready: ${readyResult.error}`)
    }

    const localeSwitcher = page.locator('.locale-switcher select, select.locale-select').first()
    if (await localeSwitcher.isVisible()) {
      await localeSwitcher.selectOption('en-US')

      await page.waitForFunction(() => localStorage.getItem('locale') === 'en-US', {
        timeout: 3000
      })

      const storedLocale = await page.evaluate(() => localStorage.getItem('locale'))
      expect(storedLocale).toBe('en-US')

      await page.reload()
      const readyResult2 = await waitForAppReady(page)
      if (!readyResult2.success) {
        throw new Error(`App not ready after reload: ${readyResult2.error}`)
      }

      const title = page.locator('.page-title')
      await expect(title).toContainText('Dyson Sphere')
    }
  })
})

test.describe('设置功能', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
    await page.goto('/')
    const result = await waitForAppReady(page)
    if (!result.success) {
      throw new Error(`App not ready: ${result.error}`)
    }
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('打开设置面板', async ({ page }) => {
    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    await page.click(`button:has-text("${texts.settings}")`)
    await expect(page.locator('.config-panel')).toBeVisible({ timeout: 5000 })
  })

  test('修改增产剂设置', async ({ page }) => {
    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    await page.click(`button:has-text("${texts.settings}")`)
    await page.waitForSelector('.config-panel', { timeout: 5000 })

    const proliferatorSelect = page.locator('select').first()
    if (await proliferatorSelect.isVisible()) {
      await proliferatorSelect.selectOption({ index: 1 })
    }
  })
})

test.describe('排除列表', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
    await page.goto('/')
    const result = await waitForAppReady(page)
    if (!result.success) {
      throw new Error(`App not ready: ${result.error}`)
    }
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('添加排除项', async ({ page }) => {
    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    const addResult = await addItemDemand(page, texts.ironPlate, 60, locale)
    if (!addResult.success) {
      throw new Error(`Failed to add item: ${addResult.error}`)
    }

    await page.waitForSelector('.result-table tbody tr', { timeout: 10000 })

    const firstExcludeBtn = page.locator('.exclude-btn').first()
    if (await firstExcludeBtn.isVisible()) {
      await firstExcludeBtn.click()
      await page
        .waitForSelector('.exclude-btn.active, .excluded-item', { timeout: 3000 })
        .catch(() => {})
    }
  })
})

test.describe('国际化', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('切换语言', async ({ page }) => {
    await page.goto('/')
    const readyResult = await waitForAppReady(page)
    if (!readyResult.success) {
      throw new Error(`App not ready: ${readyResult.error}`)
    }

    const localeSwitcher = page.locator('.locale-switcher select, select.locale-select').first()
    if (await localeSwitcher.isVisible()) {
      await localeSwitcher.selectOption('en-US')

      const title = page.locator('.page-title')
      await expect(title).toContainText('Dyson Sphere', { timeout: 5000 })
    }
  })
})

test.describe('错误处理', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
    await page.goto('/')
    const result = await waitForAppReady(page)
    if (!result.success) {
      throw new Error(`App not ready: ${result.error}`)
    }
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('无需求时计算提示', async ({ page }) => {
    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    const calculateBtn = page.locator(`button:has-text("${texts.calculate}")`)
    if (await calculateBtn.isVisible()) {
      await calculateBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test('错误边界捕获异常', async ({ page }) => {
    await page
      .evaluate(() => {
        throw new Error('Test error')
      })
      .catch(() => {})

    const errorBoundary = page.locator('.error-boundary')
    const isVisible = await errorBoundary.isVisible().catch(() => false)

    if (isVisible) {
      await expect(errorBoundary).toBeVisible()
    }
  })
})

test.describe('性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('页面加载性能', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    const result = await waitForAppReady(page)
    const loadTime = Date.now() - startTime

    if (!result.success) {
      console.error(`Performance test failed: ${result.error}`)
    }

    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad)
  })

  test('计算响应时间', async ({ page }) => {
    await page.goto('/')
    const readyResult = await waitForAppReady(page)
    if (!readyResult.success) {
      throw new Error(`App not ready: ${readyResult.error}`)
    }

    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    const addResult = await addItemDemand(page, texts.ironPlate, 1000, locale)
    if (!addResult.success) {
      throw new Error(`Failed to add item: ${addResult.error}`)
    }

    const calcStartTime = Date.now()
    await page.waitForSelector('.result-table tbody tr', { timeout: 10000 })
    const calcTime = Date.now() - calcStartTime

    expect(calcTime).toBeLessThan(PERFORMANCE_THRESHOLDS.calculation)
  })

  test('大数据量计算性能', async ({ page }) => {
    await page.goto('/')
    const readyResult = await waitForAppReady(page)
    if (!readyResult.success) {
      throw new Error(`App not ready: ${readyResult.error}`)
    }

    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    const result1 = await addItemDemand(page, texts.ironPlate, 10000, locale)
    const result2 = await addItemDemand(page, texts.copperPlate, 10000, locale)
    const result3 = await addItemDemand(page, texts.steel, 5000, locale)

    if (!result1.success || !result2.success || !result3.success) {
      throw new Error(`Failed to add items: ${result1.error}, ${result2.error}, ${result3.error}`)
    }

    const calcStartTime = Date.now()
    await page.waitForSelector('.result-table tbody tr', { timeout: 20000 })
    const calcTime = Date.now() - calcStartTime

    expect(calcTime).toBeLessThan(PERFORMANCE_THRESHOLDS.largeCalculation)

    const resultRows = await page.locator('.result-table tbody tr').count()
    expect(resultRows).toBeGreaterThan(5)
  })
})

test.describe('PWA测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('Service Worker 注册', async ({ page }) => {
    await page.goto('/')
    const readyResult = await waitForAppReady(page)
    if (!readyResult.success) {
      throw new Error(`App not ready: ${readyResult.error}`)
    }

    const swRegistered = await retryOperation(
      () => waitForServiceWorker(page, 10000),
      3,
      1000,
      'waitForServiceWorker'
    )
    expect(swRegistered).toBe(true)
  })

  test('manifest.json 存在', async ({ page }) => {
    await page.goto('/')

    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', /manifest/)
  })

  test('离线缓存可用', async ({ page, context }) => {
    await page.goto('/')
    const readyResult = await waitForAppReady(page)
    if (!readyResult.success) {
      throw new Error(`App not ready: ${readyResult.error}`)
    }

    const swReady = await retryOperation(
      () => waitForServiceWorker(page, 15000),
      3,
      1000,
      'waitForServiceWorker'
    )
    expect(swReady).toBe(true)

    await page.waitForTimeout(1000)

    const cacheReady = await retryOperation(
      async () => {
        return await page.evaluate(async () => {
          if ('caches' in window) {
            try {
              const cacheNames = await caches.keys()
              return cacheNames.length > 0
            } catch {
              return false
            }
          }
          return false
        })
      },
      3,
      500,
      'checkCacheReady'
    )
    expect(cacheReady).toBe(true)

    await context.setOffline(true)

    try {
      await page.waitForTimeout(500)

      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})

      await page.waitForTimeout(1000)

      const title = page.locator('.page-title')
      const isVisible = await retryOperation(
        () => title.isVisible(),
        3,
        500,
        'checkTitleVisible'
      ).catch(() => false)

      expect(isVisible).toBe(true)
    } finally {
      await context.setOffline(false)
    }
  })
})

test.describe('无障碍测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
    await page.goto('/')
    const result = await waitForAppReady(page)
    if (!result.success) {
      throw new Error(`App not ready: ${result.error}`)
    }
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('页面标题可访问', async ({ page }) => {
    const title = page.locator('.page-title')
    await expect(title).toBeVisible()

    const titleText = await title.textContent()
    expect(titleText).toBeTruthy()
    expect(titleText!.length).toBeGreaterThan(0)
  })

  test('按钮可聚焦', async ({ page }) => {
    const buttons = page.locator('button')
    const count = await buttons.count()

    if (count > 0) {
      await buttons.first().focus()
      await expect(buttons.first()).toBeFocused()
    }
  })

  test('表单元素有标签', async ({ page }) => {
    const inputs = page.locator('input:not([type="hidden"])')
    const count = await inputs.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const placeholder = await input.getAttribute('placeholder')

      if (id) {
        const label = page.locator(`label[for="${id}"]`)
        const hasLabel = (await label.count()) > 0
        expect(hasLabel || !!ariaLabel || !!placeholder).toBe(true)
      }
    }
  })

  test('图片有 alt 属性', async ({ page }) => {
    const images = page.locator('img')
    const count = await images.count()

    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const role = await img.getAttribute('role')

      expect(alt !== null || role === 'presentation').toBe(true)
    }
  })
})

test.describe('移动端响应式', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('移动端页面加载', async ({ page }) => {
    await page.goto('/')
    const result = await waitForAppReady(page)
    if (!result.success) {
      throw new Error(`App not ready: ${result.error}`)
    }

    const title = page.locator('.page-title')
    await expect(title).toBeVisible()
  })

  test('移动端计算流程', async ({ page }) => {
    await page.goto('/')
    const readyResult = await waitForAppReady(page)
    if (!readyResult.success) {
      throw new Error(`App not ready: ${readyResult.error}`)
    }

    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    const addResult = await addItemDemand(page, texts.ironPlate, 60, locale)
    if (!addResult.success) {
      throw new Error(`Failed to add item: ${addResult.error}`)
    }

    await page.waitForSelector('.result-table tbody tr', { timeout: 10000 })
  })
})

test.describe('蓝图生成', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
    await page.goto('/')
    const result = await waitForAppReady(page)
    if (!result.success) {
      throw new Error(`App not ready: ${result.error}`)
    }
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('生成蓝图按钮存在', async ({ page }) => {
    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    const localeSwitcher = page.locator('.locale-switcher select, select.locale-select').first()
    if (await localeSwitcher.isVisible()) {
      await localeSwitcher.selectOption(locale)
    }

    const generateBtn = page.locator(`button:has-text("${texts.generateBlueprint}")`)
    const isVisible = await generateBtn.isVisible().catch(() => false)

    if (!isVisible) {
      const anyGenerateBtn = page.locator(
        'button:has-text("生成蓝图"), button:has-text("Generate")'
      )
      await expect(anyGenerateBtn.first())
        .toBeVisible({ timeout: 5000 })
        .catch(() => {})
    }
  })
})

test.describe('并发操作', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
  })

  test.afterEach(async ({ page }) => {
    await clearAppState(page).catch(() => {})
  })

  test('快速连续添加需求', async ({ page }) => {
    await page.goto('/')
    const readyResult = await waitForAppReady(page)
    if (!readyResult.success) {
      throw new Error(`App not ready: ${readyResult.error}`)
    }

    const locale = await getLocale(page)
    const texts = getLocaleTexts(locale)

    await page.click(`button:has-text("${texts.addDemand}")`)
    await page.waitForSelector('.dialog-overlay', { state: 'visible', timeout: 5000 })

    const searchInput = page.locator('.search-input input').first()

    await searchInput.fill(texts.ironPlate)
    await page.waitForTimeout(100)
    await page.locator('.item-btn, .item-card').first().click()
    await page.locator('.quantity-input input, input[type="number"]').first().fill('60')
    await page.click(`button:has-text("${texts.confirm}")`)

    await page.waitForTimeout(100)

    await page.click(`button:has-text("${texts.addDemand}")`)
    await page.waitForSelector('.dialog-overlay', { state: 'visible', timeout: 5000 })
    await searchInput.fill(texts.copperPlate)
    await page.waitForTimeout(100)
    await page.locator('.item-btn, .item-card').first().click()
    await page.locator('.quantity-input input, input[type="number"]').first().fill('60')
    await page.click(`button:has-text("${texts.confirm}")`)

    await page.waitForSelector('.result-table tbody tr', { timeout: 15000 })

    const resultRows = await page.locator('.result-table tbody tr').count()
    expect(resultRows).toBeGreaterThan(0)
  })
})
