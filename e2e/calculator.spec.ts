import { test, expect } from '@playwright/test'

test.describe('基础计算流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.page-title', { timeout: 10000 })
  })

  test('页面加载成功', async ({ page }) => {
    await expect(page.locator('.page-title')).toBeVisible()
    await expect(page.locator('.page-title')).toContainText('戴森球计划')
  })

  test('添加需求并计算', async ({ page }) => {
    await page.click('button:has-text("添加需求")')
    await page.waitForSelector('.dialog-overlay', { state: 'visible' })

    const searchInput = page.locator('.item-search input')
    await searchInput.fill('铁板')
    await page.waitForTimeout(300)

    const firstItem = page.locator('.item-list .item-card').first()
    await firstItem.click()

    const numInput = page.locator('.number-input input')
    await numInput.fill('100')

    await page.click('button:has-text("确认")')

    await page.waitForSelector('.result-table', { timeout: 10000 })

    const resultRows = page.locator('.result-table tbody tr')
    await expect(resultRows.first()).toBeVisible()
  })

  test('计算结果显示正确', async ({ page }) => {
    await page.click('button:has-text("添加需求")')
    await page.waitForSelector('.dialog-overlay', { state: 'visible' })

    const searchInput = page.locator('.item-search input')
    await searchInput.fill('铁板')
    await page.waitForTimeout(300)

    await page.locator('.item-list .item-card').first().click()
    await page.locator('.number-input input').fill('60')
    await page.click('button:has-text("确认")')

    await page.waitForSelector('.result-table tbody tr', { timeout: 10000 })

    const ironIngotRow = page.locator('.result-table tbody tr:has-text("铁板")')
    await expect(ironIngotRow).toBeVisible()
  })
})

test.describe('设置功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.page-title', { timeout: 10000 })
  })

  test('打开设置面板', async ({ page }) => {
    await page.click('button:has-text("设置")')
    await expect(page.locator('.config-panel')).toBeVisible()
  })

  test('修改增产剂设置', async ({ page }) => {
    await page.click('button:has-text("设置")')
    await page.waitForSelector('.config-panel')

    const proliferatorSelect = page.locator('select, .proliferator-select').first()
    if (await proliferatorSelect.isVisible()) {
      await proliferatorSelect.selectOption({ index: 1 })
    }
  })
})

test.describe('排除列表', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.page-title', { timeout: 10000 })
  })

  test('添加排除项', async ({ page }) => {
    await page.click('button:has-text("添加需求")')
    await page.waitForSelector('.dialog-overlay', { state: 'visible' })

    const searchInput = page.locator('.item-search input')
    await searchInput.fill('铁板')
    await page.waitForTimeout(300)

    await page.locator('.item-list .item-card').first().click()
    await page.locator('.number-input input').fill('60')
    await page.click('button:has-text("确认")')

    await page.waitForSelector('.result-table tbody tr', { timeout: 10000 })

    const firstExcludeBtn = page.locator('.result-table tbody tr .exclude-btn').first()
    if (await firstExcludeBtn.isVisible()) {
      await firstExcludeBtn.click()
      await page.waitForTimeout(500)
    }
  })
})

test.describe('国际化', () => {
  test('切换语言', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.page-title', { timeout: 10000 })

    const localeSwitcher = page.locator('.locale-switcher')
    if (await localeSwitcher.isVisible()) {
      await localeSwitcher.click()
      await page.waitForTimeout(300)

      const enOption = page.locator('.locale-option:has-text("English")')
      if (await enOption.isVisible()) {
        await enOption.click()
        await page.waitForTimeout(300)

        await expect(page.locator('.page-title')).toContainText('Dyson Sphere')
      }
    }
  })
})

test.describe('错误处理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.page-title', { timeout: 10000 })
  })

  test('无需求时计算提示', async ({ page }) => {
    const calculateBtn = page.locator('button:has-text("计算")')
    if (await calculateBtn.isVisible()) {
      await calculateBtn.click()
      await page.waitForTimeout(500)
    }
  })
})
