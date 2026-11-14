import { NextRequest, NextResponse } from 'next/server';
import {
  searchMovies,
  searchTv,
  discoverMovies,
  discoverTv,
  getWatchProviders,
  SearchMoviesParams,
  SearchTvParams,
} from '@/app/tmdbApi';
import { TmdbSearchResult, TmdbSearchResponse } from '@/app/tmdbTypes';
import { NormalizedSearchResult } from '@/app/types';
import { normalizeTmdbMedia } from '@/app/titleNormalizer';
import { filterResultsByProvider } from '@/app/availabilityMapper';
import {
  SearchMode,
  SearchRequest,
  SearchResponse,
  SortOption,
  parseSearchRequest,
} from '@/app/searchContract';
import { withRouteGuard, rateLimitHeaders } from '@/app/api/routeGuard';
import { getClientIdentifier } from '@/app/utils/rateLimiter';
import {
  RATE_LIMIT_CONFIG,
  DEFAULT_COUNTRY,
  YEAR_SEARCH_MAX_PAGES,
  YEAR_SEARCH_CONCURRENCY,
  YEAR_SEARCH_PAGE_SIZE,
  YEAR_SEARCH_CACHE_TTL_SECONDS,
} from '@/app/config';
import { getCache, setCache } from '@/app/cache';

/**
 * API route handler for searching and browsing movies and TV shows.
 *
 * GET /api/search
 *
 * With a query, searches TMDB by title. Without a query (full mode only), browses
 * the titles that are popular in the watch region via TMDB discover, which filters
 * by region, providers, genres, rating and release years natively.
 * Returns normalized results with consistent structure regardless of content type.
 *
 * Query Parameters:
 * - query: Search query string (required in autocomplete mode)
 * - type: "movie" | "tv" | "all" (default: "all")
 * - mode: "autocomplete" | "full" (default: "full")
 *   - autocomplete: Returns minimal fields (id, type, title, year, posterUrl, popularity)
 *   - full: Returns complete data including rating, genres, overview
 * - page: Page number (default: 1)
 * - yearFrom, yearTo: Year range filters (optional)
 * - language: ISO 639-1 language code (optional)
 * - genreIds: Comma-separated genre IDs (optional)
 * - providerIds: Comma-separated provider IDs (optional)
 * - watchRegion: ISO 3166-1 country code (optional, default for browsing: "US")
 * - minRating: Minimum rating filter (optional)
 * - sort: "relevance" | "popularity" | "rating" | "newest" | "oldest" | "title" (optional)
 *
 * When type="all", results from both movies and TV are merged and sorted.
 */

/** Minimum vote count for browsed titles, so obscure entries don't dominate rating sorts. */
const BROWSE_MIN_VOTES = 50;

/** TMDB caps paging at 500 pages. */
const MAX_PAGES = 500;

/**
 * Normalizes a TMDB search result to a consistent structure.
 * Handles differences between movie and TV result formats (e.g., title vs name).
 * In autocomplete mode, returns only essential fields for performance.
 * Posters are emitted at w342 for the poster grid.
 */
const normalizeTmdbResult = (
  result: TmdbSearchResult,
  type: 'movie' | 'tv',
  mode: SearchMode
): NormalizedSearchResult => {
  const {
    id,
    type: resultType,
    title,
    year,
    posterUrl,
    rating,
    overview,
  } = normalizeTmdbMedia(result, type, { posterSize: 'w342' });

  const normalized: NormalizedSearchResult = {
    id,
    type: resultType,
    title,
    year,
    posterUrl,
    popularity: result.popularity,
  };

  if (mode === 'full') {
    normalized.rating = rating;
    normalized.genres = result.genre_ids;
    normalized.overview = overview;
  }

  return normalized;
};

const SORTERS: Record<
  SortOption,
  (a: NormalizedSearchResult, b: NormalizedSearchResult) => number
> = {
  relevance: () => 0,
  popularity: (a, b) => (b.popularity || 0) - (a.popularity || 0),
  rating: (a, b) => (b.rating || 0) - (a.rating || 0),
  newest: (a, b) => (b.year || 0) - (a.year || 0),
  oldest: (a, b) => (a.year || Number.MAX_SAFE_INTEGER) - (b.year || Number.MAX_SAFE_INTEGER),
  title: (a, b) => a.title.localeCompare(b.title),
};

/**
 * Maps search parameters to TMDB API parameters for movies.
 * Only exact ranges can use TMDB’s single-year parameter.
 */
const mapSearchParamsToMovieParams = (params: SearchRequest): SearchMoviesParams => {
  const movieParams: SearchMoviesParams = {
    query: params.query,
    page: params.page,
  };

  if (params.yearFrom !== undefined && params.yearFrom === params.yearTo) {
    movieParams.year = params.yearFrom;
  }

  if (params.language) {
    movieParams.language = params.language;
  }

  if (params.genreIds && params.genreIds.length > 0) {
    movieParams.withGenres = params.genreIds.join(',');
  }

  return movieParams;
};

/**
 * Maps search parameters to TMDB API parameters for TV shows.
 * Only exact ranges can use TMDB’s single-year parameter.
 */
const mapSearchParamsToTvParams = (params: SearchRequest): SearchTvParams => {
  const tvParams: SearchTvParams = {
    query: params.query,
    page: params.page,
  };

  if (params.yearFrom !== undefined && params.yearFrom === params.yearTo) {
    tvParams.firstAirDateYear = params.yearFrom;
  }

  if (params.language) {
    tvParams.language = params.language;
  }

  if (params.genreIds && params.genreIds.length > 0) {
    tvParams.withGenres = params.genreIds.join(',');
  }

  return tvParams;
};

/**
 * Maps the app's sort option to a TMDB discover `sort_by` value.
 */
const discoverSortBy = (sort: SortOption | undefined, type: 'movie' | 'tv'): string => {
  const dateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';
  switch (sort) {
    case 'rating':
      return 'vote_average.desc';
    case 'newest':
      return `${dateField}.desc`;
    case 'oldest':
      return `${dateField}.asc`;
    case 'title':
      return type === 'movie' ? 'title.asc' : 'name.asc';
    default:
      return 'popularity.desc';
  }
};

const collectResults = (
  responses: { type: 'movie' | 'tv'; response: TmdbSearchResponse }[],
  mode: SearchMode
): SearchResponse => ({
  page: responses[0]?.response.page ?? 1,
  totalPages: Math.min(Math.max(1, ...responses.map((r) => r.response.total_pages)), MAX_PAGES),
  totalResults: responses.reduce((sum, r) => sum + r.response.total_results, 0),
  results: responses.flatMap(({ type, response }) =>
    response.results.map((r) => normalizeTmdbResult(r, type, mode))
  ),
});

const typesFor = (params: SearchRequest): ('movie' | 'tv')[] =>
  params.type === 'movie' ? ['movie'] : params.type === 'tv' ? ['tv'] : ['movie', 'tv'];

/**
 * Browses popular titles that have an offer in the watch region.
 */
async function browse(params: SearchRequest): Promise<SearchResponse> {
  const watchRegion = params.watchRegion || DEFAULT_COUNTRY;
  const withWatchProviders = params.providerIds?.length ? params.providerIds.join('|') : undefined;
  // Genre IDs differ between movies and TV, so match any selected genre
  const withGenres = params.genreIds?.length ? params.genreIds.join('|') : undefined;
  const today = new Date().toISOString().slice(0, 10);
  const from = params.yearFrom ? `${params.yearFrom}-01-01` : undefined;
  // "Newest" should not surface unreleased titles
  const to = params.yearTo
    ? `${params.yearTo}-12-31`
    : params.sort === 'newest'
      ? today
      : undefined;

  const responses = await Promise.all(
    typesFor(params).map(async (type) => {
      const shared = {
        page: params.page,
        watchRegion,
        withWatchProviders,
        withGenres,
        language: params.language,
        sortBy: discoverSortBy(params.sort, type),
        voteAverageGte: params.minRating || undefined,
        voteCountGte: BROWSE_MIN_VOTES,
      };
      const response =
        type === 'movie'
          ? await discoverMovies({ ...shared, releaseDateGte: from, releaseDateLte: to })
          : await discoverTv({ ...shared, firstAirDateGte: from, firstAirDateLte: to });
      return { type, response };
    })
  );

  const collected = collectResults(responses, 'full');
  collected.results.sort(SORTERS[params.sort ?? 'popularity']);
  return collected;
}

/**
 * Searches titles by query, then applies the filters TMDB search can't.
 */
async function searchResults(params: SearchRequest, collectAll = false): Promise<SearchResponse> {
  const fetchPage = async (type: 'movie' | 'tv', page: number) => ({
    type,
    response:
      type === 'movie'
        ? await searchMovies(mapSearchParamsToMovieParams({ ...params, page }))
        : await searchTv(mapSearchParamsToTvParams({ ...params, page })),
  });
  const responses = await Promise.all(
    typesFor(params).map((type) => fetchPage(type, collectAll ? 1 : params.page))
  );
  let truncated = false;
  if (collectAll) {
    const pending: { type: 'movie' | 'tv'; page: number }[] = [];
    for (const { type, response } of responses) {
      const limit = Math.min(response.total_pages, MAX_PAGES, YEAR_SEARCH_MAX_PAGES);
      truncated ||= response.total_pages > limit;
      for (let page = 2; page <= limit; page++) pending.push({ type, page });
    }
    // Fetch a bounded number at once, retaining upstream order regardless of
    // response timing. A failed page rejects the snapshot rather than omitting it.
    for (let offset = 0; offset < pending.length; offset += YEAR_SEARCH_CONCURRENCY) {
      const batch = pending.slice(offset, offset + YEAR_SEARCH_CONCURRENCY);
      responses.push(...(await Promise.all(batch.map(({ type, page }) => fetchPage(type, page)))));
    }
  }

  const collected = collectResults(responses, params.mode);
  let results = collected.results;
  if (collectAll) {
    const seen = new Set<string>();
    results = results.filter((r) => {
      const key = `${r.type}:${r.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (params.type === 'all') {
    results.sort(SORTERS.popularity);
  }

  if (params.genreIds && params.genreIds.length > 0 && params.mode === 'full') {
    results = results.filter((r) => r.genres?.some((g) => params.genreIds!.includes(g)));
  }

  if (params.yearFrom !== undefined || params.yearTo !== undefined) {
    results = results.filter((r) => {
      if (r.year === undefined) return false;
      if (params.yearFrom !== undefined && r.year < params.yearFrom) return false;
      if (params.yearTo !== undefined && r.year > params.yearTo) return false;
      return true;
    });
  }

  // Apply minRating filtering if requested
  if (params.minRating !== undefined) {
    results = results.filter((r) => r.rating !== undefined && r.rating >= params.minRating!);
  }

  // Apply inexpensive filters first and bound provider lookups for snapshots.
  if (params.providerIds?.length) {
    const matches: NormalizedSearchResult[] = [];
    for (let offset = 0; offset < results.length; offset += YEAR_SEARCH_CONCURRENCY) {
      matches.push(
        ...(await filterResultsByProvider(
          results.slice(offset, offset + YEAR_SEARCH_CONCURRENCY),
          { watchRegion: params.watchRegion, providerIds: params.providerIds },
          getWatchProviders
        ))
      );
    }
    results = matches;
  }

  if (params.sort && params.sort !== 'relevance') {
    results = [...results].sort(SORTERS[params.sort]);
  }

  if (collectAll) {
    return {
      page: 1,
      totalPages: Math.max(1, Math.ceil(results.length / YEAR_SEARCH_PAGE_SIZE)),
      totalResults: results.length,
      results,
      ...(truncated ? { resultsTruncated: true } : {}),
    };
  }

  // TMDB search cannot filter ranges, ratings, genres or availability before
  // paging. Keep its page boundaries and identify counts as upstream totals.
  const filtersPage =
    params.yearFrom !== undefined ||
    params.yearTo !== undefined ||
    params.minRating !== undefined ||
    Boolean(params.genreIds?.length || params.providerIds?.length);

  return {
    ...collected,
    results,
    ...(filtersPage ? { paginationScope: 'upstream' as const } : {}),
  };
}

// Share one filtered snapshot across page requests and concurrent consumers.
const pendingYearSearches = new Map<string, Promise<SearchResponse>>();

async function search(params: SearchRequest): Promise<SearchResponse> {
  const hasYearFilter = params.yearFrom !== undefined || params.yearTo !== undefined;
  if (params.mode !== 'full' || !hasYearFilter) return searchResults(params);

  const { page, ...snapshotParams } = params;
  const key = `year-search:${JSON.stringify(
    Object.entries(snapshotParams).sort(([a], [b]) => a.localeCompare(b))
  )}`;
  let snapshot = getCache<SearchResponse>(key);
  if (!snapshot) {
    let pending = pendingYearSearches.get(key);
    if (!pending) {
      pending = searchResults({ ...params, page: 1 }, true);
      pendingYearSearches.set(key, pending);
    }
    try {
      snapshot = await pending;
      setCache(key, snapshot, YEAR_SEARCH_CACHE_TTL_SECONDS);
    } finally {
      if (pendingYearSearches.get(key) === pending) pendingYearSearches.delete(key);
    }
  }
  const visiblePage = Math.min(Math.max(1, page), snapshot.totalPages);
  const offset = (visiblePage - 1) * YEAR_SEARCH_PAGE_SIZE;
  return {
    ...snapshot,
    page: visiblePage,
    results: snapshot.results.slice(offset, offset + YEAR_SEARCH_PAGE_SIZE),
  };
}

export async function GET(req: NextRequest) {
  return withRouteGuard(
    {
      identifier: getClientIdentifier(req),
      rateLimit: RATE_LIMIT_CONFIG.search,
      context: 'search route',
    },
    async (rateLimitResult) => {
      const params = parseSearchRequest(req.nextUrl.searchParams);

      if (!params.query && params.mode === 'autocomplete') {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
      }

      const response = params.query ? await search(params) : await browse(params);

      return NextResponse.json(response, {
        headers: rateLimitHeaders(rateLimitResult, RATE_LIMIT_CONFIG.search.maxRequests),
      });
    }
  );
}
