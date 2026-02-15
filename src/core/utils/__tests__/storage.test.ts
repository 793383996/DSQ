import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  setItem,
  getItem,
  removeItem,
  hasItem,
  clearAll,
  setVersionedItem,
  getVersionedItem,
  migrateVersion,
  getStorageInfo
} from '../storage'

describe('storage', () => {
  const PREFIX = 'dsq_'

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('setItem', () => {
    it('should save data to localStorage', () => {
      const result = setItem('testKey', { name: 'test' })

      expect(result).toBe(true)
      expect(localStorage.getItem(PREFIX + 'testKey')).toBe('{"name":"test"}')
    })

    it('should save primitive values', () => {
      expect(setItem('number', 42)).toBe(true)
      expect(setItem('string', 'hello')).toBe(true)
      expect(setItem('boolean', true)).toBe(true)

      expect(getItem('number', 0)).toBe(42)
      expect(getItem('string', '')).toBe('hello')
      expect(getItem('boolean', false)).toBe(true)
    })

    it('should save arrays', () => {
      const arr = [1, 2, 3]
      expect(setItem('array', arr)).toBe(true)
      expect(getItem('array', [])).toEqual(arr)
    })

    it('should return false on storage error', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      const result = setItem('error', 'value')
      expect(result).toBe(false)

      setItemSpy.mockRestore()
    })
  })

  describe('getItem', () => {
    it('should retrieve data from localStorage', () => {
      localStorage.setItem(PREFIX + 'testKey', '{"name":"test"}')

      const result = getItem('testKey', { name: 'default' })

      expect(result).toEqual({ name: 'test' })
    })

    it('should return default value for missing key', () => {
      const result = getItem('missingKey', { name: 'default' })

      expect(result).toEqual({ name: 'default' })
    })

    it('should return default value on parse error', () => {
      localStorage.setItem(PREFIX + 'invalid', 'not valid json')

      const result = getItem('invalid', { name: 'default' })

      expect(result).toEqual({ name: 'default' })
    })
  })

  describe('removeItem', () => {
    it('should remove item from localStorage', () => {
      localStorage.setItem(PREFIX + 'testKey', 'value')

      const result = removeItem('testKey')

      expect(result).toBe(true)
      expect(localStorage.getItem(PREFIX + 'testKey')).toBeNull()
    })

    it('should return true for non-existent key', () => {
      const result = removeItem('nonExistent')
      expect(result).toBe(true)
    })
  })

  describe('hasItem', () => {
    it('should return true for existing item', () => {
      localStorage.setItem(PREFIX + 'testKey', 'value')

      expect(hasItem('testKey')).toBe(true)
    })

    it('should return false for non-existent item', () => {
      expect(hasItem('nonExistent')).toBe(false)
    })
  })

  describe('clearAll', () => {
    it('should clear all prefixed items', () => {
      localStorage.setItem(PREFIX + 'key1', 'value1')
      localStorage.setItem(PREFIX + 'key2', 'value2')
      localStorage.setItem('other_key', 'other_value')

      const result = clearAll()

      expect(result).toBe(true)
      expect(localStorage.getItem(PREFIX + 'key1')).toBeNull()
      expect(localStorage.getItem(PREFIX + 'key2')).toBeNull()
      expect(localStorage.getItem('other_key')).toBe('other_value')
    })
  })

  describe('setVersionedItem', () => {
    it('should save data with version suffix', () => {
      const result = setVersionedItem('settings', '1.0.0', { theme: 'dark' })

      expect(result).toBe(true)
      expect(localStorage.getItem(PREFIX + 'settings_1.0.0')).toBe('{"theme":"dark"}')
    })
  })

  describe('getVersionedItem', () => {
    it('should retrieve versioned data', () => {
      localStorage.setItem(PREFIX + 'settings_1.0.0', '{"theme":"dark"}')

      const result = getVersionedItem('settings', '1.0.0', { theme: 'light' })

      expect(result).toEqual({ theme: 'dark' })
    })

    it('should return default for missing version', () => {
      const result = getVersionedItem('settings', '2.0.0', { theme: 'light' })

      expect(result).toEqual({ theme: 'light' })
    })
  })

  describe('migrateVersion', () => {
    it('should migrate data from old to new version', () => {
      localStorage.setItem(PREFIX + 'settings_1.0.0', '{"theme":"dark"}')

      const result = migrateVersion('settings', '1.0.0', '2.0.0')

      expect(result).toBe(true)
      expect(localStorage.getItem(PREFIX + 'settings_1.0.0')).toBeNull()
      expect(getVersionedItem('settings', '2.0.0', {})).toEqual({ theme: 'dark' })
    })

    it('should apply migrator function', () => {
      localStorage.setItem(PREFIX + 'settings_1.0.0', '{"theme":"dark"}')

      const result = migrateVersion('settings', '1.0.0', '2.0.0', old => ({
        ...old,
        migrated: true
      }))

      expect(result).toBe(true)
      expect(getVersionedItem('settings', '2.0.0', {})).toEqual({ theme: 'dark', migrated: true })
    })

    it('should return false if old version does not exist', () => {
      const result = migrateVersion('settings', '1.0.0', '2.0.0')
      expect(result).toBe(false)
    })
  })

  describe('getStorageInfo', () => {
    it('should return storage usage info', () => {
      localStorage.setItem(PREFIX + 'test', 'value')

      const info = getStorageInfo()

      expect(info.available).toBe(true)
      expect(info.used).toBeGreaterThan(0)
    })
  })
})
