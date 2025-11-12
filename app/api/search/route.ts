import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, searchTv, SearchMoviesParams, SearchTvParams } from '@/app/tmdbApi';
import { TmdbError } from '@/app/tmdbClient';
import { TmdbSearchResult, TmdbSearchResponse } from '@/app/tmdbTypes';
import { mapTmdbErrorToHttpStatus } from '@/app/api/errorMapping';

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

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

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

interface NormalizedSearchResult {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  year?: number;
  posterUrl?: string;
  rating?: number;
  genres?: number[];
  overview?: string;
  popularity?: number;
}

interface SearchResponse {
  page: number;
  totalPages: number;
  totalResults: number;
  results: NormalizedSearchResult[];
}

/**
 * Extracts year from a date string (YYYY-MM-DD format).
 * Returns undefined if the date string is invalid or too short.
 */
const getYear = (dateString?: string): number | undefined => {
  if (!dateString || dateString.length < 4) return undefined;
  return new Date(dateString).getFullYear();
};

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
    posterUrl: result.poster_path ? `${TMDB_IMAGE_BASE_URL}${result.poster_path}` : undefined,
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

  const genreIds = searchParams.get('genreIds');
  if (genreIds) {
    params.genreIds = genreIds
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));
  }

  return params;
};

export async function GET(req: NextRequest) {
  const params = parseSearchParams(req.nextUrl.searchParams);

  if (!params.query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    let response: SearchResponse;

    const movieParams: SearchMoviesParams = { query: params.query, page: params.page };
    const tvParams: SearchTvParams = { query: params.query, page: params.page };

    if (params.type === 'movie') {
      const tmdbResponse = await searchMovies(movieParams);
      response = {
        page: tmdbResponse.page,
        totalPages: tmdbResponse.total_pages,
        totalResults: tmdbResponse.total_results,
        results: tmdbResponse.results.map((r) => normalizeTmdbResult(r, 'movie', params.mode)),
      };
    } else if (params.type === 'tv') {
      const tmdbResponse = await searchTv(tvParams);
      response = {
        page: tmdbResponse.page,
        totalPages: tmdbResponse.total_pages,
        totalResults: tmdbResponse.total_results,
        results: tmdbResponse.results.map((r) => normalizeTmdbResult(r, 'tv', params.mode)),
      };
    } else {
      // type === 'all': Fetch both movies and TV in parallel, then merge and sort
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
