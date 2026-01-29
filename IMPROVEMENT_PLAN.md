# WhereToStream - Comprehensive Improvement Plan

**Generated**: 2026-01-18
**Version**: 1.0.0
**Status**: Draft

---

## Executive Summary

This document provides a comprehensive improvement plan for the WhereToStream application based on a thorough codebase analysis. The plan is organized into 4 priority levels across 10 improvement categories, with detailed implementation steps, effort estimates, and dependencies.

### Overall Assessment

**Current State**: The codebase demonstrates strong fundamentals with excellent TypeScript usage, clean architecture, and good testing practices.

**Critical Gaps**: Security hardening, error resilience, and performance optimization need immediate attention before production deployment.

**Estimated Total Effort**: 15-20 developer days across all priorities

---

## Table of Contents

1. [Priority Levels](#priority-levels)
2. [Critical Priority Tasks](#critical-priority-tasks)
3. [High Priority Tasks](#high-priority-tasks)
4. [Medium Priority Tasks](#medium-priority-tasks)
5. [Low Priority Tasks](#low-priority-tasks)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Success Metrics](#success-metrics)
8. [Risk Assessment](#risk-assessment)

---

## Priority Levels

### 🔴 Critical (P0)

**Timeline**: Immediate (Week 1)
**Impact**: Security vulnerabilities, data loss, system instability
**Effort**: 3-4 days

### 🟡 High Priority (P1)

**Timeline**: Week 2-3
**Impact**: User experience, reliability, code quality
**Effort**: 4-5 days

### 🟢 Medium Priority (P2)

**Timeline**: Week 4-6
**Impact**: Enhanced UX, better maintainability
**Effort**: 5-6 days

### 🔵 Low Priority (P3)

**Timeline**: Future iterations
**Impact**: Nice-to-have features, future-proofing
**Effort**: 3-4 days

---

## Critical Priority Tasks

### 1. Security Headers Implementation

**Priority**: 🔴 P0
**Effort**: 2 hours
**Impact**: Prevents XSS, clickjacking, MIME sniffing attacks
**Files**: `next.config.js`

#### Current State

No security headers configured, leaving application vulnerable to common web attacks.

#### Implementation Steps

1. **Add security headers to Next.js config**

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://image.tmdb.org https://www.themoviedb.org; font-src 'self'; connect-src 'self' https://api.themoviedb.org; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

2. **Test headers are applied**

```bash
# Start dev server
npm run dev

# Test headers (in separate terminal)
curl -I http://localhost:3000
```

3. **Verify CSP doesn't break functionality**
   - Test search functionality
   - Test image loading from TMDB
   - Test API calls to TMDB
   - Check browser console for CSP violations

4. **Document header choices**
   - Add comments explaining each header
   - Document why specific CSP directives are needed

#### Testing

- [ ] Verify all headers appear in response
- [ ] Test application functionality remains intact
- [ ] Use https://securityheaders.com to validate configuration
- [ ] Test in all supported browsers

#### Success Criteria

- A+ rating on securityheaders.com
- No console CSP violation errors
- All features work correctly

---

### 2. Rate Limiting Implementation

**Priority**: 🔴 P0
**Effort**: 4 hours
**Impact**: Prevents API abuse and TMDB quota exhaustion
**Files**: `app/api/search/route.ts`, `app/api/title/[type]/[id]/route.ts`, new `app/middleware.ts`

#### Current State

No rate limiting allows unlimited API requests, risking TMDB quota exhaustion and potential abuse.

#### Implementation Steps

1. **Create rate limiting utility**

```typescript
// app/utils/rateLimiter.ts

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    const resetTime = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (for proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');

  const ip = forwarded?.split(',')[0] || realIp || cfIp || 'unknown';
  return ip.trim();
}
```

2. **Apply rate limiting to search endpoint**

```typescript
// app/api/search/route.ts

import { checkRateLimit, getClientIdentifier } from '@/app/utils/rateLimiter';

export async function GET(request: Request) {
  // Rate limiting - 100 requests per 15 minutes per IP
  const identifier = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(identifier, {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  });

  if (!rateLimitResult.allowed) {
    const resetDate = new Date(rateLimitResult.resetTime);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please try again later.',
        resetTime: resetDate.toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetDate.toISOString(),
        },
      }
    );
  }

  // Add rate limit headers to successful responses
  const headers = {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
  };

  // ... existing code ...

  // Add headers to response
  return NextResponse.json(responseData, { headers });
}
```

3. **Apply rate limiting to title details endpoint**

```typescript
// app/api/title/[type]/[id]/route.ts

import { checkRateLimit, getClientIdentifier } from '@/app/utils/rateLimiter';

export async function GET(request: Request, context: { params: { type: string; id: string } }) {
  // Rate limiting - 50 requests per 15 minutes per IP (lower than search)
  const identifier = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(identifier, {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50,
  });

  if (!rateLimitResult.allowed) {
    const resetDate = new Date(rateLimitResult.resetTime);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please try again later.',
        resetTime: resetDate.toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '50',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetDate.toISOString(),
        },
      }
    );
  }

  // ... existing code ...
}
```

4. **Add rate limit handling to frontend**

```typescript
// app/hooks/useSearch.ts (add error handling)

const response = await fetch(url);

if (response.status === 429) {
  const data = await response.json();
  const retryAfter = response.headers.get('Retry-After');
  setError(`Too many requests. Please wait ${retryAfter} seconds before trying again.`);
  return;
}
```

5. **Add tests for rate limiting**

```typescript
// __tests__/utils/rateLimiter.test.ts

import { checkRateLimit } from '@/app/utils/rateLimiter';

describe('rateLimiter', () => {
  it('should allow requests within limit', () => {
    const result = checkRateLimit('test-ip', {
      windowMs: 60000,
      maxRequests: 10,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('should block requests exceeding limit', () => {
    const config = { windowMs: 60000, maxRequests: 2 };
    checkRateLimit('test-ip-2', config);
    checkRateLimit('test-ip-2', config);
    const result = checkRateLimit('test-ip-2', config);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after window expires', async () => {
    const config = { windowMs: 100, maxRequests: 1 };
    checkRateLimit('test-ip-3', config);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const result = checkRateLimit('test-ip-3', config);
    expect(result.allowed).toBe(true);
  });
});
```

#### Configuration Options

Consider making these configurable via environment variables:

```typescript
// app/config.ts

export const RATE_LIMIT_CONFIG = {
  search: {
    windowMs: parseInt(process.env.RATE_LIMIT_SEARCH_WINDOW_MS || '900000'), // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || '100'),
  },
  titleDetails: {
    windowMs: parseInt(process.env.RATE_LIMIT_TITLE_WINDOW_MS || '900000'), // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_TITLE_MAX || '50'),
  },
};
```

#### Testing

- [ ] Test rate limit enforcement
- [ ] Verify 429 responses include correct headers
- [ ] Test rate limit reset after window expires
- [ ] Test different IPs get separate limits
- [ ] Verify frontend displays rate limit errors correctly

#### Success Criteria

- Rate limits enforced on all API routes
- Proper 429 responses with retry-after headers
- Frontend gracefully handles rate limit errors
- No impact on normal usage patterns

---

### 3. Cache Memory Management

**Priority**: 🔴 P0
**Effort**: 3 hours
**Impact**: Prevents memory leaks in production
**Files**: `app/cache.ts`

#### Current State

In-memory cache grows unbounded with no eviction strategy, potentially causing memory issues.

#### Implementation Steps

1. **Implement LRU cache with size limits**

```typescript
// app/cache.ts

interface CacheEntry<T> {
  value: T;
  expiry: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

class LRUCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.startCleanupInterval();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (entry.expiry < now) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update last accessed time for LRU
    entry.lastAccessed = now;
    this.stats.hits++;
    return entry.value;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    const now = Date.now();
    const expiry = now + ttlSeconds * 1000;

    // Evict if at capacity
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

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

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

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(
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
          console.log(`Cache cleanup: removed ${cleaned} expired entries`);
          this.stats.size = this.cache.size;
        }
      },
      5 * 60 * 1000
    );
  }
}

// Singleton instance
const cacheInstance = new LRUCache(parseInt(process.env.CACHE_MAX_SIZE || '1000'));

export function getCache<T>(key: string): T | null {
  return cacheInstance.get<T>(key);
}

export function setCache<T>(key: string, value: T, ttlSeconds: number): void {
  cacheInstance.set(key, value, ttlSeconds);
}

export function deleteCache(key: string): boolean {
  return cacheInstance.delete(key);
}

export function clearCache(): void {
  cacheInstance.clear();
}

export function getCacheStats(): CacheStats {
  return cacheInstance.getStats();
}
```

2. **Add cache stats endpoint for monitoring**

```typescript
// app/api/cache-stats/route.ts

import { NextResponse } from 'next/server';
import { getCacheStats } from '@/app/cache';

export async function GET() {
  const stats = getCacheStats();

  const hitRate =
    stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
      : 0;

  return NextResponse.json({
    ...stats,
    hitRate: `${hitRate}%`,
  });
}
```

3. **Add cache configuration to environment**

```bash
# .env.example
TMDB_API_KEY=your_api_key_here

# Cache configuration (optional)
CACHE_MAX_SIZE=1000
CACHE_TTL_SECONDS=3600
```

4. **Add tests for LRU eviction**

```typescript
// __tests__/cache.test.ts

import { getCache, setCache, clearCache, getCacheStats } from '@/app/cache';

describe('Cache LRU eviction', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should evict least recently used items when full', () => {
    // Assuming max size is 1000, set it to 3 for testing
    // (You may need to make maxSize configurable for testing)

    setCache('key1', 'value1', 3600);
    setCache('key2', 'value2', 3600);
    setCache('key3', 'value3', 3600);

    // Access key1 and key2 to make them more recently used
    getCache('key1');
    getCache('key2');

    // Add key4, should evict key3 (least recently used)
    setCache('key4', 'value4', 3600);

    expect(getCache('key3')).toBeNull();
    expect(getCache('key1')).toBe('value1');
    expect(getCache('key2')).toBe('value2');
    expect(getCache('key4')).toBe('value4');
  });

  it('should track cache statistics', () => {
    setCache('key1', 'value1', 3600);
    getCache('key1'); // hit
    getCache('key2'); // miss

    const stats = getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });
});
```

#### Testing

- [ ] Test LRU eviction works correctly
- [ ] Test cleanup interval removes expired entries
- [ ] Test cache stats are accurate
- [ ] Load test with many cache entries
- [ ] Monitor memory usage under load

#### Success Criteria

- Cache size never exceeds configured maximum
- Expired entries are cleaned up automatically
- Cache hit rate > 70% for typical usage
- Memory usage stable over time

---

### 4. TMDB API Retry Mechanism

**Priority**: 🔴 P0
**Effort**: 3 hours
**Impact**: Improves reliability for transient failures
**Files**: `app/tmdbClient.ts`

#### Current State

API calls fail immediately on network errors or rate limits without retry, causing unnecessary user-facing errors.

#### Implementation Steps

1. **Add retry utility with exponential backoff**

```typescript
// app/utils/retry.ts

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, initialDelayMs, maxDelayMs, retryableStatusCodes } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      const isRetryable = isRetryableError(error, retryableStatusCodes);
      if (!isRetryable) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay;
      const totalDelay = delay + jitter;

      console.warn(
        `Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(totalDelay)}ms...`,
        { error: (error as Error).message }
      );

      await sleep(totalDelay);
    }
  }

  throw lastError!;
}

function isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean {
  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('fetch failed') || error.message.includes('network')) {
      return true;
    }

    // Check for HTTP status codes (assuming TmdbError has statusCode)
    if ('statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      return retryableStatusCodes.includes(statusCode);
    }
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

2. **Update TMDB client to use retry mechanism**

```typescript
// app/tmdbClient.ts

import { withRetry } from '@/app/utils/retry';
import { logger } from '@/app/utils/logger';

export class TmdbError extends Error {
  statusCode: number;
  statusMessage: string;

  constructor(statusCode: number, statusMessage: string, message?: string) {
    super(message || `TMDB API error: ${statusCode} ${statusMessage}`);
    this.name = 'TmdbError';
    this.statusCode = statusCode;
    this.statusMessage = statusMessage;
  }
}

async function tmdbFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getTmdbApiKey();
  const url = new URL(endpoint, TMDB_BASE_URL);
  url.searchParams.append('api_key', apiKey);

  return withRetry(
    async () => {
      try {
        const response = await fetch(url.toString(), {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new TmdbError(response.status, response.statusText, errorData.status_message);
        }

        return await response.json();
      } catch (error) {
        // Re-throw TmdbError as-is for retry logic
        if (error instanceof TmdbError) {
          throw error;
        }

        // Wrap network errors
        logger.error('TMDB API fetch error', { error, endpoint });
        throw new Error(`Network error: ${(error as Error).message}`);
      }
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      retryableStatusCodes: [429, 500, 502, 503, 504],
    }
  );
}

// Rest of the file remains the same...
```

3. **Add retry configuration to config.ts**

```typescript
// app/config.ts

export const RETRY_CONFIG = {
  maxRetries: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
  initialDelayMs: parseInt(process.env.RETRY_INITIAL_DELAY_MS || '1000'),
  maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
};
```

4. **Add tests for retry logic**

```typescript
// __tests__/utils/retry.test.ts

import { withRetry } from '@/app/utils/retry';

describe('withRetry', () => {
  it('should succeed on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const fn = jest.fn().mockRejectedValue({ statusCode: 404 });

    await expect(withRetry(fn, { maxRetries: 3, initialDelayMs: 10 })).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should give up after max retries', async () => {
    const fn = jest.fn().mockRejectedValue({ statusCode: 503 });

    await expect(withRetry(fn, { maxRetries: 2, initialDelayMs: 10 })).rejects.toMatchObject({
      statusCode: 503,
    });

    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });
});
```

#### Testing

- [ ] Test successful retry after transient failure
- [ ] Test non-retryable errors fail immediately
- [ ] Test max retries respected
- [ ] Test exponential backoff timing
- [ ] Test jitter prevents thundering herd

#### Success Criteria

- Transient errors (429, 503) automatically retry
- Non-retryable errors (404, 400) fail immediately
- Exponential backoff prevents API flooding
- User-facing error rate decreased by >80%

---

## High Priority Tasks

### 5. Request Deduplication for Autocomplete

**Priority**: 🟡 P1
**Effort**: 2 hours
**Impact**: Reduces unnecessary API calls and improves performance
**Files**: `app/hooks/useAutocomplete.ts`, `app/components/SearchForm.tsx`

#### Current State

Rapid typing triggers multiple parallel API calls, wasting resources and potentially causing race conditions.

#### Implementation Steps

1. **Add debounce utility**

```typescript
// app/utils/debounce.ts

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}
```

2. **Update useAutocomplete hook with debouncing**

```typescript
// app/hooks/useAutocomplete.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from '@/app/utils/debounce';
import type { NormalizedSearchResult } from '@/app/types';

export function useAutocomplete(enabled: boolean = true) {
  const [suggestions, setSuggestions] = useState<NormalizedSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(
    async (query: string, type: 'movie' | 'tv' | 'all') => {
      if (!enabled || !query || query.length < 2) {
        setSuggestions([]);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          query,
          type,
          mode: 'autocomplete',
        });

        const response = await fetch(`/api/search?${params}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data = await response.json();
        setSuggestions(data.results.slice(0, 5)); // Limit to 5 suggestions
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Autocomplete error:', error);
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [enabled]
  );

  // Debounced version of fetchSuggestions
  const debouncedFetch = useCallback(
    debounce((query: string, type: 'movie' | 'tv' | 'all') => {
      fetchSuggestions(query, type);
    }, 300), // 300ms debounce
    [fetchSuggestions]
  );

  const getSuggestions = useCallback(
    (query: string, type: 'movie' | 'tv' | 'all' = 'all') => {
      debouncedFetch(query, type);
    },
    [debouncedFetch]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    getSuggestions,
    clearSuggestions,
  };
}
```

3. **Add tests for debouncing**

```typescript
// __tests__/hooks/useAutocomplete.test.tsx

import { renderHook, waitFor } from '@testing-library/react';
import { useAutocomplete } from '@/app/hooks/useAutocomplete';

// Mock fetch
global.fetch = jest.fn();

describe('useAutocomplete debouncing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
  });

  it('should debounce rapid calls', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAutocomplete());

    // Rapid calls
    result.current.getSuggestions('a', 'all');
    result.current.getSuggestions('ab', 'all');
    result.current.getSuggestions('abc', 'all');

    // Fast-forward time
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      // Only the last call should have been made
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('query=abc'),
        expect.any(Object)
      );
    });

    jest.useRealTimers();
  });

  it('should cancel previous requests', async () => {
    const { result } = renderHook(() => useAutocomplete());
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

    result.current.getSuggestions('test1', 'all');

    jest.advanceTimersByTime(100);
    result.current.getSuggestions('test2', 'all');

    expect(abortSpy).toHaveBeenCalled();
  });
});
```

#### Testing

- [ ] Test debouncing delays API calls
- [ ] Test rapid typing only triggers one request
- [ ] Test AbortController cancels previous requests
- [ ] Test minimum query length enforced
- [ ] Measure API call reduction (should be >70%)

#### Success Criteria

- Autocomplete API calls reduced by >70%
- No duplicate requests for same query
- Smooth typing experience with no lag
- Previous requests properly cancelled

---

### 6. AbortController in All Hooks

**Priority**: 🟡 P1
**Effort**: 2 hours
**Impact**: Prevents race conditions and memory leaks
**Files**: `app/hooks/useSearch.ts`, `app/hooks/useGenres.ts`

#### Implementation Steps

1. **Update useSearch hook**

```typescript
// app/hooks/useSearch.ts

import { useState, useRef, useCallback } from 'react';
import type { NormalizedSearchResult, SearchParams } from '@/app/types';

export function useSearch() {
  const [results, setResults] = useState<NormalizedSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (params: SearchParams) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });

      const response = await fetch(`/api/search?${searchParams}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      setResults(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || 'An unexpected error occurred');
        setResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setTotalPages(0);
    setTotalResults(0);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    results,
    isLoading,
    error,
    totalPages,
    totalResults,
    search,
    clearResults,
  };
}
```

2. **Update useGenres hook**

```typescript
// app/hooks/useGenres.ts

import { useState, useEffect, useRef } from 'react';
import type { Genre } from '@/app/types';

export function useGenres() {
  const [movieGenres, setMovieGenres] = useState<Genre[]>([]);
  const [tvGenres, setTvGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchGenres = async () => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/genres', {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch genres');
        }

        const data = await response.json();
        setMovieGenres(data.movie || []);
        setTvGenres(data.tv || []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Failed to load genres');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenres();

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Combine and deduplicate genres
  const allGenres = Array.from(
    new Map([...movieGenres, ...tvGenres].map((genre) => [genre.id, genre])).values()
  );

  return {
    movieGenres,
    tvGenres,
    allGenres,
    isLoading,
    error,
  };
}
```

3. **Add tests**

```typescript
// __tests__/hooks/useSearch.test.tsx

import { renderHook, act } from '@testing-library/react';
import { useSearch } from '@/app/hooks/useSearch';

global.fetch = jest.fn();

describe('useSearch AbortController', () => {
  it('should abort previous request when new search starts', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.search({ query: 'test1' });
    });

    act(() => {
      result.current.search({ query: 'test2' });
    });

    expect(abortSpy).toHaveBeenCalled();
  });
});
```

#### Testing

- [ ] Test AbortController cancels previous requests
- [ ] Test cleanup on component unmount
- [ ] Test AbortError doesn't set error state
- [ ] Test multiple rapid calls handled correctly

#### Success Criteria

- All hooks use AbortController
- Previous requests cancelled when new ones start
- No race conditions in results
- Cleanup on unmount prevents memory leaks

---

### 7. Consistent Logging

**Priority**: 🟡 P1
**Effort**: 1.5 hours
**Impact**: Better debugging and monitoring
**Files**: Multiple files using `console.error`, `console.warn`

#### Implementation Steps

1. **Enhance logger utility**

```typescript
// app/utils/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

class Logger {
  private minLevel: LogLevel;

  constructor() {
    const envLevel = process.env.LOG_LEVEL || 'info';
    this.minLevel = envLevel as LogLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    const formatted = this.format(entry);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  private format(entry: LogEntry): string {
    const parts = [`[${entry.timestamp}]`, `[${entry.level.toUpperCase()}]`, entry.message];

    if (entry.context) {
      parts.push(JSON.stringify(entry.context, null, 2));
    }

    return parts.join(' ');
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
```

2. **Replace console calls** in all files

Find and replace pattern:

```bash
# Find all console.error calls
grep -r "console.error" app/ --exclude-dir=node_modules

# Find all console.warn calls
grep -r "console.warn" app/ --exclude-dir=node_modules
```

Example replacements:

```typescript
// Before
console.error('TMDB API error:', error);

// After
import { logger } from '@/app/utils/logger';
logger.error('TMDB API error', { error });
```

Key files to update:

- `app/api/search/route.ts:269`
- `app/api/title/[type]/[id]/route.ts:131,135`
- `app/components/ErrorBoundary.tsx:47`
- `app/utils/searchHistory.ts:61,106,119,135,157`

#### Testing

- [ ] Verify all console calls replaced
- [ ] Test log levels work correctly
- [ ] Test context objects logged properly
- [ ] Verify production logging minimal

#### Success Criteria

- Zero direct console.\* calls in codebase
- Consistent log format across application
- Log level configurable via environment
- Easier integration with external logging services

---

## Medium Priority Tasks

### 8. Loading Skeletons for Better UX

**Priority**: 🟢 P2
**Effort**: 3 hours
**Impact**: Improved perceived performance
**Files**: `app/components/ResultsList.tsx`, `app/components/ResultDetails.tsx`, new skeleton components

#### Current State

Components show simple "Loading..." text, causing jarring transitions.

#### Implementation Steps

1. **Create skeleton component library**

```typescript
// app/components/Skeleton.tsx

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-700';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: '',
  };

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
};

// ResultItem skeleton
export const ResultItemSkeleton: React.FC = () => (
  <div className="flex gap-4 p-4 bg-gray-800 rounded-lg">
    <Skeleton variant="rectangular" width={100} height={150} />
    <div className="flex-1 space-y-3">
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="text" width="40%" height={16} />
      <Skeleton variant="text" width="100%" height={40} />
      <Skeleton variant="text" width="30%" height={16} />
    </div>
  </div>
);

// ResultDetails skeleton
export const ResultDetailsSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex gap-6">
      <Skeleton variant="rectangular" width={300} height={450} />
      <div className="flex-1 space-y-4">
        <Skeleton variant="text" width="70%" height={32} />
        <Skeleton variant="text" width="50%" height={20} />
        <Skeleton variant="text" width="100%" height={100} />
      </div>
    </div>
    <div className="space-y-4">
      <Skeleton variant="text" width={200} height={24} />
      <Skeleton variant="rectangular" width="100%" height={300} />
    </div>
  </div>
);
```

2. **Use skeletons in components**

```typescript
// app/components/ResultsList.tsx

import { ResultItemSkeleton } from './Skeleton';

export default function ResultsList({ results, isLoading }: ResultsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <ResultItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  // ... rest of component
}
```

#### Success Criteria

- Smooth loading transitions
- Skeletons match actual content layout
- Better perceived performance

---

### 9. Image Optimization with Next.js Image

**Priority**: 🟢 P2
**Effort**: 2 hours
**Impact**: Faster page loads, better Core Web Vitals
**Files**: `app/components/ResultDetails.tsx`, `app/components/ResultItem.tsx`

#### Implementation Steps

1. **Replace img tags with Next.js Image**

```typescript
// app/components/ResultDetails.tsx

import Image from 'next/image';

// Before
<img src={posterUrl} alt={title} className="w-full rounded-lg" />

// After
<Image
  src={posterUrl}
  alt={title}
  width={300}
  height={450}
  className="rounded-lg"
  priority={true}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Generate placeholder
/>
```

2. **Configure image domains in next.config.js**

```javascript
// next.config.js

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
};
```

3. **Add image loading states**

```typescript
const [imageLoading, setImageLoading] = useState(true);

<Image
  onLoadingComplete={() => setImageLoading(false)}
  className={imageLoading ? 'blur-sm' : ''}
/>
```

#### Success Criteria

- All images use Next.js Image component
- Automatic image optimization
- Improved Lighthouse scores
- Lazy loading by default

---

### 10. Enhanced Error Messages

**Priority**: 🟢 P2
**Effort**: 2 hours
**Impact**: Better user understanding of errors
**Files**: All hooks and API routes

#### Implementation Steps

1. **Create error message mapping**

```typescript
// app/utils/errorMessages.ts

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection and try again.',
  RATE_LIMIT: 'Too many requests. Please wait a moment before trying again.',
  NOT_FOUND: "We couldn't find what you're looking for.",
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
  TIMEOUT: 'Request took too long. Please try again.',
  INVALID_INPUT: 'Please check your input and try again.',
  TMDB_ERROR: 'Unable to fetch data from TMDB. Please try again later.',
} as const;

export function getErrorMessage(error: unknown): string {
  if (error instanceof TmdbError) {
    if (error.statusCode === 404) return ERROR_MESSAGES.NOT_FOUND;
    if (error.statusCode === 429) return ERROR_MESSAGES.RATE_LIMIT;
    if (error.statusCode >= 500) return ERROR_MESSAGES.SERVER_ERROR;
    return ERROR_MESSAGES.TMDB_ERROR;
  }

  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch failed')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (error.message.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT;
    }
  }

  return ERROR_MESSAGES.SERVER_ERROR;
}
```

2. **Use in hooks**

```typescript
// app/hooks/useSearch.ts

import { getErrorMessage } from '@/app/utils/errorMessages';

catch (err) {
  setError(getErrorMessage(err));
}
```

#### Success Criteria

- Context-specific error messages
- User-friendly language
- Actionable guidance when possible

---

### 11. Accessibility Enhancements

**Priority**: 🟢 P2
**Effort**: 3 hours
**Impact**: Better screen reader support and keyboard navigation
**Files**: `app/layout.tsx`, `app/components/SearchForm.tsx`, `app/components/ResultDetails.tsx`

#### Implementation Steps

1. **Add skip navigation link**

```typescript
// app/layout.tsx

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="container mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

2. **Add ARIA live regions for dynamic content**

```typescript
// app/page.tsx

<div aria-live="polite" aria-atomic="true" className="sr-only">
  {isLoading && 'Loading search results'}
  {results.length > 0 && `Found ${totalResults} results`}
  {error && error}
</div>
```

3. **Improve autocomplete ARIA**

```typescript
// app/components/SearchForm.tsx

<input
  role="combobox"
  aria-expanded={showSuggestions}
  aria-autocomplete="list"
  aria-controls="autocomplete-list"
  aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined}
/>

<ul id="autocomplete-list" role="listbox">
  {suggestions.map((suggestion, index) => (
    <li
      key={suggestion.id}
      id={`suggestion-${index}`}
      role="option"
      aria-selected={highlightedIndex === index}
    >
      {suggestion.title}
    </li>
  ))}
</ul>
```

#### Success Criteria

- All interactive elements keyboard accessible
- Screen reader friendly
- ARIA labels where appropriate
- Focus management for dynamic content

---

### 12. Bundle Size Optimization

**Priority**: 🟢 P2
**Effort**: 2 hours
**Impact**: Faster initial page loads
**Files**: `next.config.js`, package.json

#### Implementation Steps

1. **Add bundle analyzer**

```bash
npm install --save-dev @next/bundle-analyzer
```

```javascript
// next.config.js

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

2. **Add script to package.json**

```json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build"
  }
}
```

3. **Implement code splitting for heavy components**

```typescript
// app/page.tsx

import dynamic from 'next/dynamic';

const ResultDetails = dynamic(() => import('./components/ResultDetails'), {
  loading: () => <ResultDetailsSkeleton />,
  ssr: false,
});
```

4. **Tree-shake unused exports**

Review and remove unused imports/exports throughout codebase.

#### Success Criteria

- Bundle size documented and monitored
- Main bundle < 200KB gzipped
- Dynamic imports for heavy components
- No duplicate dependencies

---

## Low Priority Tasks

### 13. React 19 Upgrade

**Priority**: 🔵 P3
**Effort**: 4 hours
**Impact**: Access to latest React features
**Dependencies**: package.json

#### Implementation Steps

1. **Update dependencies**

```bash
npm install react@19 react-dom@19
npm install --save-dev @types/react@19 @types/react-dom@19
```

2. **Review breaking changes**

- Check React 19 migration guide
- Update deprecated APIs
- Test all components

3. **Update TypeScript types**

- Fix type errors from React 19
- Update component prop types

4. **Test thoroughly**

- Run all unit tests
- Run E2E tests
- Manual testing of all features

#### Success Criteria

- All tests passing
- No console warnings
- All features working correctly

---

### 14. Pre-commit Hooks

**Priority**: 🔵 P3
**Effort**: 1.5 hours
**Impact**: Automated code quality
**Files**: New `.husky/`, `package.json`

#### Implementation Steps

1. **Install Husky and lint-staged**

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

2. **Configure lint-staged**

```json
// package.json

{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

3. **Add prepare script**

```json
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

#### Success Criteria

- Hooks run on commit
- Code automatically formatted
- Linting enforced

---

### 15. Docker Configuration

**Priority**: 🔵 P3
**Effort**: 3 hours
**Impact**: Consistent deployment
**Files**: New `Dockerfile`, `docker-compose.yml`, `.dockerignore`

#### Implementation Steps

1. **Create Dockerfile**

```dockerfile
# Dockerfile

FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

2. **Create docker-compose.yml**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - TMDB_API_KEY=${TMDB_API_KEY}
    restart: unless-stopped
```

3. **Create .dockerignore**

```
node_modules
.next
.git
*.md
.env*
!.env.example
```

#### Success Criteria

- Docker build succeeds
- Container runs successfully
- Environment variables work
- Volume mounting for development

---

### 16. API Documentation with OpenAPI

**Priority**: 🔵 P3
**Effort**: 3 hours
**Impact**: Better API discoverability
**Files**: New `openapi.yaml`

#### Implementation Steps

1. **Create OpenAPI specification**

```yaml
# openapi.yaml

openapi: 3.0.0
info:
  title: WhereToStream API
  version: 1.0.0
  description: API for searching movie and TV show streaming availability

paths:
  /api/search:
    get:
      summary: Search for movies and TV shows
      parameters:
        - name: query
          in: query
          required: true
          schema:
            type: string
        - name: type
          in: query
          schema:
            type: string
            enum: [movie, tv, all]
            default: all
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SearchResponse'
        '400':
          description: Bad request
        '429':
          description: Rate limit exceeded

  /api/title/{type}/{id}:
    get:
      summary: Get title details
      parameters:
        - name: type
          in: path
          required: true
          schema:
            type: string
            enum: [movie, tv]
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Successful response
        '404':
          description: Title not found

components:
  schemas:
    SearchResponse:
      type: object
      properties:
        page:
          type: integer
        totalPages:
          type: integer
        totalResults:
          type: integer
        results:
          type: array
          items:
            $ref: '#/components/schemas/SearchResult'
```

2. **Add Swagger UI for development**

```bash
npm install --save-dev swagger-ui-react
```

#### Success Criteria

- Complete API specification
- Swagger UI accessible in dev mode
- Examples for all endpoints

---

### 17. Centralized State Management

**Priority**: 🔵 P3
**Effort**: 4 hours
**Impact**: Simplified state management
**Files**: New `app/store/`, multiple components

#### Implementation Steps

1. **Install Zustand**

```bash
npm install zustand
```

2. **Create search store**

```typescript
// app/store/searchStore.ts

import { create } from 'zustand';
import type { NormalizedSearchResult, SearchParams } from '@/app/types';

interface SearchState {
  results: NormalizedSearchResult[];
  isLoading: boolean;
  error: string | null;
  totalPages: number;
  totalResults: number;
  currentParams: SearchParams | null;

  setResults: (results: NormalizedSearchResult[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setTotals: (totalPages: number, totalResults: number) => void;
  setParams: (params: SearchParams) => void;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  results: [],
  isLoading: false,
  error: null,
  totalPages: 0,
  totalResults: 0,
  currentParams: null,

  setResults: (results) => set({ results }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setTotals: (totalPages, totalResults) => set({ totalPages, totalResults }),
  setParams: (params) => set({ currentParams: params }),
  clearResults: () =>
    set({
      results: [],
      totalPages: 0,
      totalResults: 0,
      error: null,
    }),
}));
```

3. **Refactor components to use store**

```typescript
// app/page.tsx

import { useSearchStore } from '@/app/store/searchStore';

export default function Home() {
  const { results, isLoading, error } = useSearchStore();

  // Simplified component without prop drilling
}
```

#### Success Criteria

- Reduced prop drilling
- Centralized state logic
- Easier testing
- Better performance with selective subscriptions

---

### 18. Performance Monitoring

**Priority**: 🔵 P3
**Effort**: 2 hours
**Impact**: Visibility into production performance
**Files**: `app/layout.tsx`, new monitoring setup

#### Implementation Steps

1. **Add Web Vitals reporting**

```typescript
// app/web-vitals.ts

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals() {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}
```

```typescript
// app/layout.tsx

'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to analytics service
    console.log(metric);
  });

  return null;
}
```

2. **Optional: Add Sentry for error tracking**

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### Success Criteria

- Web Vitals tracked
- Performance metrics visible
- Error tracking configured (optional)

---

### 19. Offline Support

**Priority**: 🔵 P3
**Effort**: 4 hours
**Impact**: Better UX when offline
**Files**: New service worker, manifest

#### Implementation Steps

1. **Add PWA support with next-pwa**

```bash
npm install next-pwa
```

2. **Configure next-pwa**

```javascript
// next.config.js

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA(nextConfig);
```

3. **Create manifest.json**

```json
{
  "name": "WhereToStream",
  "short_name": "WhereToStream",
  "description": "Find where to stream movies and TV shows",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#111827",
  "theme_color": "#06b6d4",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

4. **Add offline fallback page**

```typescript
// app/offline/page.tsx

export default function Offline() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold mb-4">You're offline</h1>
      <p>Please check your internet connection</p>
    </div>
  );
}
```

#### Success Criteria

- App installable as PWA
- Offline page shows when disconnected
- Basic caching for visited pages

---

### 20. CI/CD Pipeline

**Priority**: 🔵 P3
**Effort**: 3 hours
**Impact**: Automated testing and deployment
**Files**: New `.github/workflows/`

#### Implementation Steps

1. **Create GitHub Actions workflow**

```yaml
# .github/workflows/ci.yml

name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Build
        run: npm run build
        env:
          TMDB_API_KEY: ${{ secrets.TMDB_API_KEY }}

  e2e:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TMDB_API_KEY: ${{ secrets.TMDB_API_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

2. **Add deployment workflow**

```yaml
# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

#### Success Criteria

- CI runs on all PRs
- Automated testing
- Automated deployment to staging/production

---

## Implementation Roadmap

### Week 1: Critical Priority (P0)

**Days 1-2: Security & Rate Limiting**

- [ ] Task 1: Security Headers (2h)
- [ ] Task 2: Rate Limiting (4h)
- [ ] Testing and validation (2h)

**Days 3-4: Performance & Reliability**

- [ ] Task 3: Cache Memory Management (3h)
- [ ] Task 4: TMDB API Retry Mechanism (3h)
- [ ] Integration testing (2h)

**Day 5: Testing & Documentation**

- [ ] Write comprehensive tests for P0 tasks
- [ ] Update documentation
- [ ] Code review and refinements

**Deliverables:**

- Production-ready security implementation
- Rate limiting active on all endpoints
- Stable cache with LRU eviction
- Retry logic for transient failures

---

### Week 2-3: High Priority (P1)

**Week 2: Code Quality**

- [ ] Task 5: Request Deduplication (2h)
- [ ] Task 6: AbortController in Hooks (2h)
- [ ] Task 7: Consistent Logging (1.5h)
- [ ] Testing (2h)
- [ ] Task 8: Dependency Updates Planning (2h)

**Week 3: Implementation & Testing**

- [ ] React 19 upgrade (if approved)
- [ ] Comprehensive testing
- [ ] Performance validation
- [ ] Documentation updates

**Deliverables:**

- Reduced API calls by >70%
- All hooks using AbortController
- Unified logging system
- Updated dependencies

---

### Week 4-6: Medium Priority (P2)

**Week 4: UX Improvements**

- [ ] Task 8: Loading Skeletons (3h)
- [ ] Task 9: Image Optimization (2h)
- [ ] Task 10: Enhanced Error Messages (2h)
- [ ] Testing and refinement (1h)

**Week 5: Accessibility & Performance**

- [ ] Task 11: Accessibility Enhancements (3h)
- [ ] Task 12: Bundle Size Optimization (2h)
- [ ] Accessibility testing (2h)
- [ ] Performance benchmarking (1h)

**Week 6: Polish & Testing**

- [ ] E2E test updates
- [ ] Visual regression testing
- [ ] Performance monitoring
- [ ] Documentation

**Deliverables:**

- Improved perceived performance
- Better accessibility scores
- Optimized bundle size
- Enhanced error messaging

---

### Future Iterations: Low Priority (P3)

**Phase 1: Developer Experience**

- [ ] Task 14: Pre-commit Hooks
- [ ] Task 15: Docker Configuration
- [ ] Task 16: API Documentation
- [ ] Task 20: CI/CD Pipeline

**Phase 2: Advanced Features**

- [ ] Task 17: Centralized State Management
- [ ] Task 18: Performance Monitoring
- [ ] Task 19: Offline Support

**Phase 3: Optimization**

- [ ] Task 13: React 19 Upgrade (if not done in P1)
- [ ] Additional performance optimizations
- [ ] Advanced monitoring setup

---

## Success Metrics

### Critical Priority (P0) Success Metrics

**Security:**

- [ ] A+ rating on securityheaders.com
- [ ] Zero CSP violations in production
- [ ] Rate limiting active with <0.1% false positives

**Performance:**

- [ ] Cache hit rate >70%
- [ ] Memory usage stable over 24h
- [ ] API retry reduces user-facing errors by >80%

### High Priority (P1) Success Metrics

**Code Quality:**

- [ ] Autocomplete API calls reduced >70%
- [ ] Zero race conditions in testing
- [ ] All logging centralized
- [ ] Test coverage maintained >80%

### Medium Priority (P2) Success Metrics

**User Experience:**

- [ ] Lighthouse Performance score >90
- [ ] Lighthouse Accessibility score >95
- [ ] Bundle size <200KB gzipped
- [ ] Error messages user-tested

### Low Priority (P3) Success Metrics

**Infrastructure:**

- [ ] Docker build time <5 minutes
- [ ] CI/CD pipeline <10 minutes
- [ ] PWA installable on all platforms
- [ ] Web Vitals in "Good" range

---

## Risk Assessment

### High Risk Items

**1. React 19 Upgrade**

- **Risk**: Breaking changes, test failures
- **Mitigation**: Thorough testing, gradual rollout, maintain fallback branch
- **Contingency**: Delay to future iteration if issues found

**2. Security Headers**

- **Risk**: CSP might break functionality
- **Mitigation**: Extensive testing, gradual header rollout
- **Contingency**: Loosen CSP directives if needed

**3. Rate Limiting**

- **Risk**: False positives blocking legitimate users
- **Mitigation**: Conservative limits, monitoring, adjustment capability
- **Contingency**: Ability to disable quickly if issues arise

### Medium Risk Items

**1. Cache Memory Management**

- **Risk**: LRU eviction might impact hit rate
- **Mitigation**: Tune max size based on monitoring
- **Contingency**: Increase cache size if needed

**2. State Management Migration**

- **Risk**: Regression in component behavior
- **Mitigation**: Incremental migration, comprehensive testing
- **Contingency**: Keep old state management temporarily

### Low Risk Items

**1. Loading Skeletons**

- **Risk**: Minimal - purely visual enhancement
- **Mitigation**: User testing
- **Contingency**: Easy to revert

**2. Pre-commit Hooks**

- **Risk**: Developer friction
- **Mitigation**: Clear documentation, skip option for emergencies
- **Contingency**: Make optional

---

## Dependencies & Blockers

### External Dependencies

1. **TMDB API Stability**
   - Critical for all tasks
   - Monitor TMDB API status
   - Plan for degraded functionality

2. **React 19 Release Stability**
   - Wait for stable release
   - Monitor community feedback
   - Check library compatibility

### Internal Dependencies

1. **Task Dependencies:**
   - Task 7 (Logging) → Should complete before Task 4 (Retry)
   - Task 8 (Skeletons) → Depends on component structure stability
   - Task 17 (State Management) → Should wait until P0-P1 complete

2. **Resource Dependencies:**
   - Testing environment must be stable
   - TMDB API key required for all testing
   - CI/CD requires repository access configuration

---

## Maintenance Plan

### Post-Implementation

**Week 1-2 After Launch:**

- Monitor error rates daily
- Check cache hit rates
- Review rate limit false positives
- Gather user feedback

**Monthly:**

- Review bundle size trends
- Check dependency updates
- Monitor Web Vitals
- Review security headers effectiveness

**Quarterly:**

- Comprehensive performance audit
- Accessibility audit
- Security review
- Dependency major version updates

---

## Rollback Procedures

### Critical Tasks (P0)

**Security Headers:**

```bash
# Revert next.config.js headers
git revert <commit-hash>
npm run build && npm start
```

**Rate Limiting:**

```typescript
// Emergency disable
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false';
```

**Cache:**

```bash
# Revert to simple cache
git revert <commit-hash>
# Clear existing cache
# Restart application
```

### Rollback Decision Criteria

Initiate rollback if:

- Error rate increases >50%
- User complaints >10 within 1 hour
- Critical functionality broken
- Security vulnerability introduced

---

## Conclusion

This comprehensive improvement plan provides a structured approach to enhancing the WhereToStream application across security, performance, user experience, and maintainability.

**Key Priorities:**

1. **Week 1**: Security hardening and performance stability (P0)
2. **Week 2-3**: Code quality and reliability (P1)
3. **Week 4-6**: User experience enhancements (P2)
4. **Future**: Infrastructure and advanced features (P3)

**Expected Outcomes:**

- Production-ready security
- 80% reduction in API errors
- 70% reduction in unnecessary API calls
- Improved Lighthouse scores (>90 Performance, >95 Accessibility)
- Better developer experience with automated tooling

**Next Steps:**

1. Review and approve this plan
2. Set up project tracking (GitHub Issues/Projects)
3. Begin Week 1 implementation
4. Schedule regular progress reviews

---

**Document Status**: Ready for Review
**Last Updated**: 2026-01-18
**Version**: 1.0.0
