import { NextRequest, NextResponse } from 'next/server';
import {
  getMovieDetails,
  getMovieWatchProviders,
  getTvDetails,
  getTvWatchProviders,
} from '@/app/tmdbApi';
import { mapAvailability, AvailabilityResult, isKnownCountryCode } from '@/app/availabilityMapper';
import { normalizeTmdbMedia } from '@/app/titleNormalizer';
import { withRouteGuard, rateLimitHeaders } from '@/app/api/routeGuard';
import { getClientIdentifier } from '@/app/utils/rateLimiter';
import { detectUserCountry } from '@/app/utils/countryDetection';

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
  return withRouteGuard(
    {
      identifier: getClientIdentifier(req),
      rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 },
      context: `title route (${req.nextUrl.pathname})`,
    },
    async (rateLimitResult) => {
      const resolvedParams = await Promise.resolve(params);
      const { type, id } = resolvedParams;

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
          ...normalizeTmdbMedia(movieDetails, 'movie'),
          genres: movieDetails.genres,
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
          ...normalizeTmdbMedia(tvDetails, 'tv'),
          genres: tvDetails.genres,
          detectedCountry: null,
          availability: { userCountry: null, otherCountries: [] },
        };
      }

      // Detect user's country from request headers; invalid codes are treated as undetected
      const detectedCountry = detectUserCountry(req);
      const validatedCountry = isKnownCountryCode(detectedCountry) ? detectedCountry : null;

      // Map TMDB watch providers to our availability model with user's country
      // This separates user's country (if detected) from other countries
      normalizedTitle.detectedCountry = validatedCountry;
      normalizedTitle.availability = mapAvailability(watchProvidersResponse, validatedCountry);

      return NextResponse.json(normalizedTitle, {
        headers: rateLimitHeaders(rateLimitResult, 50),
      });
    }
  );
}
