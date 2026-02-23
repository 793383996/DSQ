interface ICacheEntry<V> {
  key: string
  value: V
  timestamp: number
  prev: ICacheEntry<V> | null
  next: ICacheEntry<V> | null
}

export class LRUCache<K, V> {
  private cache: Map<K, ICacheEntry<V>> = new Map()
  private head: ICacheEntry<V> | null = null
  private tail: ICacheEntry<V> | null = null
  private maxSize: number
  private maxAge: number

  constructor(maxSize: number = 100, maxAge: number = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.maxAge = maxAge
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) {
      return undefined
    }

    if (Date.now() - entry.timestamp > this.maxAge) {
      this.delete(key)
      return undefined
    }

    this.moveToHead(entry)
    return entry.value
  }

  set(key: K, value: V): void {
    const existingEntry = this.cache.get(key)

    if (existingEntry) {
      existingEntry.value = value
      existingEntry.timestamp = Date.now()
      this.moveToHead(existingEntry)
      return
    }

    if (this.cache.size >= this.maxSize) {
      this.evictTail()
    }

    const entry: ICacheEntry<V> = {
      key: String(key),
      value,
      timestamp: Date.now(),
      prev: null,
      next: this.head
    }

    if (this.head) {
      this.head.prev = entry
    }
    this.head = entry

    if (!this.tail) {
      this.tail = entry
    }

    this.cache.set(key, entry)
  }

  delete(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    this.removeEntry(entry)
    this.cache.delete(key)
    return true
  }

  clear(): void {
    this.cache.clear()
    this.head = null
    this.tail = null
  }

  size(): number {
    return this.cache.size
  }

  private moveToHead(entry: ICacheEntry<V>): void {
    if (entry === this.head) {
      return
    }

    this.removeEntry(entry)
    entry.next = this.head
    entry.prev = null

    if (this.head) {
      this.head.prev = entry
    }
    this.head = entry

    if (!this.tail) {
      this.tail = entry
    }
  }

  private removeEntry(entry: ICacheEntry<V>): void {
    if (entry.prev) {
      entry.prev.next = entry.next
    } else {
      this.head = entry.next
    }

    if (entry.next) {
      entry.next.prev = entry.prev
    } else {
      this.tail = entry.prev
    }
  }

  private evictTail(): void {
    if (!this.tail) {
      return
    }

    const keyToRemove = this.tail.key
    this.removeEntry(this.tail)
    this.cache.delete(keyToRemove as unknown as K)
  }
}

export function createHashKey(data: unknown): string {
  const json = JSON.stringify(data)
  if (!json) {
    return '0'
  }
  let hash = 0
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return String(hash >>> 0)
}
