import { NextRequest, NextResponse } from 'next/server';
import {
  searchMovies,
  searchTv,
  discoverMovies,
  discoverTv,
  getMovieWatchProviders,
  getTvWatchProviders,
  SearchMoviesParams,
  SearchTvParams,
} from '@/app/tmdbApi';
import { TmdbSearchResult, TmdbSearchResponse } from '@/app/tmdbTypes';
import { NormalizedSearchResult } from '@/app/types';
import { normalizeTmdbMedia } from '@/app/titleNormalizer';
import { DEFAULT_WATCH_REGION, filterResultsByProvider } from '@/app/availabilityMapper';
import {
  SearchMode,
  SearchRequest,
  SearchResponse,
  SortOption,
  parseSearchRequest,
} from '@/app/searchContract';
import { withRouteGuard, rateLimitHeaders } from '@/app/api/routeGuard';
import { getClientIdentifier } from '@/app/utils/rateLimiter';
import { RATE_LIMIT_CONFIG } from '@/app/config';

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
 * Handles year range mapping (yearFrom/yearTo → year for movies).
 */
const mapSearchParamsToMovieParams = (params: SearchRequest): SearchMoviesParams => {
  const movieParams: SearchMoviesParams = {
    query: params.query,
    page: params.page,
  };

  // For movies, use yearFrom as the year filter (TMDB uses single year, not range)
  // If both yearFrom and yearTo are provided, prefer yearFrom
  if (params.yearFrom) {
    movieParams.year = params.yearFrom;
  } else if (params.yearTo) {
    movieParams.year = params.yearTo;
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
 * Handles year range mapping (yearFrom/yearTo → firstAirDateYear for TV).
 */
const mapSearchParamsToTvParams = (params: SearchRequest): SearchTvParams => {
  const tvParams: SearchTvParams = {
    query: params.query,
    page: params.page,
  };

  // For TV shows, use yearFrom as the firstAirDateYear filter
  // If both yearFrom and yearTo are provided, prefer yearFrom
  if (params.yearFrom) {
    tvParams.firstAirDateYear = params.yearFrom;
  } else if (params.yearTo) {
    tvParams.firstAirDateYear = params.yearTo;
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
  const watchRegion = params.watchRegion || DEFAULT_WATCH_REGION;
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
async function search(params: SearchRequest): Promise<SearchResponse> {
  const responses = await Promise.all(
    typesFor(params).map(async (type) => ({
      type,
      response:
        type === 'movie'
          ? await searchMovies(mapSearchParamsToMovieParams(params))
          : await searchTv(mapSearchParamsToTvParams(params)),
    }))
  );

  const collected = collectResults(responses, params.mode);
  let results = collected.results;

  if (params.type === 'all') {
    results.sort(SORTERS.popularity);
  }

  // Apply strict filtering if requested
  if ((params.providerIds && params.providerIds.length > 0) || params.watchRegion) {
    results = await filterResultsByProvider(
      results,
      { watchRegion: params.watchRegion, providerIds: params.providerIds },
      (type, id) => (type === 'movie' ? getMovieWatchProviders(id) : getTvWatchProviders(id))
    );
  }

  if (params.genreIds && params.genreIds.length > 0 && params.mode === 'full') {
    results = results.filter((r) => r.genres?.some((g) => params.genreIds!.includes(g)));
  }

  if (params.yearFrom && params.yearTo) {
    results = results.filter((r) => r.year !== undefined && r.year <= params.yearTo!);
  }

  // Apply minRating filtering if requested
  if (params.minRating !== undefined) {
    results = results.filter((r) => r.rating !== undefined && r.rating >= params.minRating!);
  }

  if (params.sort && params.sort !== 'relevance') {
    results = [...results].sort(SORTERS[params.sort]);
  }

  return { ...collected, results };
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
