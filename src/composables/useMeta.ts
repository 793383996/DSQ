/**
 * useMeta - 页面元数据管理组合式函数
 *
 * 功能：
 * - 管理页面title和meta标签
 * - 支持OG标签和Twitter卡片
 * - 支持canonical链接
 * - 支持响应式更新
 *
 * 主要方法：
 * - useMeta(options): 设置页面元数据
 * - setDocumentTitle(title, suffix): 设置文档标题
 * - setPageDescription(description): 设置页面描述
 * - setPageKeywords(keywords): 设置关键词
 * - setCanonicalUrl(url): 设置规范链接
 * - resetMeta(): 重置为默认元数据
 *
 * 上游调用：
 * - App.vue: 设置应用元数据
 * - 其他需要SEO优化的页面
 *
 * 支持的元数据：
 * - title: 页面标题
 * - description: 页面描述
 * - keywords: 关键词数组
 * - ogImage: Open Graph图片
 * - ogUrl: Open Graph URL
 * - canonical: 规范链接
 */
import { watch, onMounted, onUnmounted } from 'vue'
import type { MaybeRef } from 'vue'
import { unref } from 'vue'

export interface MetaOptions {
  title?: MaybeRef<string>
  description?: MaybeRef<string>
  keywords?: MaybeRef<string[]>
  ogImage?: MaybeRef<string>
  ogUrl?: MaybeRef<string>
  canonical?: MaybeRef<string>
}

function setMetaTag(name: string, content: string, isProperty = false): void {
  const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`
  let element = document.querySelector(selector) as HTMLMetaElement | null

  if (!element) {
    element = document.createElement('meta')
    if (isProperty) {
      element.setAttribute('property', name)
    } else {
      element.setAttribute('name', name)
    }
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

function removeMetaTag(name: string, isProperty = false): void {
  const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`
  const element = document.querySelector(selector)
  if (element) {
    element.remove()
  }
}

function setLinkTag(rel: string, href: string): void {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null

  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
}

export function useMeta(options: MetaOptions): void {
  const updateMeta = (): void => {
    if (options.title) {
      const title = unref(options.title)
      document.title = title
      setMetaTag('og:title', title, true)
      setMetaTag('twitter:title', title)
    }

    if (options.description) {
      const description = unref(options.description)
      setMetaTag('description', description)
      setMetaTag('og:description', description, true)
      setMetaTag('twitter:description', description)
    }

    if (options.keywords) {
      const keywords = unref(options.keywords)
      setMetaTag('keywords', keywords.join(', '))
    }

    if (options.ogImage) {
      const ogImage = unref(options.ogImage)
      setMetaTag('og:image', ogImage, true)
      setMetaTag('twitter:image', ogImage)
    }

    if (options.ogUrl) {
      const ogUrl = unref(options.ogUrl)
      setMetaTag('og:url', ogUrl, true)
    }

    if (options.canonical) {
      const canonical = unref(options.canonical)
      setLinkTag('canonical', canonical)
    }
  }

  const watchers: (() => void)[] = []

  onMounted(() => {
    updateMeta()

    if (options.title && typeof options.title === 'object' && 'value' in options.title) {
      watchers.push(watch(options.title, updateMeta))
    }
    if (
      options.description &&
      typeof options.description === 'object' &&
      'value' in options.description
    ) {
      watchers.push(watch(options.description, updateMeta))
    }
    if (options.keywords && typeof options.keywords === 'object' && 'value' in options.keywords) {
      watchers.push(watch(options.keywords, updateMeta))
    }
    if (options.ogImage && typeof options.ogImage === 'object' && 'value' in options.ogImage) {
      watchers.push(watch(options.ogImage, updateMeta))
    }
    if (options.ogUrl && typeof options.ogUrl === 'object' && 'value' in options.ogUrl) {
      watchers.push(watch(options.ogUrl, updateMeta))
    }
    if (
      options.canonical &&
      typeof options.canonical === 'object' &&
      'value' in options.canonical
    ) {
      watchers.push(watch(options.canonical, updateMeta))
    }
  })
}

export function setDocumentTitle(title: string, suffix = ' - 戴森球计划计算器'): void {
  document.title = title + suffix
  setMetaTag('og:title', document.title, true)
}

export function setPageDescription(description: string): void {
  setMetaTag('description', description)
  setMetaTag('og:description', description, true)
  setMetaTag('twitter:description', description)
}

export function setPageKeywords(keywords: string[]): void {
  setMetaTag('keywords', keywords.join(', '))
}

export function setCanonicalUrl(url: string): void {
  setLinkTag('canonical', url)
  setMetaTag('og:url', url, true)
}

export function resetMeta(): void {
  const defaultMeta = {
    title: '戴森球计划量产量化计算器 - DSP生产链规划工具',
    description:
      '《戴森球计划》自动化量产计算器，支持全自动计算量产需求、蓝图生成、生产链优化。帮助玩家高效规划戴森球生产线。',
    keywords: [
      '戴森球计划',
      '量产量化工具',
      '量产量化计算器',
      '自动化工具',
      '生产工具',
      'Dyson Sphere Program',
      '计算器',
      '蓝图'
    ]
  }

  document.title = defaultMeta.title
  setMetaTag('description', defaultMeta.description)
  setMetaTag('keywords', defaultMeta.keywords.join(', '))
  setMetaTag('og:title', defaultMeta.title, true)
  setMetaTag('og:description', defaultMeta.description, true)
}
