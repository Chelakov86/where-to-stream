import { setCache, getCache, clearCache } from '../app/cache';

describe('cache', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('getCache', () => {
    it('should return undefined for non-existent key', () => {
      const result = getCache('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should return the stored value before expiry', () => {
      setCache('test-key', 'test-value', 10);
      const result = getCache<string>('test-key');
      expect(result).toBe('test-value');
    });

    it('should return undefined for expired key', async () => {
      setCache('expired-key', 'expired-value', 1);
      
      // Wait for the cache entry to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = getCache('expired-key');
      expect(result).toBeUndefined();
    });

    it('should remove expired entry from cache', async () => {
      setCache('expired-key', 'expired-value', 1);
      
      // Wait for the cache entry to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // First call should return undefined and remove the entry
      const result1 = getCache('expired-key');
      expect(result1).toBeUndefined();
      
      // Second call should also return undefined (entry was removed)
      const result2 = getCache('expired-key');
      expect(result2).toBeUndefined();
    });
  });

  describe('setCache', () => {
    it('should store and retrieve a string value', () => {
      setCache('string-key', 'hello world', 10);
      expect(getCache<string>('string-key')).toBe('hello world');
    });

    it('should store and retrieve a number value', () => {
      setCache('number-key', 42, 10);
      expect(getCache<number>('number-key')).toBe(42);
    });

    it('should store and retrieve an object value', () => {
      const obj = { name: 'John', age: 30 };
      setCache('object-key', obj, 10);
      expect(getCache<typeof obj>('object-key')).toEqual(obj);
    });

    it('should store and retrieve an array value', () => {
      const arr = [1, 2, 3, 4, 5];
      setCache('array-key', arr, 10);
      expect(getCache<number[]>('array-key')).toEqual(arr);
    });

    it('should overwrite existing key with new value and expiry', async () => {
      // Set initial value with short TTL
      setCache('overwrite-key', 'initial-value', 1);
      
      // Immediately overwrite with new value and longer TTL
      setCache('overwrite-key', 'new-value', 10);
      
      // Wait for original TTL to pass
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should still return new value (not expired)
      const result = getCache<string>('overwrite-key');
      expect(result).toBe('new-value');
    });

    it('should handle zero or negative values gracefully', () => {
      setCache('zero-key', 0, 10);
      expect(getCache<number>('zero-key')).toBe(0);
      
      setCache('negative-key', -100, 10);
      expect(getCache<number>('negative-key')).toBe(-100);
    });

    it('should handle null and undefined values', () => {
      setCache('null-key', null, 10);
      expect(getCache<null>('null-key')).toBeNull();
      
      setCache('undefined-key', undefined, 10);
      expect(getCache<undefined>('undefined-key')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very short TTL (immediate expiry)', async () => {
      setCache('short-ttl-key', 'value', 0.1);
      
      // Wait for 200ms (should be expired)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const result = getCache('short-ttl-key');
      expect(result).toBeUndefined();
    });

    it('should maintain separate entries for different keys', () => {
      setCache('key1', 'value1', 10);
      setCache('key2', 'value2', 10);
      setCache('key3', 'value3', 10);
      
      expect(getCache<string>('key1')).toBe('value1');
      expect(getCache<string>('key2')).toBe('value2');
      expect(getCache<string>('key3')).toBe('value3');
    });
  });
});
