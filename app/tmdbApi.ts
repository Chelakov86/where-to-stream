/**
 * TMDB API - Domain-specific methods for movies, TV shows, genres, and watch providers.
 *
 * This module provides high-level functions that wrap the low-level tmdbGet helper
 * with proper typing and endpoint paths for common TMDB operations.
 */

import { tmdbGet } from './tmdbClient';
import {
  TmdbSearchResponse,
  TmdbMovieDetails,
  TmdbTvDetails,
  TmdbWatchProvidersResponse,
  TmdbGenreList,
  TmdbDiscoverResponse,
  TmdbProviderListResponse,
} from './tmdbTypes';
import { getCache, setCache } from './cache';
import { CACHE_TTL_SECONDS } from './config';

/**
 * Generates a stable cache key from an object by sorting keys before stringifying.
 * This ensures that objects with the same properties in different orders produce the same key.
 *
 * @param prefix - Cache key prefix (e.g., "search:movie")
 * @param params - Object to serialize for the cache key
 * @returns Stable cache key string
 *
 * @example
 * ```typescript
 * generateCacheKey('search:movie', { query: 'test', page: 1 })
 * // 'search:movie:{"page":1,"query":"test"}'
 * ```
 */
function generateCacheKey(
  prefix: string,
  params:
    | Record<string, unknown>
    | SearchMoviesParams
    | SearchTvParams
    | DiscoverMoviesParams
    | DiscoverTvParams
): string {
  // Sort keys to ensure stable ordering
  const sortedParams: Record<string, unknown> = {};
  const keys = Object.keys(params).sort();
  for (const key of keys) {
    sortedParams[key] = (params as Record<string, unknown>)[key];
  }
  return `${prefix}:${JSON.stringify(sortedParams)}`;
}

/**
 * Search parameters for movie search
 */
export interface SearchMoviesParams {
  query: string;
  page?: number;
  year?: number;
  language?: string;
  withGenres?: string;
  voteAverageGte?: number;
}

/**
 * Search parameters for TV show search
 */
export interface SearchTvParams {
  query: string;
  page?: number;
  firstAirDateYear?: number;
  language?: string;
  withGenres?: string;
  voteAverageGte?: number;
}

/**
 * Discover parameters for movie discovery
 */
export interface DiscoverMoviesParams {
  page?: number;
  year?: number;
  language?: string;
  withGenres?: string;
  withWatchProviders?: string;
  watchRegion?: string;
}

/**
 * Discover parameters for TV show discovery
 */
export interface DiscoverTvParams {
  page?: number;
  firstAirDateYear?: number;
  language?: string;
  withGenres?: string;
  withWatchProviders?: string;
  watchRegion?: string;
}

/**
 * Search for movies by query with optional filters.
 *
 * @param params - Search parameters including query and optional filters
 * @returns Promise resolving to search results with pagination info
 *
 * @example
 * ```typescript
 * const results = await searchMovies({
 *   query: 'Inception',
 *   year: 2010,
 *   voteAverageGte: 7.5
 * });
 * ```
 */
export async function searchMovies(params: SearchMoviesParams): Promise<TmdbSearchResponse> {
  const cacheKey = generateCacheKey('search:movie', params);
  const cached = getCache<TmdbSearchResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbSearchResponse>('/search/movie', {
    query: params.query,
    page: params.page,
    year: params.year,
    language: params.language,
    with_genres: params.withGenres,
    'vote_average.gte': params.voteAverageGte,
  });

  setCache(cacheKey, data, CACHE_TTL_SECONDS);
  return data;
}

/**
 * Search for TV shows by query with optional filters.
 *
 * @param params - Search parameters including query and optional filters
 * @returns Promise resolving to search results with pagination info
 *
 * @example
 * ```typescript
 * const results = await searchTv({
 *   query: 'Breaking Bad',
 *   firstAirDateYear: 2008
 * });
 * ```
 */
export async function searchTv(params: SearchTvParams): Promise<TmdbSearchResponse> {
  const cacheKey = generateCacheKey('search:tv', params);
  const cached = getCache<TmdbSearchResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbSearchResponse>('/search/tv', {
    query: params.query,
    page: params.page,
    first_air_date_year: params.firstAirDateYear,
    language: params.language,
    with_genres: params.withGenres,
    'vote_average.gte': params.voteAverageGte,
  });

  setCache(cacheKey, data, CACHE_TTL_SECONDS);
  return data;
}

/**
 * Get detailed information for a specific movie.
 *
 * @param id - The TMDB movie ID
 * @returns Promise resolving to movie details
 *
 * @example
 * ```typescript
 * const movie = await getMovieDetails(550);
 * console.log(movie.title); // "Fight Club"
 * ```
 */
export async function getMovieDetails(id: number): Promise<TmdbMovieDetails> {
  const cacheKey = `title:movie:${id}`;
  const cached = getCache<TmdbMovieDetails>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbMovieDetails>(`/movie/${id}`);
  setCache(cacheKey, data, CACHE_TTL_SECONDS);
  return data;
}

/**
 * Get detailed information for a specific TV show.
 *
 * @param id - The TMDB TV show ID
 * @returns Promise resolving to TV show details
 *
 * @example
 * ```typescript
 * const show = await getTvDetails(1396);
 * console.log(show.name); // "Breaking Bad"
 * ```
 */
export async function getTvDetails(id: number): Promise<TmdbTvDetails> {
  const cacheKey = `title:tv:${id}`;
  const cached = getCache<TmdbTvDetails>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbTvDetails>(`/tv/${id}`);
  setCache(cacheKey, data, CACHE_TTL_SECONDS);
  return data;
}

/**
 * Get watch provider information for a specific movie.
 * Returns availability across different streaming platforms by country.
 *
 * @param id - The TMDB movie ID
 * @returns Promise resolving to watch providers by country
 *
 * @example
 * ```typescript
 * const providers = await getMovieWatchProviders(550);
 * console.log(providers.results.US?.flatrate); // Netflix, Amazon Prime, etc.
 * ```
 */
export async function getMovieWatchProviders(id: number): Promise<TmdbWatchProvidersResponse> {
  const cacheKey = `providers:movie:${id}`;
  const cached = getCache<TmdbWatchProvidersResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbWatchProvidersResponse>(`/movie/${id}/watch/providers`);
  setCache(cacheKey, data, CACHE_TTL_SECONDS);
  return data;
}

/**
 * Get watch provider information for a specific TV show.
 * Returns availability across different streaming platforms by country.
 *
 * @param id - The TMDB TV show ID
 * @returns Promise resolving to watch providers by country
 *
 * @example
 * ```typescript
 * const providers = await getTvWatchProviders(1396);
 * console.log(providers.results.US?.flatrate); // Streaming services
 * ```
 */
export async function getTvWatchProviders(id: number): Promise<TmdbWatchProvidersResponse> {
  const cacheKey = `providers:tv:${id}`;
  const cached = getCache<TmdbWatchProvidersResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbWatchProvidersResponse>(`/tv/${id}/watch/providers`);
  setCache(cacheKey, data, CACHE_TTL_SECONDS);
  return data;
}

/**
 * Get the list of official movie genres.
 *
 * @returns Promise resolving to list of movie genres with IDs and names
 *
 * @example
 * ```typescript
 * const { genres } = await getMovieGenres();
 * // [{ id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }, ...]
 * ```
 */
export async function getMovieGenres(): Promise<TmdbGenreList> {
  const cacheKey = 'genres:movie';
  const cached = getCache<TmdbGenreList>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbGenreList>('/genre/movie/list');
  setCache(cacheKey, data, 24 * 60 * 60); // 24 hours
  return data;
}

/**
 * Get the list of official TV show genres.
 *
 * @returns Promise resolving to list of TV genres with IDs and names
 *
 * @example
 * ```typescript
 * const { genres } = await getTvGenres();
 * // [{ id: 10759, name: 'Action & Adventure' }, ...]
 * ```
 */
export async function getTvGenres(): Promise<TmdbGenreList> {
  const cacheKey = 'genres:tv';
  const cached = getCache<TmdbGenreList>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbGenreList>('/genre/tv/list');
  setCache(cacheKey, data, 24 * 60 * 60); // 24 hours
  return data;
}

/**
 * Discover movies with filters including provider and country.
 *
 * @param params - Discovery parameters including optional provider and country filters
 * @returns Promise resolving to discover results with pagination info
 *
 * @example
 * ```typescript
 * const results = await discoverMovies({
 *   withWatchProviders: '8,9',
 *   watchRegion: 'US',
 *   withGenres: '28'
 * });
 * ```
 */
export async function discoverMovies(params: DiscoverMoviesParams): Promise<TmdbDiscoverResponse> {
  const cacheKey = generateCacheKey('discover:movie', params);
  const cached = getCache<TmdbDiscoverResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbDiscoverResponse>('/discover/movie', {
    page: params.page,
    year: params.year,
    language: params.language,
    with_genres: params.withGenres,
    with_watch_providers: params.withWatchProviders,
    watch_region: params.watchRegion,
  });

  setCache(cacheKey, data, CACHE_TTL_SECONDS);
  return data;
}

/**
 * Discover TV shows with filters including provider and country.
 *
 * @param params - Discovery parameters including optional provider and country filters
 * @returns Promise resolving to discover results with pagination info
 *
 * @example
 * ```typescript
 * const results = await discoverTv({
 *   withWatchProviders: '8,9',
 *   watchRegion: 'US',
 *   withGenres: '10759'
 * });
 * ```
 */
export async function discoverTv(params: DiscoverTvParams): Promise<TmdbDiscoverResponse> {
  const cacheKey = generateCacheKey('discover:tv', params);
  const cached = getCache<TmdbDiscoverResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbDiscoverResponse>('/discover/tv', {
    page: params.page,
    first_air_date_year: params.firstAirDateYear,
    language: params.language,
    with_genres: params.withGenres,
    with_watch_providers: params.withWatchProviders,
    watch_region: params.watchRegion,
  });

  setCache(cacheKey, data, CACHE_TTL_SECONDS);
  return data;
}

/**
 * Get the list of available movie watch providers.
 *
 * @returns Promise resolving to list of movie providers with IDs and names
 *
 * @example
 * ```typescript
 * const { results } = await getMovieWatchProvidersList();
 * // [{ provider_id: 8, provider_name: 'Netflix', ... }, ...]
 * ```
 */
export async function getMovieWatchProvidersList(
  watchRegion?: string
): Promise<TmdbProviderListResponse> {
  const cacheKey = watchRegion
    ? `providers:list:movie:${watchRegion}`
    : 'providers:list:movie';
  const cached = getCache<TmdbProviderListResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbProviderListResponse>('/watch/providers/movie', {
    watch_region: watchRegion,
  });
  setCache(cacheKey, data, 24 * 60 * 60); // 24 hours
  return data;
}

/**
 * Get the list of available TV watch providers.
 *
 * @returns Promise resolving to list of TV providers with IDs and names
 *
 * @example
 * ```typescript
 * const { results } = await getTvWatchProvidersList();
 * // [{ provider_id: 8, provider_name: 'Netflix', ... }, ...]
 * ```
 */
export async function getTvWatchProvidersList(
  watchRegion?: string
): Promise<TmdbProviderListResponse> {
  const cacheKey = watchRegion ? `providers:list:tv:${watchRegion}` : 'providers:list:tv';
  const cached = getCache<TmdbProviderListResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbProviderListResponse>('/watch/providers/tv', {
    watch_region: watchRegion,
  });
  setCache(cacheKey, data, 24 * 60 * 60); // 24 hours
  return data;
}
