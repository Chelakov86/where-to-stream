import { NextRequest, NextResponse } from 'next/server';
import {
  searchMovies,
  searchTv,
  getMovieWatchProviders,
  getTvWatchProviders,
  SearchMoviesParams,
  SearchTvParams,
} from '@/app/tmdbApi';
import { TmdbError } from '@/app/tmdbClient';
import { TmdbSearchResult, TmdbSearchResponse } from '@/app/tmdbTypes';
import { mapTmdbErrorToHttpStatus } from '@/app/api/errorMapping';
import { NormalizedSearchResult } from '@/app/types';
import { normalizeTmdbMedia } from '@/app/titleNormalizer';
import { filterResultsByProvider } from '@/app/availabilityMapper';
import {
  SearchMode,
  SearchRequest,
  SearchResponse,
  parseSearchRequest,
} from '@/app/searchContract';
import { checkRateLimit, getClientIdentifier } from '@/app/utils/rateLimiter';
import { logger } from '@/app/utils/logger';

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

/**
 * Normalizes a TMDB search result to a consistent structure.
 * Handles differences between movie and TV result formats (e.g., title vs name).
 * In autocomplete mode, returns only essential fields for performance.
 * Posters are emitted at w200 for the list UI.
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
  } = normalizeTmdbMedia(result, type, { posterSize: 'w200' });

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

  const params = parseSearchRequest(req.nextUrl.searchParams);

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
      results = await filterResultsByProvider(
        results,
        { watchRegion: params.watchRegion, providerIds: params.providerIds },
        (type, id) => (type === 'movie' ? getMovieWatchProviders(id) : getTvWatchProviders(id))
      );
    }

    // Apply minRating filtering if requested
    if (params.minRating !== undefined) {
      results = results.filter((r) => r.rating !== undefined && r.rating >= params.minRating!);
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
