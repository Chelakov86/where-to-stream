import { TMDB_BASE_URL, getTmdbApiKey } from './config';

/**
 * Interface for a single genre object from TMDB.
 */
export interface Genre {
  id: number;
  name: string;
}

/**
 * Interface for the TMDB genre list response.
 */
interface GenreListResponse {
  genres: Genre[];
}

/**
 * Custom error class for TMDB API errors.
 * Contains HTTP status information and optional response body.
 */
export class TmdbError extends Error {
  /**
   * @param status - HTTP status code
   * @param statusText - HTTP status text (e.g., "Not Found")
   * @param body - Optional response body from TMDB API
   */
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: unknown
  ) {
    super(`TMDB API error: ${status} ${statusText}`);
    this.name = 'TmdbError';

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TmdbError);
    }
  }
}

/**
 * Generic HTTP GET helper for TMDB API.
 *
 * @template T - The expected response type
 * @param path - API endpoint path (e.g., "/movie/123" or "/search/movie")
 * @param params - Optional query parameters (undefined values are filtered out)
 * @returns Promise resolving to the typed response
 * @throws {TmdbError} For non-2xx HTTP responses
 * @throws {Error} For network errors or other failures
 *
 * @example
 * ```typescript
 * interface Movie { id: number; title: string; }
 * const movie = await tmdbGet<Movie>('/movie/550');
 * ```
 *
 * @example
 * ```typescript
 * const results = await tmdbGet('/search/movie', {
 *   query: 'Inception',
 *   page: 1,
 *   year: undefined  // Will be filtered out
 * });
 * ```
 */
export async function tmdbGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  // Build URL by concatenating base URL with path
  const url = new URL(`${TMDB_BASE_URL}${path}`);

  // Add query parameters, filtering out undefined values
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Get API key from config
  const apiKey = getTmdbApiKey();

  // Make the HTTP request with Bearer token authentication
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  // Handle non-2xx responses
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // If response body is not JSON, ignore it
      body = undefined;
    }

    throw new TmdbError(response.status, response.statusText, body);
  }

  // Parse and return JSON response
  return response.json() as Promise<T>;
}

/**
 * Fetches the list of movie genres from TMDB.
 * @returns Promise resolving to an array of Genre objects.
 */
export async function getMovieGenres(): Promise<Genre[]> {
  const response = await tmdbGet<GenreListResponse>('/genre/movie/list');
  return response.genres;
}

/**
 * Fetches the list of TV show genres from TMDB.
 * @returns Promise resolving to an array of Genre objects.
 */
export async function getTvGenres(): Promise<Genre[]> {
  const response = await tmdbGet<GenreListResponse>('/genre/tv/list');
  return response.genres;
}
