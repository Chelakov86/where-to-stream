import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, searchTv, SearchMoviesParams, SearchTvParams } from '@/app/tmdbApi';
import { TmdbError } from '@/app/tmdbClient';
import { TmdbSearchResult, TmdbSearchResponse } from '@/app/tmdbTypes';

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

const getYear = (dateString?: string): number | undefined => {
  if (!dateString || dateString.length < 4) return undefined;
  return new Date(dateString).getFullYear();
};

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
    posterUrl: result.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${result.poster_path}`
      : undefined,
    popularity: result.popularity,
  };

  if (mode === 'full') {
    normalized.rating = result.vote_average;
    normalized.genres = result.genre_ids;
    normalized.overview = result.overview;
  }

  return normalized;
};

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
    params.genreIds = genreIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
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
        results: tmdbResponse.results.map(r => normalizeTmdbResult(r, 'movie', params.mode)),
      };
    } else if (params.type === 'tv') {
      const tmdbResponse = await searchTv(tvParams);
      response = {
        page: tmdbResponse.page,
        totalPages: tmdbResponse.total_pages,
        totalResults: tmdbResponse.total_results,
        results: tmdbResponse.results.map(r => normalizeTmdbResult(r, 'tv', params.mode)),
      };
    } else { // type === 'all'
      const [movieResponse, tvResponse] = await Promise.all([
        searchMovies(movieParams),
        searchTv(tvParams),
      ]);

      const combinedResults = [
        ...movieResponse.results.map(r => normalizeTmdbResult(r, 'movie', params.mode)),
        ...tvResponse.results.map(r => normalizeTmdbResult(r, 'tv', params.mode)),
      ];

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
      return NextResponse.json({ error: 'Error from TMDB API' }, { status: 502 });
    }
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
