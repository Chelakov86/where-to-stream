import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const query = searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  const type = (searchParams.get('type') as SearchType) || 'all';
  const mode = (searchParams.get('mode') as SearchMode) || 'full';

  const params: SearchParams = {
    query,
    type: ['movie', 'tv', 'all'].includes(type) ? type : 'all',
    page: parseInt(searchParams.get('page') || '1', 10) || 1,
    mode: ['autocomplete', 'full'].includes(mode) ? mode : 'full',
  };

  const yearFrom = searchParams.get('yearFrom');
  if (yearFrom) {
    params.yearFrom = parseInt(yearFrom, 10);
  }

  const yearTo = searchParams.get('yearTo');
  if (yearTo) {
    params.yearTo = parseInt(yearTo, 10);
  }

  const language = searchParams.get('language');
  if (language) {
    params.language = language;
  }

  const genreIds = searchParams.get('genreIds');
  if (genreIds) {
    const parsedGenreIds = genreIds
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));
    if (parsedGenreIds.length > 0) {
      params.genreIds = parsedGenreIds;
    }
  }

  const minRating = searchParams.get('minRating');
  if (minRating) {
    params.minRating = parseFloat(minRating);
  }

  return NextResponse.json({ params });
}
