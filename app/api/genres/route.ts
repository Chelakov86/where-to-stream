/**
 * API Route: GET /api/genres
 *
 * Fetches genre lists for both movies and TV shows from TMDB in parallel,
 * then returns them combined in a single response. Uses the cached TMDB
 * API methods (24-hour TTL), since genres change infrequently.
 *
 * @returns JSON response with structure:
 *   {
 *     movie: Genre[],
 *     tv: Genre[]
 *   }
 */
import { getMovieGenres, getTvGenres } from '@/app/tmdbApi';
import { withRouteGuard } from '@/app/api/routeGuard';
import { getClientIdentifier } from '@/app/utils/rateLimiter';
import { RATE_LIMIT_CONFIG } from '@/app/config';

export async function GET(request: Request) {
  return withRouteGuard(
    {
      identifier: getClientIdentifier(request),
      rateLimit: RATE_LIMIT_CONFIG.genres,
      context: 'genres route',
    },
    async () => {
      const [movie, tv] = await Promise.all([getMovieGenres(), getTvGenres()]);
      return new Response(JSON.stringify({ movie: movie.genres, tv: tv.genres }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  );
}
