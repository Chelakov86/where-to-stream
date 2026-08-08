/**
 * API Route: GET /api/providers
 *
 * Fetches the combined list of watch providers for both movies and TV shows.
 * Deduplicates by provider_id and sorts by display_priority.
 */

import { getMovieWatchProvidersList, getTvWatchProvidersList } from '@/app/tmdbApi';
import { WatchProvider } from '@/app/types';
import { withRouteGuard } from '@/app/api/routeGuard';
import { getClientIdentifier } from '@/app/utils/rateLimiter';

/**
 * GET /api/providers
 *
 * Returns a combined, deduplicated list of watch providers.
 *
 * @returns JSON response with providers array
 */
export async function GET(request: Request) {
  return withRouteGuard(
    {
      identifier: getClientIdentifier(request),
      rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
      context: 'providers route',
    },
    async () => {
      const { searchParams } = new URL(request.url);
      const watchRegion = searchParams.get('watchRegion') || undefined;

      // Fetch both movie and TV providers in parallel
      const [movieProviders, tvProviders] = await Promise.all([
        getMovieWatchProvidersList(watchRegion),
        getTvWatchProvidersList(watchRegion),
      ]);

      // Combine and deduplicate by provider_id
      const providerMap = new Map<number, WatchProvider>();

      // Add movie providers
      for (const provider of movieProviders.results) {
        providerMap.set(provider.provider_id, provider);
      }

      // Add TV providers (will overwrite if already exists, which is fine)
      for (const provider of tvProviders.results) {
        if (!providerMap.has(provider.provider_id)) {
          providerMap.set(provider.provider_id, provider);
        }
      }

      // Convert to array and sort by display_priority (lower is better)
      const providers = Array.from(providerMap.values()).sort(
        (a, b) => a.display_priority - b.display_priority
      );

      return new Response(JSON.stringify({ providers }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  );
}
