/**
 * Search page URL state module.
 *
 * The search page keeps its whole state (query, filters, sort, page, "only my
 * services") in the URL so every view is shareable and survives reloads and
 * back/forward navigation. This module owns that URL format and its translation
 * into an /api/search request.
 */

import { SORT_OPTIONS, SearchParams, SearchType, SortOption } from '@/app/searchContract';

export interface SearchPageState {
  query: string;
  type: SearchType;
  genreIds: number[];
  yearFrom?: number;
  yearTo?: number;
  minRating: number;
  language: string;
  /** Explicit sort; undefined means the default for the current mode */
  sort?: SortOption;
  page: number;
  mine: boolean;
}

export const DEFAULT_SEARCH_PAGE_STATE: SearchPageState = Object.freeze({
  query: '',
  type: 'all',
  genreIds: [],
  minRating: 0,
  language: '',
  page: 1,
  mine: false,
}) as SearchPageState;

interface ReadableParams {
  get(name: string): string | null;
}

const positiveInt = (raw: string | null): number | undefined => {
  if (!raw) return undefined;
  const value = parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

/**
 * Reads search page state from URL search params, ignoring invalid values.
 */
export function parseSearchPageState(params: ReadableParams | null): SearchPageState {
  if (!params) {
    return { ...DEFAULT_SEARCH_PAGE_STATE };
  }
  const type = params.get('type');
  const sort = params.get('sort') as SortOption | null;
  const rating = parseFloat(params.get('rating') ?? '');

  return {
    query: params.get('q')?.trim() ?? '',
    type: type === 'movie' || type === 'tv' ? type : 'all',
    genreIds: (params.get('genre') ?? '')
      .split(',')
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isFinite(id) && id > 0),
    yearFrom: positiveInt(params.get('from')),
    yearTo: positiveInt(params.get('to')),
    minRating: Number.isFinite(rating) && rating > 0 && rating <= 10 ? rating : 0,
    language: params.get('lang')?.trim() ?? '',
    sort: sort && SORT_OPTIONS.includes(sort) ? sort : undefined,
    page: positiveInt(params.get('page')) ?? 1,
    mine: params.get('mine') === '1',
  };
}

/**
 * Writes search page state as a URL query string, omitting default values.
 *
 * @param state - The state to serialize
 * @param country - Optional country override to keep in the URL
 * @returns Query string without the leading '?'
 */
export function serializeSearchPageState(state: SearchPageState, country?: string | null): string {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.type !== 'all') params.set('type', state.type);
  if (state.genreIds.length > 0) params.set('genre', state.genreIds.join(','));
  if (state.yearFrom) params.set('from', String(state.yearFrom));
  if (state.yearTo) params.set('to', String(state.yearTo));
  if (state.minRating > 0) params.set('rating', String(state.minRating));
  if (state.language) params.set('lang', state.language);
  if (state.sort) params.set('sort', state.sort);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.mine) params.set('mine', '1');
  if (country) params.set('country', country);
  return params.toString();
}

/**
 * The sort in effect: the explicit choice when valid for the mode, otherwise
 * best match for searches and most popular for browsing.
 */
export function effectiveSort(state: SearchPageState): SortOption {
  if (!state.query) {
    return state.sort && state.sort !== 'relevance' ? state.sort : 'popularity';
  }
  return state.sort ?? 'relevance';
}

/** Number of active filters inside the filters popover (type, sort and "mine" excluded). */
export function activeFilterCount(state: SearchPageState): number {
  return (
    state.genreIds.length +
    (state.yearFrom ? 1 : 0) +
    (state.yearTo ? 1 : 0) +
    (state.minRating > 0 ? 1 : 0) +
    (state.language ? 1 : 0)
  );
}

/**
 * Translates page state into /api/search parameters for the user's country and services.
 * "Only my services" is ignored while the user has no services selected.
 */
export function toSearchRequestParams(
  state: SearchPageState,
  country: string,
  serviceIds: number[]
): SearchParams {
  const params: SearchParams = {
    query: state.query,
    type: state.type,
    watchRegion: country,
    sort: effectiveSort(state),
  };
  if (state.genreIds.length > 0) params.genreIds = state.genreIds;
  if (state.yearFrom) params.yearFrom = state.yearFrom;
  if (state.yearTo) params.yearTo = state.yearTo;
  if (state.minRating > 0) params.minRating = state.minRating;
  if (state.language) params.language = state.language;
  if (state.mine && serviceIds.length > 0) params.providerIds = serviceIds;
  return params;
}

/**
 * Link to a title's detail page, keeping the country so shared links stay local.
 */
export function titleHref(type: 'movie' | 'tv', id: number, country: string): string {
  return `/title/${type}/${id}?country=${country}`;
}
