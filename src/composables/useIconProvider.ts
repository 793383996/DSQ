import { ref, shallowRef } from 'vue'
import { itemMap } from '../core/legacy/blueprint'
import { logger } from '../utils/logger'

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

function buildReverseIndex(): void {
  if (Object.keys(itemMapReverseIndex).length > 0) return
  for (const key in itemMap) {
    const item = itemMap[key]
    if (item.iconId) {
      itemMapReverseIndex[item.name] = { iconId: item.iconId, key }
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

  function getIcon(name: string): string | null {
    return iconCache.value[name] || null
  }

  function hasIcon(name: string): boolean {
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

  function getItemRemark(name: string): string {
    for (const key in itemMap) {
      if (itemMap[key].name === name) {
        return itemMap[key].remark || name
      }
    }
    return name
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
