/**
 * Rate limiting utility to prevent API abuse
 * Uses in-memory storage with automatic cleanup
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
}

export interface RateLimitResult {
  allowed: boolean; // Whether the request is allowed
  remaining: number; // Remaining requests in current window
  resetTime: number; // Timestamp when the window resets
}

interface RateLimitEntry {
  count: number; // Current request count
  resetTime: number; // When this entry expires
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate limited
 * @param identifier Unique identifier for the client (e.g., IP address)
 * @param config Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No existing entry or entry has expired - create new one
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // Rate limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count and allow request
  entry.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Extract client identifier from request
 * Tries multiple headers to support various proxy configurations
 * @param request HTTP request object
 * @returns Client IP address or 'unknown'
 */
export function getClientIdentifier(request: Request): string {
  // Handle cases where headers might not be available (e.g., in tests)
  if (!request.headers || typeof request.headers.get !== 'function') {
    return 'test-client';
  }

  // Try to get IP from various headers (for reverse proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');

  // x-forwarded-for can contain multiple IPs, take the first one
  const ip = forwarded?.split(',')[0] || realIp || cfIp || 'unknown';

  return ip.trim();
}

/**
 * Get current rate limit statistics (for monitoring)
 * @returns Current store size and active entries
 */
export function getRateLimitStats(): {
  totalEntries: number;
  activeEntries: number;
} {
  const now = Date.now();
  let activeEntries = 0;

  for (const entry of rateLimitStore.values()) {
    if (entry.resetTime > now) {
      activeEntries++;
    }
  }

  return {
    totalEntries: rateLimitStore.size,
    activeEntries,
  };
}

/**
 * Clear all rate limit entries (for testing purposes)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}
