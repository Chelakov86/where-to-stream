/**
 * Configuration module for TMDB integration and application constants.
 * Centralizes environment variable validation and configuration constants.
 */

export const TMDB_BASE_URL = 'https://api.themoviedb.org/3' as const;

/**
 * @deprecated No longer used. User's country is now automatically detected via HTTP headers.
 * See app/utils/countryDetection.ts for the new implementation.
 * This constant is kept for reference only and will be removed in a future version.
 */
export const PREFERRED_COUNTRIES = Object.freeze(['DE', 'GB', 'US', 'CA'] as const);

export const CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours

/**
 * Rate limit configuration per API route (requests per window per client).
 */
export const RATE_LIMIT_CONFIG = Object.freeze({
  search: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  title: { windowMs: 15 * 60 * 1000, maxRequests: 50 },
  providers: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  genres: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
} as const);

/**
 * Retrieves the TMDB API key from environment variables.
 * @throws {Error} If TMDB_API_KEY is not set or is empty
 * @returns {string} The TMDB API key
 */
export function getTmdbApiKey(): string {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('TMDB_API_KEY is not set');
  }

  return apiKey;
}
