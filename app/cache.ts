interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Stores a value in the cache with a TTL (Time To Live)
 * @param key - The cache key
 * @param value - The value to store
 * @param ttlSeconds - Time to live in seconds
 */
export function setCache<T>(key: string, value: T, ttlSeconds: number): void {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cache.set(key, { value, expiresAt });
}

/**
 * Retrieves a value from the cache
 * @param key - The cache key
 * @returns The cached value or undefined if not found or expired
 */
export function getCache<T>(key: string): T | undefined {
  const entry = cache.get(key);

  if (!entry) {
    return undefined;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }

  return entry.value as T;
}

/**
 * Clears all entries from the cache
 */
export function clearCache(): void {
  cache.clear();
}
