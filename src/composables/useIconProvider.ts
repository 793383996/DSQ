import { ref, shallowRef } from 'vue'
import { itemMap } from '../core/legacy/blueprint'
import { logger } from '../utils/logger'

interface IconCache {
  [key: string]: string
}

const iconCache = shallowRef<IconCache>({})
const isInitialized = ref(false)

const BASE_ICON_URL = 'https://icon.dspbh.cn/dse/'

export function useIconProvider() {
  async function initializeIcons(): Promise<void> {
    if (isInitialized.value) return

    const cache: IconCache = {}

    for (const key in itemMap) {
      const item = itemMap[key]
      if (item.iconId) {
        const iconUrl = `${BASE_ICON_URL}${item.iconId}.png`
        try {
          const base64 = await fetchIconAsBase64(iconUrl)
          if (base64) {
            cache[item.name] = base64
            cache[key] = base64
          }
        } catch (e) {
          logger.warn(`Failed to load icon for ${item.name}:`, e)
        }
      }
    }

    iconCache.value = cache
    isInitialized.value = true
  }

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
    const unloadedNames = names.filter(name => !hasIcon(name))

    if (unloadedNames.length === 0) return

    for (const name of unloadedNames) {
      for (const key in itemMap) {
        if (itemMap[key].name === name && itemMap[key].iconId) {
          const iconUrl = `${BASE_ICON_URL}${itemMap[key].iconId}.png`
          try {
            const base64 = await fetchIconAsBase64(iconUrl)
            if (base64) {
              iconCache.value[name] = base64
            }
          } catch (e) {
            logger.warn(`Failed to preload icon for ${name}:`, e)
          }
          break
        }
      }
    }
  }

  function clearCache(): void {
    iconCache.value = {}
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
    clearCache
  }
}
