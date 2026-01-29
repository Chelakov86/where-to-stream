/**
 * LRU (Least Recently Used) Cache with TTL and memory management
 * Prevents memory leaks by enforcing max size and automatic cleanup
 */

interface CacheEntry<T> {
  value: T;
  expiry: number; // Timestamp when entry expires
  lastAccessed: number; // Timestamp of last access (for LRU)
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

class LRUCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.cleanupInterval = this.startCleanupInterval();
  }

  /**
   * Get value from cache
   * Updates last accessed time for LRU tracking
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();

    // Check if expired
    if (entry.expiry < now) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return null;
    }

    // Update last accessed time for LRU
    entry.lastAccessed = now;
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache with TTL
   * Evicts LRU entry if at capacity
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    const now = Date.now();
    const expiry = now + ttlSeconds * 1000;

    // Evict if at capacity and key doesn't already exist
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiry,
      lastAccessed: now,
    });

    this.stats.size = this.cache.size;
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }

  /**
   * Get current cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Evict least recently used entry
   * @private
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Periodically clean up expired entries
   * @private
   */
  private startCleanupInterval(): NodeJS.Timeout {
    return setInterval(
      () => {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
          if (entry.expiry < now) {
            this.cache.delete(key);
            cleaned++;
          }
        }

        if (cleaned > 0) {
          console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
          this.stats.size = this.cache.size;
        }
      },
      5 * 60 * 1000
    ); // Run every 5 minutes
  }

  /**
   * Stop cleanup interval (for testing/cleanup)
   */
  stopCleanup(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton cache instance
// Max size can be configured via environment variable
const cacheInstance = new LRUCache(parseInt(process.env.CACHE_MAX_SIZE || '1000', 10));

/**
 * Get value from cache
 * @param key - Cache key
 * @returns Cached value or null if not found/expired
 */
export function getCache<T>(key: string): T | null {
  return cacheInstance.get<T>(key);
}

/**
 * Set value in cache with TTL
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - Time to live in seconds
 */
export function setCache<T>(key: string, value: T, ttlSeconds: number): void {
  cacheInstance.set(key, value, ttlSeconds);
}

/**
 * Delete a specific cache entry
 * @param key - Cache key to delete
 * @returns true if deleted, false if not found
 */
export function deleteCache(key: string): boolean {
  return cacheInstance.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  cacheInstance.clear();
}

/**
 * Get cache statistics (hits, misses, evictions, size)
 * Useful for monitoring and debugging
 */
export function getCacheStats(): CacheStats {
  return cacheInstance.getStats();
}

/**
 * Stop cleanup interval (for testing)
 */
export function stopCacheCleanup(): void {
  cacheInstance.stopCleanup();
}
