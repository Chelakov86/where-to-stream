import { NextRequest, NextResponse } from 'next/server';
import {
  searchMovies,
  searchTv,
  getMovieWatchProviders,
  getTvWatchProviders,
  SearchMoviesParams,
  SearchTvParams,
  discoverMovies,
  discoverTv,
  DiscoverMoviesParams,
  DiscoverTvParams,
} from '@/app/tmdbApi';
import { TmdbError } from '@/app/tmdbClient';
import { TmdbSearchResult, TmdbSearchResponse, TmdbWatchProvidersResponse } from '@/app/tmdbTypes';
import { mapTmdbErrorToHttpStatus } from '@/app/api/errorMapping';
import { NormalizedSearchResult } from '@/app/types';
import { buildTmdbImageUrl, getYear } from '@/app/utils/tmdb';
import { checkRateLimit, getClientIdentifier } from '@/app/utils/rateLimiter';
import { logger } from '@/app/utils/logger';

/**
 * Filter results by checking availability in the specified region and providers.
 * Returns only the results that are available on at least one of the specified providers in the region.
 */
async function filterResultsByProvider(
  results: NormalizedSearchResult[],
  watchRegion?: string,
  providerIds?: number[]
): Promise<NormalizedSearchResult[]> {
  if ((!watchRegion && (!providerIds || providerIds.length === 0)) || results.length === 0) {
    return results;
  }

  // If providers are selected, we must filter.
  // If only region is selected, we technically should check if it's available in that region at all,
  // but for now we'll prioritize filtering by specific providers if providerIds are present.
  // If only watchRegion is present, we return all results (TMDB doesn't easily support "available anywhere in region" check efficiently for search results without providers)
  // strict "streaming" availability check requires checking providers.
  if (!providerIds || providerIds.length === 0) {
    return results;
  }

  const region = watchRegion || 'US'; // Default to US if region is missing but providers are selected

  const checks = await Promise.all(
    results.map(async (item) => {
      try {
        let providersData: TmdbWatchProvidersResponse;
        if (item.type === 'movie') {
          providersData = await getMovieWatchProviders(item.id);
        } else {
          providersData = await getTvWatchProviders(item.id);
        }

        const regionData = providersData.results[region];
        if (!regionData) return false;

        // Check availability in flatrate, ads, free
        const availableProviders = [
          ...(regionData.flatrate || []),
          ...(regionData.ads || []),
          ...(regionData.free || []),
        ];

        return availableProviders.some((p) => providerIds.includes(p.provider_id));
      } catch (error) {
        logger.error(`Failed to fetch providers for ${item.type} ${item.id}`, { error });
        return false;
      }
    })
  );

  return results.filter((_, index) => checks[index]);
}

/**
 * API route handler for searching movies and TV shows.
 *
 * GET /api/search
 *
 * Searches TMDB for movies and/or TV shows based on query parameters.
 * Supports filtering by type, year range, language, genres, and rating.
 * Returns normalized results with consistent structure regardless of content type.
 *
 * Query Parameters:
 * - query (required): Search query string
 * - type: "movie" | "tv" | "all" (default: "all")
 * - mode: "autocomplete" | "full" (default: "full")
 *   - autocomplete: Returns minimal fields (id, type, title, year, posterUrl, popularity)
 *   - full: Returns complete data including rating, genres, overview
 * - page: Page number (default: 1)
 * - yearFrom, yearTo: Year range filters (optional)
 * - language: ISO 639-1 language code (optional)
 * - genreIds: Comma-separated genre IDs (optional)
 * - minRating: Minimum rating filter (optional)
 *
 * When type="all", results from both movies and TV are merged and sorted by popularity.
 * Results are normalized to a consistent structure regardless of source type.
 */

type SearchType = 'movie' | 'tv' | 'all';
type SearchMode = 'autocomplete' | 'full';

interface SearchParams {
  query: string;
  type: SearchType;
  yearFrom?: number;
  yearTo?: number;
  language?: string;
  genreIds?: number[];
  providerIds?: number[];
  watchRegion?: string;
  page: number;
  mode: SearchMode;
}

interface SearchResponse {
  page: number;
  totalPages: number;
  totalResults: number;
  results: NormalizedSearchResult[];
}

/**
 * Normalizes a TMDB search result to a consistent structure.
 * Handles differences between movie and TV result formats (e.g., title vs name).
 * In autocomplete mode, returns only essential fields for performance.
 */
const normalizeTmdbResult = (
  result: TmdbSearchResult,
  type: 'movie' | 'tv',
  mode: SearchMode
): NormalizedSearchResult => {
  const isMovie = type === 'movie';
  const normalized: NormalizedSearchResult = {
    id: result.id,
    type: type,
    title: (isMovie ? result.title : result.name) || '',
    year: getYear(isMovie ? result.release_date : result.first_air_date),
    posterUrl: buildTmdbImageUrl(result.poster_path, 'w500'),
    popularity: result.popularity,
  };

  if (mode === 'full') {
    normalized.rating = result.vote_average;
    normalized.genres = result.genre_ids;
    normalized.overview = result.overview;
  }

  return normalized;
};

/**
 * Parses and validates query parameters from the request URL.
 * Normalizes invalid values to defaults (e.g., invalid type -> "all").
 * Handles comma-separated genreIds string conversion to number array.
 */
const parseSearchParams = (searchParams: URLSearchParams): SearchParams => {
  const type = (searchParams.get('type') as SearchType) || 'all';
  const mode = (searchParams.get('mode') as SearchMode) || 'full';

  const params: SearchParams = {
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

  const genreIds = searchParams.get('genreIds');
  if (genreIds) {
    params.genreIds = genreIds
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));
  }

  const providerIds = searchParams.get('providerIds');
  if (providerIds) {
    params.providerIds = providerIds
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));
  }

  const watchRegion = searchParams.get('watchRegion');
  if (watchRegion && watchRegion.trim()) {
    params.watchRegion = watchRegion.trim().toUpperCase();
  }

  return params;
};

/**
 * Maps search parameters to TMDB API parameters for movies.
 * Handles year range mapping (yearFrom/yearTo → year for movies).
 */
const mapSearchParamsToMovieParams = (params: SearchParams): SearchMoviesParams => {
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
const mapSearchParamsToTvParams = (params: SearchParams): SearchTvParams => {
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
 * Maps search parameters to TMDB API parameters for movie discovery.
 * Used when provider or country filters are present.
 */
const mapSearchParamsToDiscoverMovieParams = (params: SearchParams): DiscoverMoviesParams => {
  const discoverParams: DiscoverMoviesParams = {
    page: params.page,
  };

  // For movies, use yearFrom as the year filter
  if (params.yearFrom) {
    discoverParams.year = params.yearFrom;
  } else if (params.yearTo) {
    discoverParams.year = params.yearTo;
  }

  if (params.language) {
    discoverParams.language = params.language;
  }

  if (params.genreIds && params.genreIds.length > 0) {
    discoverParams.withGenres = params.genreIds.join(',');
  }

  if (params.providerIds && params.providerIds.length > 0) {
    discoverParams.withWatchProviders = params.providerIds.join('|');
  }

  if (params.watchRegion) {
    discoverParams.watchRegion = params.watchRegion;
  }

  return discoverParams;
};

/**
 * Maps search parameters to TMDB API parameters for TV discovery.
 * Used when provider or country filters are present.
 */
const mapSearchParamsToDiscoverTvParams = (params: SearchParams): DiscoverTvParams => {
  const discoverParams: DiscoverTvParams = {
    page: params.page,
  };

  // For TV shows, use yearFrom as the firstAirDateYear filter
  if (params.yearFrom) {
    discoverParams.firstAirDateYear = params.yearFrom;
  } else if (params.yearTo) {
    discoverParams.firstAirDateYear = params.yearTo;
  }

  if (params.language) {
    discoverParams.language = params.language;
  }

  if (params.genreIds && params.genreIds.length > 0) {
    discoverParams.withGenres = params.genreIds.join(',');
  }

  if (params.providerIds && params.providerIds.length > 0) {
    discoverParams.withWatchProviders = params.providerIds.join('|');
  }

  if (params.watchRegion) {
    discoverParams.watchRegion = params.watchRegion;
  }

  return discoverParams;
};

export async function GET(req: NextRequest) {
  // Rate limiting - 100 requests per 15 minutes per IP
  const identifier = getClientIdentifier(req);
  const rateLimitResult = checkRateLimit(identifier, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  });

  if (!rateLimitResult.allowed) {
    const resetDate = new Date(rateLimitResult.resetTime);
    const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please try again later.',
        resetTime: resetDate.toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSeconds.toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetDate.toISOString(),
        },
      }
    );
  }

  const params = parseSearchParams(req.nextUrl.searchParams);

  if (!params.query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    let results: NormalizedSearchResult[] = [];
    let page = 1;
    let totalPages = 1;
    let totalResults = 0;

    // Always use search endpoints to ensure query relevance.
    // We apply strict provider/region filtering post-search.
    if (params.type === 'movie') {
      const movieParams = mapSearchParamsToMovieParams(params);
      const tmdbResponse = await searchMovies(movieParams);
      page = tmdbResponse.page;
      totalPages = tmdbResponse.total_pages;
      totalResults = tmdbResponse.total_results;
      results = tmdbResponse.results.map((r) => normalizeTmdbResult(r, 'movie', params.mode));
    } else if (params.type === 'tv') {
      const tvParams = mapSearchParamsToTvParams(params);
      const tmdbResponse = await searchTv(tvParams);
      page = tmdbResponse.page;
      totalPages = tmdbResponse.total_pages;
      totalResults = tmdbResponse.total_results;
      results = tmdbResponse.results.map((r) => normalizeTmdbResult(r, 'tv', params.mode));
    } else {
      // type === 'all': Fetch both movies and TV in parallel
      const movieParams = mapSearchParamsToMovieParams(params);
      const tvParams = mapSearchParamsToTvParams(params);
      const [movieResponse, tvResponse] = await Promise.all([
        searchMovies(movieParams),
        searchTv(tvParams),
      ]);

      page = movieResponse.page;
      totalPages = Math.max(movieResponse.total_pages, tvResponse.total_pages);
      totalResults = movieResponse.total_results + tvResponse.total_results;

      results = [
        ...movieResponse.results.map((r) => normalizeTmdbResult(r, 'movie', params.mode)),
        ...tvResponse.results.map((r) => normalizeTmdbResult(r, 'tv', params.mode)),
      ];

      // Sort by popularity (descending)
      results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    // Apply strict filtering if requested
    if ((params.providerIds && params.providerIds.length > 0) || params.watchRegion) {
      results = await filterResultsByProvider(results, params.watchRegion, params.providerIds);
    }

    const response: SearchResponse = {
      page,
      totalPages,
      totalResults,
      results,
    };

    // Add rate limit headers to successful response
    const resetDate = new Date(rateLimitResult.resetTime);
    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': resetDate.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof TmdbError) {
      return NextResponse.json(
        { error: 'Error from TMDB API' },
        { status: mapTmdbErrorToHttpStatus(error) }
      );
    }
    logger.error('Search API Error', { error });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
