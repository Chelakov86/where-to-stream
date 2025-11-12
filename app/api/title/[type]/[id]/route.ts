import { NextRequest, NextResponse } from 'next/server';
import {
  getMovieDetails,
  getMovieWatchProviders,
  getTvDetails,
  getTvWatchProviders,
} from '@/app/tmdbApi';
import { mapAvailability, AvailabilityResult } from '@/app/availabilityMapper';
import { TmdbError } from '@/app/tmdbClient';
import { mapTmdbErrorToHttpStatus } from '@/app/api/errorMapping';
import { buildTmdbImageUrl, getYear } from '@/app/utils/tmdb';

/**
 * API route handler for fetching detailed information about a specific movie or TV show.
 *
 * GET /api/title/:type/:id
 *
 * Fetches comprehensive details including metadata (title, year, genres, overview, rating, runtime)
 * and streaming availability by country. The availability data is processed through the
 * availabilityMapper to normalize provider information and group by preferred countries.
 *
 * Path Parameters:
 * - type: "movie" | "tv" (required)
 * - id: TMDB ID as positive integer (required)
 *
 * Returns a normalized title object with:
 * - Basic metadata (id, type, title, originalTitle, year, genres, overview, rating, posterUrl, runtime)
 * - Availability information grouped by preferred countries (DE, GB, US, CA) and other countries
 *   - Each country entry includes: countryCode, countryName, hasNetflix, freeOrAdsProviders, watchLink
 *
 * The endpoint fetches details and watch providers in parallel for performance.
 */

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> | { type: string; id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { type, id } = resolvedParams;

  // 1. Validate type
  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json({ error: 'Invalid type. Must be "movie" or "tv".' }, { status: 400 });
  }

  // 2. Validate ID
  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'Invalid ID. Must be a positive integer.' }, { status: 400 });
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

      // Normalize movie details to consistent structure
      normalizedTitle = {
        id: movieDetails.id,
        type: 'movie',
        title: movieDetails.title,
        originalTitle: movieDetails.original_title,
        year: getYear(movieDetails.release_date),
        genres: movieDetails.genres,
        overview: movieDetails.overview,
        rating: movieDetails.vote_average,
        posterUrl: buildTmdbImageUrl(movieDetails.poster_path, 'w500'),
        runtime: movieDetails.runtime,
        availability: { preferredCountries: [], otherCountries: [] },
      };
    } else {
      // type === 'tv'
      const [tvDetails, tvWatchProviders] = await Promise.all([
        getTvDetails(numericId),
        getTvWatchProviders(numericId),
      ]);

      watchProvidersResponse = tvWatchProviders;

      // Normalize TV details to consistent structure
      // Note: TV shows use first_air_date instead of release_date, and name instead of title
      normalizedTitle = {
        id: tvDetails.id,
        type: 'tv',
        title: tvDetails.name,
        originalTitle: tvDetails.original_name,
        year: getYear(tvDetails.first_air_date),
        genres: tvDetails.genres,
        overview: tvDetails.overview,
        rating: tvDetails.vote_average,
        posterUrl: buildTmdbImageUrl(tvDetails.poster_path, 'w500'),
        // Use first episode runtime as representative runtime for TV shows
        runtime: tvDetails.episode_run_time?.[0],
        availability: { preferredCountries: [], otherCountries: [] },
      };
    }

    // Map TMDB watch providers to our availability model
    // This groups countries, detects Netflix availability, and extracts free/ad-supported providers
    normalizedTitle.availability = mapAvailability(watchProvidersResponse);

    return NextResponse.json(normalizedTitle);
  } catch (error) {
    if (error instanceof TmdbError) {
      return NextResponse.json(
        { error: 'Error fetching data from TMDB.' },
        { status: mapTmdbErrorToHttpStatus(error) }
      );
    } else if (error instanceof Error) {
      console.error(`API Error for /api/title/${type}/${id}:`, error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    // Fallback for unknown errors
    console.error(`Unknown error for /api/title/${type}/${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
