/**
 * API Route: GET /api/providers
 *
 * Fetches the combined list of watch providers for both movies and TV shows.
 * Deduplicates by provider_id and sorts by display_priority.
 */

import { getMovieWatchProvidersList, getTvWatchProvidersList } from '@/app/tmdbApi';
import { TmdbWatchProviderInfo } from '@/app/tmdbTypes';
import { WatchProvider } from '@/app/types';
import { buildTmdbImageUrl } from '@/app/utils/tmdb';
import { withRouteGuard } from '@/app/api/routeGuard';
import { getClientIdentifier } from '@/app/utils/rateLimiter';
import { RATE_LIMIT_CONFIG } from '@/app/config';

const toWatchProvider = (provider: TmdbWatchProviderInfo): WatchProvider => ({
  id: provider.provider_id,
  name: provider.provider_name,
  logoUrl: buildTmdbImageUrl(provider.logo_path, 'w92'),
  priority: provider.display_priority,
});

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
      rateLimit: RATE_LIMIT_CONFIG.providers,
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

      // Combine and deduplicate by provider id
      const providerMap = new Map<number, WatchProvider>();

      // Add movie providers
      for (const provider of movieProviders.results) {
        providerMap.set(provider.provider_id, toWatchProvider(provider));
      }

      // Add TV providers (skip if already present from movies)
      for (const provider of tvProviders.results) {
        if (!providerMap.has(provider.provider_id)) {
          providerMap.set(provider.provider_id, toWatchProvider(provider));
        }
      }

      // Convert to array and sort by priority (lower is better)
      const providers = Array.from(providerMap.values()).sort((a, b) => a.priority - b.priority);

      return new Response(JSON.stringify({ providers }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  );
}
