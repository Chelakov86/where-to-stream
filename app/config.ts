/**
 * Configuration module for TMDB integration and application constants.
 * Centralizes environment variable validation and configuration constants.
 */

export const TMDB_BASE_URL = 'https://api.themoviedb.org/3' as const;

export const PREFERRED_COUNTRIES = Object.freeze(['DE', 'GB', 'US', 'CA'] as const);

export const CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours

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
