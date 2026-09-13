import { NextRequest, NextResponse } from 'next/server';
import {
  getMovieDetails,
  getMovieWatchProviders,
  getTvDetails,
  getTvWatchProviders,
} from '@/app/tmdbApi';
import { TitleDetails } from '@/app/types';
import { mapAvailability, isKnownCountryCode } from '@/app/availabilityMapper';
import { normalizeTmdbMedia, mapCast, findTrailerUrl } from '@/app/titleNormalizer';
import { buildTmdbImageUrl } from '@/app/utils/tmdb';
import { withRouteGuard, rateLimitHeaders } from '@/app/api/routeGuard';
import { getClientIdentifier } from '@/app/utils/rateLimiter';
import { RATE_LIMIT_CONFIG } from '@/app/config';
import { detectUserCountry } from '@/app/utils/countryDetection';

/**
 * API route handler for fetching detailed information about a specific movie or TV show.
 *
 * GET /api/title/:type/:id
 *
 * Fetches comprehensive details including metadata (title, year, genres, overview, rating,
 * runtime, cast, trailer) and streaming availability for every country, grouped into
 * subscription, free, rent and buy offers.
 *
 * Path Parameters:
 * - type: "movie" | "tv" (required)
 * - id: TMDB ID as positive integer (required)
 *
 * Returns a TitleDetails object with:
 * - Metadata (id, type, title, originalTitle, year, genres, overview, tagline, rating, voteCount,
 *   posterUrl, backdropUrl, runtime, seasons, episodes, language, cast, trailerUrl)
 * - detectedCountry: User's country code from hosting headers (null if detection failed)
 * - availability: Offers keyed by country code
 *
 * The endpoint fetches details and watch providers in parallel for performance.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> | { type: string; id: string } }
) {
  return withRouteGuard(
    {
      identifier: getClientIdentifier(req),
      rateLimit: RATE_LIMIT_CONFIG.title,
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

      // Detect user's country from request headers; invalid codes are treated as undetected
      const detectedCountry = detectUserCountry(req);
      const validatedCountry = isKnownCountryCode(detectedCountry) ? detectedCountry : null;

      let title: TitleDetails;

      if (type === 'movie') {
        const [details, watchProviders] = await Promise.all([
          getMovieDetails(numericId),
          getMovieWatchProviders(numericId),
        ]);
        title = {
          ...normalizeTmdbMedia(details, 'movie'),
          genres: details.genres,
          tagline: details.tagline || undefined,
          voteCount: details.vote_count,
          backdropUrl: buildTmdbImageUrl(details.backdrop_path, 'w1280'),
          language: details.original_language,
          cast: mapCast(details),
          trailerUrl: findTrailerUrl(details),
          detectedCountry: validatedCountry,
          availability: mapAvailability(watchProviders),
        };
      } else {
        const [details, watchProviders] = await Promise.all([
          getTvDetails(numericId),
          getTvWatchProviders(numericId),
        ]);
        // TV shows use first_air_date instead of release_date, and name instead of title
        title = {
          ...normalizeTmdbMedia(details, 'tv'),
          genres: details.genres,
          tagline: details.tagline || undefined,
          voteCount: details.vote_count,
          backdropUrl: buildTmdbImageUrl(details.backdrop_path, 'w1280'),
          seasons: details.number_of_seasons,
          episodes: details.number_of_episodes,
          language: details.original_language,
          cast: mapCast(details),
          trailerUrl: findTrailerUrl(details),
          detectedCountry: validatedCountry,
          availability: mapAvailability(watchProviders),
        };
      }

      return NextResponse.json(title, {
        headers: rateLimitHeaders(rateLimitResult, RATE_LIMIT_CONFIG.title.maxRequests),
      });
    }
  );
}
