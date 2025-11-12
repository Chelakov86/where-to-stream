import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, searchTv, SearchMoviesParams, SearchTvParams } from '@/app/tmdbApi';
import { TmdbError } from '@/app/tmdbClient';
import { TmdbSearchResult, TmdbSearchResponse } from '@/app/tmdbTypes';
import { mapTmdbErrorToHttpStatus } from '@/app/api/errorMapping';
import { NormalizedSearchResult } from '@/app/types';
import { buildTmdbImageUrl, getYear } from '@/app/utils/tmdb';

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
  minRating?: number;
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

  const minRating = searchParams.get('minRating');
  if (minRating) {
    const rating = parseFloat(minRating);
    if (!isNaN(rating) && rating >= 0) {
      params.minRating = rating;
    }
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

  if (params.minRating !== undefined) {
    movieParams.voteAverageGte = params.minRating;
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

  if (params.minRating !== undefined) {
    tvParams.voteAverageGte = params.minRating;
  }

  return tvParams;
};

export async function GET(req: NextRequest) {
  const params = parseSearchParams(req.nextUrl.searchParams);

  if (!params.query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    let response: SearchResponse;

    if (params.type === 'movie') {
      const movieParams = mapSearchParamsToMovieParams(params);
      const tmdbResponse = await searchMovies(movieParams);
      response = {
        page: tmdbResponse.page,
        totalPages: tmdbResponse.total_pages,
        totalResults: tmdbResponse.total_results,
        results: tmdbResponse.results.map((r) => normalizeTmdbResult(r, 'movie', params.mode)),
      };
    } else if (params.type === 'tv') {
      const tvParams = mapSearchParamsToTvParams(params);
      const tmdbResponse = await searchTv(tvParams);
      response = {
        page: tmdbResponse.page,
        totalPages: tmdbResponse.total_pages,
        totalResults: tmdbResponse.total_results,
        results: tmdbResponse.results.map((r) => normalizeTmdbResult(r, 'tv', params.mode)),
      };
    } else {
      // type === 'all': Fetch both movies and TV in parallel, then merge and sort
      const movieParams = mapSearchParamsToMovieParams(params);
      const tvParams = mapSearchParamsToTvParams(params);
      const [movieResponse, tvResponse] = await Promise.all([
        searchMovies(movieParams),
        searchTv(tvParams),
      ]);

      // Combine results from both sources
      const combinedResults = [
        ...movieResponse.results.map((r) => normalizeTmdbResult(r, 'movie', params.mode)),
        ...tvResponse.results.map((r) => normalizeTmdbResult(r, 'tv', params.mode)),
      ];

      // Sort by popularity (descending) to show most popular results first
      combinedResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

      response = {
        page: movieResponse.page, // Assuming same page for both
        totalPages: Math.max(movieResponse.total_pages, tvResponse.total_pages),
        totalResults: movieResponse.total_results + tvResponse.total_results,
        results: combinedResults,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof TmdbError) {
      return NextResponse.json(
        { error: 'Error from TMDB API' },
        { status: mapTmdbErrorToHttpStatus(error) }
      );
    }
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
