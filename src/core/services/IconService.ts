/**
 * IconService - 图标服务
 *
 * 功能：
 * - 异步加载游戏图标资源
 * - 构建图标映射索引
 * - 提供图标查询和渲染接口
 * - 支持事件通知机制
 *
 * 主要方法：
 * - loadIconData(): 加载图标数据
 * - getIcon(name): 获取图标Base64数据
 * - getIconImg(name): 获取图标HTML标签
 * - getIconShow(name, number): 获取带数量的图标显示
 * - isLoaded(): 检查是否已加载
 * - waitForLoad(): 等待加载完成
 *
 * 上游调用：
 * - App.vue: 应用初始化
 * - AddItemDialog.vue: 物品选择
 * - bridge.ts: 向后兼容层
 *
 * 下游依赖：
 * - Scripts/data.json: 图标数据源
 *
 * 架构师注：
 * - 替代 legacy/iconLoader.js
 * - 使用 Promise 链确保加载顺序
 * - 支持事件通知替代轮询
 */
import { logger } from '../../utils/logger'

export interface IIconData {
  name: string
  value: string
}

export interface IGameIconData {
  icons1: IIconData[]
  icons2: IIconData[]
  [key: string]: unknown
}

export interface ISelectableItem {
  name: string
  icon: string
}

export interface ISelectableItemsResult {
  icons1: ISelectableItem[]
  icons2: ISelectableItem[]
}

type GameDataLoadedListener = (data: IGameIconData) => void

class IconService {
  private gameData: IGameIconData | null = null
  private iconMap: Map<string, string> = new Map()
  private loaded: boolean = false
  private loadPromise: Promise<void> | null = null
  private loadResolve: (() => void) | null = null
  private eventListeners: Set<GameDataLoadedListener> = new Set()

  private static readonly ICON_NAME_PATTERN = /^(\d)-(\d{1,2})-(.+)$/
  private static readonly LOAD_TIMEOUT_MS = 30000
  private static readonly DATA_URL = './Scripts/data.json'

  async loadIconData(): Promise<void> {
    if (this.loaded) {
      return
    }

    if (this.loadPromise) {
      return this.loadPromise
    }

    this.loadPromise = this.doLoadIconData()
    return this.loadPromise
  }

  private async doLoadIconData(): Promise<void> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, IconService.LOAD_TIMEOUT_MS)

    try {
      const version = (window as any).version || ''
      const response = await fetch(`${IconService.DATA_URL}?v${version}`, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data: IGameIconData = await response.json()
      this.gameData = data
      this.buildIconMap()

      this.syncToWindow()

      this.loaded = true
      this.notifyListeners()

      if (this.loadResolve) {
        this.loadResolve()
      }

      window.dispatchEvent(
        new CustomEvent('gameDataLoaded', {
          detail: this.gameData
        })
      )
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('[IconService] Icon data load timeout')
        throw new Error('图标数据加载超时，请检查网络后刷新重试')
      } else {
        logger.error('[IconService] Icon data load failed:', error)
        throw new Error('图标数据加载失败，请刷新再试')
      }
    }
  }

  private buildIconMap(): void {
    this.iconMap.clear()

    if (!this.gameData) return

    const processIcons = (icons: IIconData[]) => {
      if (!Array.isArray(icons)) return

      for (const icon of icons) {
        const match = icon.name.match(IconService.ICON_NAME_PATTERN)
        if (match && match[3]) {
          this.iconMap.set(match[3], icon.value)
        } else {
          this.iconMap.set(icon.name, icon.value)
        }
      }
    }

    processIcons(this.gameData.icons1 || [])
    processIcons(this.gameData.icons2 || [])
  }

  private notifyListeners(): void {
    if (this.gameData) {
      this.eventListeners.forEach(listener => {
        try {
          listener(this.gameData!)
        } catch (e) {
          logger.warn('[IconService] Listener error:', e)
        }
      })
    }
  }

  private syncToWindow(): void {
    const win = window as any
    win.game_data = this.gameData
    win.isDataLoaded = true

    const iconsObj: Record<string, string> = {}
    this.iconMap.forEach((value, key) => {
      iconsObj[key] = value
    })
    win.icons = iconsObj
  }

  isLoaded(): boolean {
    return this.loaded
  }

  private ensureFromWindow(): void {
    if (this.loaded) return

    const win = window as any
    if (win.game_data && (win.game_data.icons1 || win.game_data.icons2)) {
      this.gameData = win.game_data
      this.buildIconMap()
      this.loaded = true
    }
  }

  loadFromWindow(): boolean {
    this.ensureFromWindow()
    return this.loaded
  }

  waitForLoad(): Promise<void> {
    if (this.loaded) {
      return Promise.resolve()
    }

    if (this.loadPromise) {
      return this.loadPromise
    }

    return new Promise(resolve => {
      this.loadResolve = resolve
    })
  }

  getIcon(name: string): string | undefined {
    const normalizedName = this.normalizeName(name)
    return this.iconMap.get(normalizedName)
  }

  getIconAsDataUrl(name: string): string | undefined {
    const iconData = this.getIcon(name)
    if (iconData) {
      return `data:image/png;base64,${iconData}`
    }
    return undefined
  }

  getIconImg(name: string): string {
    const normalizedName = this.normalizeName(name)
    const iconData = this.iconMap.get(normalizedName)

    if (iconData) {
      return `<img class='sicon' src='data:image/png;base64,${iconData}' title='${name}' />`
    }
    return name
  }

  getIconImgWithIconMap(
    name: string,
    iconMap: Map<string, string> | Record<string, string>
  ): string {
    const normalizedName = this.normalizeName(name)
    const iconData = iconMap instanceof Map ? iconMap.get(normalizedName) : iconMap[normalizedName]

    if (iconData) {
      return `<img class='sicon' src='data:image/png;base64,${iconData}' title='${name}' />`
    }
    return name
  }

  getIconShow(name: string, number: string | number): string {
    return `${this.getIconImg(name)}<sub>${number}</sub>`
  }

  private normalizeName(name: string): string {
    const nameMap: Record<string, string> = {
      研究站: '矩阵研究站',
      原油精炼机: '原油精炼厂',
      粒子对撞机: '微型粒子对撞机',
      射线接收塔: '射线接收站',
      '轨道采集器(气态)': '轨道采集器',
      '轨道采集器(巨冰)': '轨道采集器'
    }

    return nameMap[name] || name
  }

  getSelectableItems(): string[] {
    this.ensureFromWindow()
    const items: string[] = []
    const seen = new Set<string>()

    if (!this.gameData) return items

    const processIcons = (icons: IIconData[]) => {
      if (!Array.isArray(icons)) return

      for (const icon of icons) {
        const match = icon.name.match(IconService.ICON_NAME_PATTERN)
        if (match && match[3]) {
          const itemName = match[3]
          if (!seen.has(itemName)) {
            seen.add(itemName)
            items.push(itemName)
          }
        }
      }
    }

    processIcons(this.gameData.icons1 || [])
    processIcons(this.gameData.icons2 || [])

    return items
  }

  getSelectableItemsWithIcons(): ISelectableItemsResult {
    this.ensureFromWindow()
    const result: ISelectableItemsResult = { icons1: [], icons2: [] }
    const seen1 = new Set<string>()
    const seen2 = new Set<string>()

    if (!this.gameData) return result

    const processIcons = (icons: IIconData[], target: ISelectableItem[], seen: Set<string>) => {
      if (!Array.isArray(icons)) return

      for (const icon of icons) {
        const match = icon.name.match(IconService.ICON_NAME_PATTERN)
        if (match && match[3]) {
          const itemName = match[3]
          if (!seen.has(itemName)) {
            seen.add(itemName)
            target.push({
              name: itemName,
              icon: 'data:image/png;base64,' + icon.value
            })
          }
        }
      }
    }

    processIcons(this.gameData.icons1 || [], result.icons1, seen1)
    processIcons(this.gameData.icons2 || [], result.icons2, seen2)

    return result
  }

  getIconDataMap(): Record<string, string> {
    this.ensureFromWindow()
    const result: Record<string, string> = {}

    this.iconMap.forEach((value, key) => {
      result[key] = 'data:image/png;base64,' + value
    })

    return result
  }

  getGameData(): IGameIconData | null {
    return this.gameData
  }

  addLoadListener(listener: GameDataLoadedListener): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  removeLoadListener(listener: GameDataLoadedListener): void {
    this.eventListeners.delete(listener)
  }

  reset(): void {
    this.gameData = null
    this.iconMap.clear()
    this.loaded = false
    this.loadPromise = null
    this.loadResolve = null
    this.eventListeners.clear()
  }
}

export const iconService = new IconService()
