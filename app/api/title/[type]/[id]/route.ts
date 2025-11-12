import { NextRequest, NextResponse } from 'next/server';
import {
  getMovieDetails,
  getMovieWatchProviders,
  getTvDetails,
  getTvWatchProviders,
} from '@/app/tmdbApi';
import { mapAvailability, AvailabilityResult } from '@/app/availabilityMapper';
import { TmdbError } from '@/app/tmdbClient';

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface NormalizedTitle {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  originalTitle?: string;
  year?: number;
  genres: { id: number; name: string }[];
  overview?: string;
  rating?: number;
  posterUrl?: string;
  runtime?: number | null;
  availability: AvailabilityResult;
}

const getYear = (dateString?: string): number | undefined => {
  if (!dateString || dateString.length < 4) return undefined;
  return new Date(dateString).getFullYear();
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ type: string; id: string; }> }
) {
  const { type, id } = await context.params;

  // 1. Validate type
  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json(
      { error: 'Invalid type. Must be "movie" or "tv".' },
      { status: 400 }
    );
  }

  // 2. Validate ID
  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) {
    return NextResponse.json(
      { error: 'Invalid ID. Must be a positive integer.' },
      { status: 400 }
    );
  }

  try {
    let normalizedTitle: NormalizedTitle;
    let watchProvidersResponse;

    if (type === 'movie') {
      const [movieDetails, movieWatchProviders] = await Promise.all([
        getMovieDetails(numericId),
        getMovieWatchProviders(numericId),
      ]);

      watchProvidersResponse = movieWatchProviders;

      normalizedTitle = {
        id: movieDetails.id,
        type: 'movie',
        title: movieDetails.title,
        originalTitle: movieDetails.original_title,
        year: getYear(movieDetails.release_date),
        genres: movieDetails.genres,
        overview: movieDetails.overview,
        rating: movieDetails.vote_average,
        posterUrl: movieDetails.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${movieDetails.poster_path}`
          : undefined,
        availability: { preferredCountries: [], otherCountries: [] },
      };
    } else {
      // type === 'tv'
      const [tvDetails, tvWatchProviders] = await Promise.all([
        getTvDetails(numericId),
        getTvWatchProviders(numericId),
      ]);

      watchProvidersResponse = tvWatchProviders;

      normalizedTitle = {
        id: tvDetails.id,
        type: 'tv',
        title: tvDetails.name,
        originalTitle: tvDetails.original_name,
        year: getYear(tvDetails.first_air_date),
        genres: tvDetails.genres,
        overview: tvDetails.overview,
        rating: tvDetails.vote_average,
        posterUrl: tvDetails.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${tvDetails.poster_path}`
          : undefined,
        runtime: tvDetails.episode_run_time?.[0], // Assuming first episode runtime for TV
        availability: { preferredCountries: [], otherCountries: [] },
      };
    }

    // 4. Availability
    normalizedTitle.availability = mapAvailability(watchProvidersResponse);

    return NextResponse.json(normalizedTitle);
  } catch (error) {
    if (error instanceof TmdbError) {
      const errorMessage = `Error fetching data from TMDB.`;
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    } else if (error instanceof Error) {
      console.error(`API Error for /api/title/${type}/${id}:`, error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
    // Fallback for unknown errors
    console.error(`Unknown error for /api/title/${type}/${id}:`, error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}