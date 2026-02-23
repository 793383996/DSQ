import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LRUCache, createHashKey } from '../LRUCache'

describe('LRUCache', () => {
  let cache: LRUCache<string, number>

  beforeEach(() => {
    cache = new LRUCache(3, 60000)
  })

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('a', 1)
      expect(cache.get('a')).toBe(1)
    })

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('should update existing values', () => {
      cache.set('a', 1)
      cache.set('a', 2)
      expect(cache.get('a')).toBe(2)
      expect(cache.size()).toBe(1)
    })

    it('should delete values', () => {
      cache.set('a', 1)
      expect(cache.delete('a')).toBe(true)
      expect(cache.get('a')).toBeUndefined()
      expect(cache.delete('a')).toBe(false)
    })

    it('should clear all values', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.clear()
      expect(cache.size()).toBe(0)
      expect(cache.get('a')).toBeUndefined()
    })
  })

  describe('LRU eviction', () => {
    it('should evict least recently used when full', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.set('d', 4)

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('should update LRU order on get', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      cache.get('a')
      cache.set('d', 4)

      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('should update LRU order on set', () => {
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      cache.set('a', 10)
      cache.set('d', 4)

      expect(cache.get('a')).toBe(10)
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })
  })

  describe('expiration', () => {
    it('should expire entries after maxAge', async () => {
      const shortCache = new LRUCache<string, number>(3, 50)

      shortCache.set('a', 1)
      expect(shortCache.get('a')).toBe(1)

      await new Promise(resolve => setTimeout(resolve, 60))

      expect(shortCache.get('a')).toBeUndefined()
    })

    it('should not expire entries before maxAge', async () => {
      cache.set('a', 1)
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(cache.get('a')).toBe(1)
    })
  })

  describe('size tracking', () => {
    it('should track size correctly', () => {
      expect(cache.size()).toBe(0)
      cache.set('a', 1)
      expect(cache.size()).toBe(1)
      cache.set('b', 2)
      expect(cache.size()).toBe(2)
      cache.delete('a')
      expect(cache.size()).toBe(1)
    })
  })
})

describe('createHashKey', () => {
  it('should create consistent hash for same input', () => {
    const data = { a: 1, b: 'test' }
    const hash1 = createHashKey(data)
    const hash2 = createHashKey(data)
    expect(hash1).toBe(hash2)
  })

  it('should create different hash for different input', () => {
    const hash1 = createHashKey({ a: 1 })
    const hash2 = createHashKey({ a: 2 })
    expect(hash1).not.toBe(hash2)
  })

  it('should handle arrays', () => {
    const hash1 = createHashKey([1, 2, 3])
    const hash2 = createHashKey([1, 2, 3])
    const hash3 = createHashKey([1, 2, 4])
    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hash3)
  })

  it('should handle nested objects', () => {
    const hash1 = createHashKey({ a: { b: 1 } })
    const hash2 = createHashKey({ a: { b: 1 } })
    const hash3 = createHashKey({ a: { b: 2 } })
    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hash3)
  })

  it('should handle null and undefined', () => {
    const hash1 = createHashKey(null)
    const hash2 = createHashKey(undefined)
    const hash3 = createHashKey(null)
    expect(hash1).toBe(hash3)
    expect(hash1).not.toBe(hash2)
  })
})
