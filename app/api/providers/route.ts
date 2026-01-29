/**
 * API Route: GET /api/providers
 *
 * Fetches the combined list of watch providers for both movies and TV shows.
 * Deduplicates by provider_id and sorts by display_priority.
 */

import { getMovieWatchProvidersList, getTvWatchProvidersList } from '@/app/tmdbApi';
import { TmdbError } from '@/app/tmdbClient';
import { mapTmdbErrorToHttpStatus } from '@/app/api/errorMapping';
import { WatchProvider } from '@/app/types';
import { logger } from '@/app/utils/logger';

/**
 * GET /api/providers
 *
 * Returns a combined, deduplicated list of watch providers.
 *
 * @returns JSON response with providers array
 */
export async function GET() {
  try {
    // Fetch both movie and TV providers in parallel
    const [movieProviders, tvProviders] = await Promise.all([
      getMovieWatchProvidersList(),
      getTvWatchProvidersList(),
    ]);

    // Combine and deduplicate by provider_id
    const providerMap = new Map<number, WatchProvider>();

    // Add movie providers
    for (const provider of movieProviders.results) {
      providerMap.set(provider.provider_id, {
        provider_id: provider.provider_id,
        provider_name: provider.provider_name,
        logo_path: provider.logo_path,
        display_priority: provider.display_priority,
      });
    }

    // Add TV providers (will overwrite if already exists, which is fine)
    for (const provider of tvProviders.results) {
      if (!providerMap.has(provider.provider_id)) {
        providerMap.set(provider.provider_id, {
          provider_id: provider.provider_id,
          provider_name: provider.provider_name,
          logo_path: provider.logo_path,
          display_priority: provider.display_priority,
        });
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
  } catch (error) {
    if (error instanceof TmdbError) {
      const status = mapTmdbErrorToHttpStatus(error);
      logger.error('TMDB API error in providers route', {
        status: error.status,
        message: error.message,
      });
      return new Response(JSON.stringify({ error: error.message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger.error('Internal error in providers route', { error });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
