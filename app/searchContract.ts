/**
 * Search contract module.
 *
 * Owns the wire format for the search endpoint: the parameter type, client
 * serialization, server parsing/validation, and the response shape. The search
 * page, the autocomplete hook, and the search route all consume this module, so
 * the contract can only drift when it is changed here.
 *
 * A request with a query searches by title; a request without one browses what
 * is popular in the watch region (full mode only).
 */

import { NormalizedSearchResult } from './types';

export type SearchType = 'movie' | 'tv' | 'all';
export type SearchMode = 'autocomplete' | 'full';
export type SortOption = 'relevance' | 'popularity' | 'rating' | 'newest' | 'oldest' | 'title';

export const SORT_OPTIONS: readonly SortOption[] = [
  'relevance',
  'popularity',
  'rating',
  'newest',
  'oldest',
  'title',
];

/**
 * Search parameters as used by the UI and the search hook.
 */
export interface SearchParams {
  query: string;
  type?: SearchType;
  yearFrom?: number;
  yearTo?: number;
  language?: string;
  genreIds?: number[];
  providerIds?: number[];
  watchRegion?: string;
  minRating?: number;
  sort?: SortOption;
}

/**
 * A full search request as sent over the wire: params plus pagination and mode.
 */
export interface SearchRequest extends SearchParams {
  page: number;
  mode: SearchMode;
}

/**
 * The search endpoint response shape.
 */
export interface SearchResponse {
  page: number;
  totalPages: number;
  totalResults: number;
  results: NormalizedSearchResult[];
}

/**
 * Serializes search parameters into a query string for /api/search.
 * Arrays are comma-joined; undefined values are omitted.
 *
 * @param params - Search parameters
 * @param options - Mode and page (defaults: 'full' and 1)
 * @returns Query string (without leading '?')
 *
 * @example
 * ```typescript
 * serializeSearchRequest({ query: 'Fight', genreIds: [28] }, { mode: 'autocomplete' });
 * // 'mode=autocomplete&page=1&query=Fight&genreIds=28'
 * ```
 */
export function serializeSearchRequest(
  params: SearchParams,
  options: { page?: number; mode?: SearchMode } = {}
): string {
  const queryParams = new URLSearchParams({
    mode: options.mode ?? 'full',
    page: String(options.page ?? 1),
  });

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Handle arrays (genreIds, providerIds)
      if (Array.isArray(value)) {
        if (value.length > 0) {
          queryParams.append(key, value.join(','));
        }
      } else {
        queryParams.append(key, String(value));
      }
    }
  });

  return queryParams.toString();
}

const parseIdList = (raw: string | null): number[] | undefined =>
  raw
    ? raw
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id))
    : undefined;

/**
 * Parses and validates /api/search query parameters into a SearchRequest.
 * Invalid values are normalized to defaults (e.g. invalid type -> "all").
 *
 * @param searchParams - URL search parameters from the request
 * @returns A fully populated SearchRequest
 */
export function parseSearchRequest(searchParams: URLSearchParams): SearchRequest {
  const type = (searchParams.get('type') as SearchType) || 'all';
  const mode = (searchParams.get('mode') as SearchMode) || 'full';

  const params: SearchRequest = {
    query: searchParams.get('query')?.trim() || '',
    type: ['movie', 'tv', 'all'].includes(type) ? type : 'all',
    page: parseInt(searchParams.get('page') || '1', 10) || 1,
    mode: ['autocomplete', 'full'].includes(mode) ? mode : 'full',
  };

  const yearFrom = searchParams.get('yearFrom');
  if (yearFrom) {
    const year = parseInt(yearFrom, 10);
    if (!isNaN(year) && year > 0) {
      params.yearFrom = year;
    }
  }

  const yearTo = searchParams.get('yearTo');
  if (yearTo) {
    const year = parseInt(yearTo, 10);
    if (!isNaN(year) && year > 0) {
      params.yearTo = year;
    }
  }

  const language = searchParams.get('language');
  if (language && language.trim()) {
    params.language = language.trim();
  }

  const genreIds = parseIdList(searchParams.get('genreIds'));
  if (genreIds) {
    params.genreIds = genreIds;
  }

  const providerIds = parseIdList(searchParams.get('providerIds'));
  if (providerIds) {
    params.providerIds = providerIds;
  }

  const watchRegion = searchParams.get('watchRegion');
  if (watchRegion && watchRegion.trim()) {
    params.watchRegion = watchRegion.trim().toUpperCase();
  }

  const minRating = searchParams.get('minRating');
  if (minRating) {
    const rating = parseFloat(minRating);
    if (!isNaN(rating)) {
      params.minRating = rating;
    }
  }

  const sort = searchParams.get('sort') as SortOption | null;
  if (sort && SORT_OPTIONS.includes(sort)) {
    params.sort = sort;
  }

  return params;
}
