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
import { checkRateLimit, getClientIdentifier } from '@/app/utils/rateLimiter';
import { logger } from '@/app/utils/logger';
import { detectUserCountry, validateCountryCode } from '@/app/utils/countryDetection';

/**
 * API route handler for fetching detailed information about a specific movie or TV show.
 *
 * GET /api/title/:type/:id
 *
 * Fetches comprehensive details including metadata (title, year, genres, overview, rating, runtime)
 * and streaming availability by country. The availability data is processed through the
 * availabilityMapper to normalize provider information and automatically detect the user's country.
 *
 * Path Parameters:
 * - type: "movie" | "tv" (required)
 * - id: TMDB ID as positive integer (required)
 *
 * Returns a normalized title object with:
 * - Basic metadata (id, type, title, originalTitle, year, genres, overview, rating, posterUrl, runtime)
 * - detectedCountry: User's country code (null if detection failed)
 * - Availability information:
 *   - userCountry: Single country object for detected location (null if detection failed)
 *   - otherCountries: All other countries with providers
 *   - Each country entry includes: countryCode, countryName, freeProviders, paidProviders, watchLink
 *   - Free providers: Ad-supported and free services
 *   - Paid providers: Subscription-based services
 *
 * The endpoint fetches details and watch providers in parallel for performance.
 * Country detection uses HTTP headers from hosting platforms (Vercel, Cloudflare, etc.).
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
  detectedCountry: string | null;
  availability: AvailabilityResult;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> | { type: string; id: string } }
) {
  // Rate limiting - 50 requests per 15 minutes per IP (lower than search)
  const identifier = getClientIdentifier(req);
  const rateLimitResult = checkRateLimit(identifier, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50,
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
          'X-RateLimit-Limit': '50',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetDate.toISOString(),
        },
      }
    );
  }

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
        detectedCountry: null,
        availability: { userCountry: null, otherCountries: [] },
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
        detectedCountry: null,
        availability: { userCountry: null, otherCountries: [] },
      };
    }

    // Detect user's country from request headers
    const detectedCountry = detectUserCountry(req);
    const availableCountries = Object.keys(watchProvidersResponse.results || {});
    const validatedCountry = validateCountryCode(detectedCountry, availableCountries);

    // Map TMDB watch providers to our availability model with user's country
    // This separates user's country (if detected) from other countries
    normalizedTitle.detectedCountry = validatedCountry;
    normalizedTitle.availability = mapAvailability(watchProvidersResponse, validatedCountry);

    // Add rate limit headers to successful response
    const resetDate = new Date(rateLimitResult.resetTime);
    return NextResponse.json(normalizedTitle, {
      headers: {
        'X-RateLimit-Limit': '50',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': resetDate.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof TmdbError) {
      return NextResponse.json(
        { error: 'Error fetching data from TMDB.' },
        { status: mapTmdbErrorToHttpStatus(error) }
      );
    } else if (error instanceof Error) {
      logger.error(`API Error for /api/title/${type}/${id}`, { error: error.message });
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    // Fallback for unknown errors
    logger.error(`Unknown error for /api/title/${type}/${id}`, { error });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
