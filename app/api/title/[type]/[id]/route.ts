import { NextRequest, NextResponse } from 'next/server';
import {
  getMovieDetails,
  getTvDetails,
  getMovieWatchProviders,
  getTvWatchProviders,
} from '../../../../tmdbApi';
import { mapAvailability, AvailabilityResult } from '../../../../availabilityMapper';
import { TmdbError } from '../../../../tmdbClient';
import { TmdbMovieDetails, TmdbTvDetails } from '../../../../tmdbTypes';

// Helper to build the poster URL
const buildPosterUrl = (posterPath?: string): string | undefined => {
  return posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : undefined;
};

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
  runtime?: number;
  availability: AvailabilityResult;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  const { type, id } = params;

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
    let details: TmdbMovieDetails | TmdbTvDetails;
    let watchProviders;
    let normalizedTitle: NormalizedTitle;

    if (type === 'movie') {
      details = await getMovieDetails(numericId);
      watchProviders = await getMovieWatchProviders(numericId);

      const movieDetails = details as TmdbMovieDetails;
      normalizedTitle = {
        id: movieDetails.id,
        type: 'movie',
        title: movieDetails.title,
        originalTitle: movieDetails.original_title,
        year: movieDetails.release_date ? new Date(movieDetails.release_date).getFullYear() : undefined,
        genres: movieDetails.genres || [],
        overview: movieDetails.overview,
        rating: movieDetails.vote_average,
        posterUrl: buildPosterUrl(movieDetails.poster_path),
        runtime: movieDetails.runtime,
        availability: mapAvailability(watchProviders),
      };
    } else { // type === 'tv'
      details = await getTvDetails(numericId);
      watchProviders = await getTvWatchProviders(numericId);

      const tvDetails = details as TmdbTvDetails;
      normalizedTitle = {
        id: tvDetails.id,
        type: 'tv',
        title: tvDetails.name,
        originalTitle: tvDetails.original_name,
        year: tvDetails.first_air_date ? new Date(tvDetails.first_air_date).getFullYear() : undefined,
        genres: tvDetails.genres || [],
        overview: tvDetails.overview,
        rating: tvDetails.vote_average,
        posterUrl: buildPosterUrl(tvDetails.poster_path),
        runtime: tvDetails.episode_run_time?.[0], // Take the first runtime if available
        availability: mapAvailability(watchProviders),
      };
    }

    return NextResponse.json(normalizedTitle, { status: 200 });
  } catch (error) {
    if (error instanceof TmdbError) {
      const errorMessage = `Failed to fetch ${type} details from TMDB: ${error.status} ${error.statusText}`;
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    } else if (error instanceof Error) {
      return NextResponse.json(
        { error: `Internal Server Error: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
