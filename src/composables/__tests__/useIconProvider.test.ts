import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useIconProvider } from '../useIconProvider'

vi.mock('../../core/data', () => ({
  itemMap: {
    '1': { name: '铁板', iconId: '1001' },
    '2': { name: '齿轮', iconId: '1002' }
  },
  getItemRemark: vi.fn((name: string) => `Remark for ${name}`)
}))

describe('useIconProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      icons: {}
    })
  })

  describe('getIcon', () => {
    it('should return null for non-existent icon', () => {
      const { getIcon } = useIconProvider()
      expect(getIcon('不存在')).toBeNull()
    })

    it('should return icon from window.icons', () => {
      vi.stubGlobal('window', {
        icons: {
          铁板: 'base64encodedstring'
        }
      })
      const { getIcon } = useIconProvider()
      const result = getIcon('铁板')
      expect(result).toBe('data:image/png;base64,base64encodedstring')
    })
  })

  describe('hasIcon', () => {
    it('should return false for non-existent icon', () => {
      const { hasIcon } = useIconProvider()
      expect(hasIcon('不存在')).toBe(false)
    })

    it('should return true for icon in window.icons', () => {
      vi.stubGlobal('window', {
        icons: {
          铁板: 'base64encodedstring'
        }
      })
      const { hasIcon } = useIconProvider()
      expect(hasIcon('铁板')).toBe(true)
    })
  })

  describe('getIconNames', () => {
    it('should return all icon names from itemMap', () => {
      const { getIconNames } = useIconProvider()
      const names = getIconNames()
      expect(names).toContain('铁板')
      expect(names).toContain('齿轮')
    })
  })

  describe('getItemRemark', () => {
    it('should return remark for item', () => {
      const { getItemRemark } = useIconProvider()
      const remark = getItemRemark('铁板')
      expect(remark).toBe('Remark for 铁板')
    })
  })

  describe('clearCache', () => {
    it('should clear icon cache', () => {
      const { clearCache, iconCache } = useIconProvider()
      clearCache()
      expect(Object.keys(iconCache.value).length).toBe(0)
    })
  })

  describe('initializeIcons', () => {
    it('should set isInitialized to true', async () => {
      const { initializeIcons, isInitialized } = useIconProvider()
      await initializeIcons()
      expect(isInitialized.value).toBe(true)
    })
  })
})
