/**
 * Storage - localStorage封装工具
 *
 * 功能：
 * - 提供类型安全的localStorage访问
 * - 处理隐私模式下的异常
 * - 支持版本化的数据存储
 * - 自动序列化/反序列化JSON
 *
 * 主要方法：
 * - setItem<T>(key, value): 安全存储数据
 * - getItem<T>(key, defaultValue): 安全读取数据
 * - removeItem(key): 删除数据
 * - clear(): 清空所有数据
 *
 * 上游调用：
 * - stores/*.ts: Pinia状态存储
 * - composables/*.ts: 组合式函数
 *
 * 下游依赖：
 * - utils/logger.ts: 日志记录
 *
 * 架构师注：
 * - 所有键名自动添加dsq_前缀
 * - 隐私模式下优雅降级
 */
import { logger } from '../../utils/logger'

const PREFIX = 'dsq_'

/**
 * 安全存储数据
 */
export function setItem<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value)
    localStorage.setItem(PREFIX + key, serialized)
    return true
  } catch (e) {
    logger.warn(`[Storage] Failed to save ${key}:`, e)
    return false
  }
}

/**
 * 安全读取数据
 */
export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const serialized = localStorage.getItem(PREFIX + key)
    if (serialized === null) {
      return defaultValue
    }
    return JSON.parse(serialized) as T
  } catch (e) {
    logger.warn(`[Storage] Failed to load ${key}:`, e)
    return defaultValue
  }
}

/**
 * 删除数据
 */
export function removeItem(key: string): boolean {
  try {
    localStorage.removeItem(PREFIX + key)
    return true
  } catch (e) {
    logger.warn(`[Storage] Failed to remove ${key}:`, e)
    return false
  }
}

/**
 * 检查数据是否存在
 */
export function hasItem(key: string): boolean {
  try {
    return localStorage.getItem(PREFIX + key) !== null
  } catch (e) {
    return false
  }
}

/**
 * 清除所有带前缀的数据
 */
export function clearAll(): boolean {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    return true
  } catch (e) {
    logger.warn('[Storage] Failed to clear all:', e)
    return false
  }
}

/**
 * 版本化存储
 */
export function setVersionedItem<T>(key: string, version: string, value: T): boolean {
  return setItem(`${key}_${version}`, value)
}

/**
 * 版本化读取
 */
export function getVersionedItem<T>(key: string, version: string, defaultValue: T): T {
  return getItem(`${key}_${version}`, defaultValue)
}

/**
 * 迁移数据版本
 */
export function migrateVersion<T>(
  key: string,
  oldVersion: string,
  newVersion: string,
  migrator?: (oldValue: T) => T
): boolean {
  const oldValue = getVersionedItem<T>(key, oldVersion, null as unknown as T)
  if (oldValue === null) {
    return false
  }

  const newValue = migrator ? migrator(oldValue) : oldValue
  if (setVersionedItem(key, newVersion, newValue)) {
    removeItem(`${key}_${oldVersion}`)
    return true
  }
  return false
}

/**
 * 获取存储使用情况
 */
export function getStorageInfo(): { used: number; available: boolean } {
  try {
    let used = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          used += key.length + value.length
        }
      }
    }
    return { used, available: true }
  } catch (e) {
    return { used: 0, available: false }
  }
}
