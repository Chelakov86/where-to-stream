/**
 * Configuration module for TMDB integration and application constants.
 * Centralizes environment variable validation and configuration constants.
 */

export const TMDB_BASE_URL = 'https://api.themoviedb.org/3' as const;

/**
 * Countries pinned to the top of the country picker and comparison view until the
 * user chooses their own pins.
 */
export const PREFERRED_COUNTRIES = Object.freeze(['DE', 'GB', 'US', 'CA'] as const);

/** Country used before the user's country is known. */
export const DEFAULT_COUNTRY = 'US' as const;

export const CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours

/** How long a client-fetched API response is reused (e.g. when navigating back). */
export const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;

/** Maximum entries kept in the client response cache before it is cleared. */
export const MAX_CLIENT_CACHE_ENTRIES = 100;

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
