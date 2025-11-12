/**
 * Shared utilities for TMDB API integration.
 * Centralizes common functions used across multiple modules.
 */

export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Image size options for TMDB images.
 */
export type TmdbImageSize =
  | 'w92'
  | 'w154'
  | 'w185'
  | 'w200'
  | 'w342'
  | 'w500'
  | 'w780'
  | 'original';

/**
 * Extracts year from a date string (YYYY-MM-DD format).
 * Returns undefined if the date string is invalid or too short.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Year as number, or undefined if invalid
 *
 * @example
 * ```typescript
 * getYear('2020-01-15') // 2020
 * getYear('1999-12-31') // 1999
 * getYear('invalid') // undefined
 * ```
 */
export function getYear(dateString?: string): number | undefined {
  if (!dateString || dateString.length < 4) return undefined;
  try {
    return new Date(dateString).getFullYear();
  } catch {
    return undefined;
  }
}

/**
 * Builds a TMDB image URL from a poster path.
 * Returns undefined if the poster path is null or empty.
 *
 * @param posterPath - Poster path from TMDB (e.g., "/abc123.jpg" or null)
 * @param size - Image size (default: 'w500')
 * @returns Full image URL or undefined if no poster path
 *
 * @example
 * ```typescript
 * buildTmdbImageUrl('/abc123.jpg', 'w500')
 * // 'https://image.tmdb.org/t/p/w500/abc123.jpg'
 *
 * buildTmdbImageUrl(null) // undefined
 * ```
 */
export function buildTmdbImageUrl(
  posterPath: string | null | undefined,
  size: TmdbImageSize = 'w500'
): string | undefined {
  if (!posterPath) return undefined;
  return `${TMDB_IMAGE_BASE_URL}/${size}${posterPath}`;
}
