/**
 * useIconProvider - 图标提供者组合式函数
 *
 * 功能：
 * - 提供物品图标加载和缓存
 * - 支持从远程服务器获取图标
 * - 支持从legacy window.icons获取图标
 * - 支持Base64格式图标缓存
 *
 * 主要方法：
 * - getIcon(name): 获取图标（优先legacy，再缓存）
 * - loadIconByName(name): 异步加载图标
 * - preloadIcons(names): 批量预加载图标
 * - hasIcon(name): 检查图标是否存在
 * - clearCache(): 清空缓存
 *
 * 上游调用：
 * - components/DemandList.vue: 显示需求物品图标
 * - components/ResultTable.vue: 显示结果物品图标
 * - components/AddItemDialog.vue: 显示物品选择图标
 *
 * 下游依赖：
 * - core/data/index.ts: itemMap物品映射
 * - utils/logger.ts: 日志记录
 *
 * 图标来源优先级：
 * 1. window.icons (legacy已加载)
 * 2. 本地缓存
 * 3. 远程服务器 (https://icon.dspbh.cn/dse/)
 */
import { ref, shallowRef } from 'vue'
import { itemMap, getItemRemark } from '../core/data'
import { logger } from '../utils/logger'
import type { LegacyWindow } from '../core/types/legacy'

interface IconCache {
  [key: string]: string
}

interface LoadingPromise {
  [key: string]: Promise<string>
}

const iconCache = shallowRef<IconCache>({})
const loadingPromises = shallowRef<LoadingPromise>({})
const isInitialized = ref(false)

const BASE_ICON_URL = 'https://icon.dspbh.cn/dse/'

const itemMapReverseIndex: Record<string, { iconId: string; key: string }> = {}

function getWin(): LegacyWindow {
  return window as unknown as LegacyWindow
}

function buildReverseIndex(): void {
  if (Object.keys(itemMapReverseIndex).length > 0) return
  for (const key in itemMap) {
    const item = itemMap[key]
    if (item.iconId) {
      itemMapReverseIndex[item.name] = { iconId: String(item.iconId), key }
    }
  }
}

export function useIconProvider() {
  async function fetchIconAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch')
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      return ''
    }
  }

  async function loadIconByName(name: string): Promise<string | null> {
    buildReverseIndex()

    // P1-1修复：优先使用legacy已加载的图标
    const win = getWin()
    if (win.icons && win.icons[name]) {
      const base64Icon = 'data:image/png;base64,' + win.icons[name]
      iconCache.value = { ...iconCache.value, [name]: base64Icon }
      return base64Icon
    }

    const cached = iconCache.value[name]
    if (cached) return cached

    const existingPromise = loadingPromises.value[name]
    if (existingPromise) return existingPromise

    const itemInfo = itemMapReverseIndex[name]
    if (!itemInfo || !itemInfo.iconId) return null

    const promise = (async () => {
      const iconUrl = `${BASE_ICON_URL}${itemInfo.iconId}.png`
      try {
        const base64 = await fetchIconAsBase64(iconUrl)
        if (base64) {
          iconCache.value = { ...iconCache.value, [name]: base64 }
          return base64
        }
      } catch (e) {
        logger.warn(`Failed to load icon for ${name}:`, e)
      }
      return ''
    })()

    loadingPromises.value = { ...loadingPromises.value, [name]: promise }

    const result = await promise

    const { [name]: _, ...rest } = loadingPromises.value
    loadingPromises.value = rest

    return result || null
  }

  async function initializeIcons(): Promise<void> {
    if (isInitialized.value) return
    isInitialized.value = true
    logger.log('[IconProvider] Lazy loading mode enabled')
  }

  // P1-1修复：优先从window.icons获取，再从缓存获取
  function getIcon(name: string): string | null {
    const win = getWin()
    if (win.icons && win.icons[name]) {
      return 'data:image/png;base64,' + win.icons[name]
    }
    return iconCache.value[name] || null
  }

  function hasIcon(name: string): boolean {
    const win = getWin()
    if (win.icons && win.icons[name]) return true
    return name in iconCache.value
  }

  function getIconNames(): string[] {
    return Object.keys(itemMap).map(key => itemMap[key].name)
  }

  function getIconByKey(key: string): string | null {
    const item = itemMap[key]
    if (item && item.name) {
      return getIcon(item.name)
    }
    return null
  }

  async function preloadIcons(names: string[]): Promise<void> {
    const unloadedNames = names.filter(name => !hasIcon(name) && !loadingPromises.value[name])
    if (unloadedNames.length === 0) return

    await Promise.all(unloadedNames.map(name => loadIconByName(name)))
  }

  function clearCache(): void {
    iconCache.value = {}
    loadingPromises.value = {}
    isInitialized.value = false
  }

  return {
    iconCache: iconCache,
    isInitialized,
    initializeIcons,
    getIcon,
    hasIcon,
    getIconNames,
    getIconByKey,
    getItemRemark,
    preloadIcons,
    loadIconByName,
    clearCache
  }
}
