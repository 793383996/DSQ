import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  setDocumentTitle,
  setPageDescription,
  setPageKeywords,
  setCanonicalUrl,
  resetMeta
} from '../useMeta'

describe('useMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.title = ''
  })

  describe('setDocumentTitle', () => {
    it('should set document title with suffix', () => {
      setDocumentTitle('Test Page')
      expect(document.title).toBe('Test Page - 戴森球计划计算器')
    })

    it('should set document title with custom suffix', () => {
      setDocumentTitle('Test Page', ' - Custom Suffix')
      expect(document.title).toBe('Test Page - Custom Suffix')
    })

    it('should set og:title meta tag', () => {
      setDocumentTitle('Test Page')
      const ogTitle = document.querySelector('meta[property="og:title"]')
      expect(ogTitle?.getAttribute('content')).toBe('Test Page - 戴森球计划计算器')
    })
  })

  describe('setPageDescription', () => {
    it('should set description meta tag', () => {
      setPageDescription('Test Description')
      const description = document.querySelector('meta[name="description"]')
      expect(description?.getAttribute('content')).toBe('Test Description')
    })

    it('should set og:description meta tag', () => {
      setPageDescription('Test Description')
      const ogDescription = document.querySelector('meta[property="og:description"]')
      expect(ogDescription?.getAttribute('content')).toBe('Test Description')
    })

    it('should set twitter:description meta tag', () => {
      setPageDescription('Test Description')
      const twitterDescription = document.querySelector('meta[name="twitter:description"]')
      expect(twitterDescription?.getAttribute('content')).toBe('Test Description')
    })
  })

  describe('setPageKeywords', () => {
    it('should set keywords meta tag', () => {
      setPageKeywords(['test', 'keywords', 'meta'])
      const keywords = document.querySelector('meta[name="keywords"]')
      expect(keywords?.getAttribute('content')).toBe('test, keywords, meta')
    })

    it('should handle empty keywords array', () => {
      setPageKeywords([])
      const keywords = document.querySelector('meta[name="keywords"]')
      expect(keywords?.getAttribute('content')).toBe('')
    })
  })

  describe('setCanonicalUrl', () => {
    it('should set canonical link tag', () => {
      setCanonicalUrl('https://example.com/canonical')
      const canonical = document.querySelector('link[rel="canonical"]')
      expect(canonical?.getAttribute('href')).toBe('https://example.com/canonical')
    })

    it('should set og:url meta tag', () => {
      setCanonicalUrl('https://example.com/canonical')
      const ogUrl = document.querySelector('meta[property="og:url"]')
      expect(ogUrl?.getAttribute('content')).toBe('https://example.com/canonical')
    })
  })

  describe('resetMeta', () => {
    it('should reset to default meta tags', () => {
      resetMeta()

      expect(document.title).toBe('戴森球计划量产量化计算器 - DSP生产链规划工具')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
        '戴森球计划'
      )
      expect(document.querySelector('meta[name="keywords"]')?.getAttribute('content')).toContain(
        '戴森球计划'
      )
      expect(
        document.querySelector('meta[property="og:title"]')?.getAttribute('content')
      ).toContain('戴森球计划')
    })
  })

  describe('update existing tags', () => {
    it('should update existing meta tags', () => {
      setDocumentTitle('First Title')
      setDocumentTitle('Second Title')

      expect(document.title).toBe('Second Title - 戴森球计划计算器')
      const ogTitles = document.querySelectorAll('meta[property="og:title"]')
      expect(ogTitles.length).toBe(1)
    })
  })
})
