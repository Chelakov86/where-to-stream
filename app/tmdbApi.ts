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
} from './tmdbTypes';
import { getCache, setCache } from './cache';
import { CACHE_TTL_SECONDS } from './config';

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
export async function searchMovies(
  params: SearchMoviesParams
): Promise<TmdbSearchResponse> {
  const cacheKey = `search:movie:${JSON.stringify(params)}`;
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
export async function searchTv(
  params: SearchTvParams
): Promise<TmdbSearchResponse> {
  const cacheKey = `search:tv:${JSON.stringify(params)}`;
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
export async function getMovieWatchProviders(
  id: number
): Promise<TmdbWatchProvidersResponse> {
  const cacheKey = `providers:movie:${id}`;
  const cached = getCache<TmdbWatchProvidersResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbWatchProvidersResponse>(
    `/movie/${id}/watch/providers`
  );
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
export async function getTvWatchProviders(
  id: number
): Promise<TmdbWatchProvidersResponse> {
  const cacheKey = `providers:tv:${id}`;
  const cached = getCache<TmdbWatchProvidersResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await tmdbGet<TmdbWatchProvidersResponse>(
    `/tv/${id}/watch/providers`
  );
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