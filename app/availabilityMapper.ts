/**
 * Availability Mapper Module
 *
 * Transforms TMDB watch provider data into the app's availability model: every
 * country with at least one offer, with providers grouped into subscription,
 * free (free + ad-supported), rent and buy.
 *
 * Assumptions:
 * - Free providers merge TMDB's `free` and `ads` categories, de-duplicated by provider id.
 * - Countries with no offers in any category are omitted.
 * - Country name mapping uses ISO 3166-1 alpha-2 codes, falling back to the code itself.
 */

import {
  TmdbCountryWatchProviders,
  TmdbWatchProviderInfo,
  TmdbWatchProvidersResponse,
} from './tmdbTypes';
import {
  AvailabilityByCountry,
  CountryAvailability,
  NormalizedSearchResult,
  ProviderRef,
} from './types';
import { getCountryName, COUNTRY_NAMES } from './utils/countries';
import { buildTmdbImageUrl } from './utils/tmdb';
import { logger } from './utils/logger';
import { DEFAULT_COUNTRY } from './config';

/**
 * The streaming category rule: a provider streams in a region when it appears
 * in the flatrate, ads, or free categories. Rent and buy are not streaming.
 */
export function isStreamingProvider(
  providers: TmdbCountryWatchProviders,
  providerIds: number[]
): boolean {
  const streamingProviders = [
    ...(providers.flatrate || []),
    ...(providers.ads || []),
    ...(providers.free || []),
  ];
  return streamingProviders.some((p) => providerIds.includes(p.provider_id));
}

/**
 * Whether a country code is one the app knows about (validated against the
 * country name table). Invalid codes are treated as undetected.
 */
export function isKnownCountryCode(code: string | null): code is string {
  return code !== null && code in COUNTRY_NAMES;
}

/**
 * Filters search results down to titles available on at least one selected
 * provider in the watch region, applying the streaming category rule.
 * Items whose provider lookup fails are excluded (treated as unavailable).
 *
 * @param results - Normalized search results
 * @param options - Watch region and selected provider IDs
 * @param fetchWatchProviders - Injected fetcher (movie/tv watch providers)
 * @returns Results available on a selected provider
 */
export async function filterResultsByProvider(
  results: NormalizedSearchResult[],
  options: { watchRegion?: string; providerIds?: number[] },
  fetchWatchProviders: (type: 'movie' | 'tv', id: number) => Promise<TmdbWatchProvidersResponse>
): Promise<NormalizedSearchResult[]> {
  if (
    (!options.watchRegion && (!options.providerIds || options.providerIds.length === 0)) ||
    results.length === 0
  ) {
    return results;
  }

  // If only a region is selected, we can't filter efficiently without providers
  if (!options.providerIds || options.providerIds.length === 0) {
    return results;
  }

  const region = options.watchRegion || DEFAULT_COUNTRY;

  const checks = await Promise.all(
    results.map(async (item) => {
      try {
        const providersData = await fetchWatchProviders(item.type, item.id);
        const regionData = providersData.results[region];
        if (!regionData) {
          return false;
        }
        return isStreamingProvider(regionData, options.providerIds!);
      } catch (error) {
        logger.error(`Failed to fetch providers for ${item.type} ${item.id}`, { error });
        return false;
      }
    })
  );

  return results.filter((_, index) => checks[index]);
}

// --- Helper Functions ---

/**
 * Converts TMDB provider entries to provider refs, de-duplicated by id and
 * ordered by TMDB's display priority.
 */
const toProviderRefs = (...lists: (TmdbWatchProviderInfo[] | undefined)[]): ProviderRef[] => {
  const byId = new Map<number, TmdbWatchProviderInfo>();
  for (const provider of lists.flat()) {
    if (provider && !byId.has(provider.provider_id)) {
      byId.set(provider.provider_id, provider);
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => (a.display_priority ?? 0) - (b.display_priority ?? 0))
    .map((p) => {
      const ref: ProviderRef = { id: p.provider_id, name: p.provider_name };
      const logoUrl = buildTmdbImageUrl(p.logo_path, 'w92');
      if (logoUrl) {
        ref.logoUrl = logoUrl;
      }
      return ref;
    });
};

/**
 * Builds a CountryAvailability object from TMDB country watch provider data.
 */
export const createCountryAvailability = (
  countryCode: string,
  countryData?: TmdbCountryWatchProviders
): CountryAvailability => {
  const availability: CountryAvailability = {
    countryCode,
    countryName: getCountryName(countryCode),
    flatrate: toProviderRefs(countryData?.flatrate),
    free: toProviderRefs(countryData?.free, countryData?.ads),
    rent: toProviderRefs(countryData?.rent),
    buy: toProviderRefs(countryData?.buy),
  };
  if (countryData?.link) {
    availability.watchLink = countryData.link;
  }
  return availability;
};

// --- Mapper ---

/**
 * Maps a TMDB watch providers response to availability keyed by country code.
 * Countries without any offer are omitted.
 *
 * @param tmdbProviders - Raw watch providers response from TMDB API
 * @returns Availability keyed by ISO country code
 */
export const mapAvailability = (
  tmdbProviders: TmdbWatchProvidersResponse
): AvailabilityByCountry => {
  const tmdbResults = tmdbProviders.results || {};
  const availability: AvailabilityByCountry = {};

  for (const countryCode of Object.keys(tmdbResults)) {
    const country = createCountryAvailability(countryCode, tmdbResults[countryCode]);
    const offerCount =
      country.flatrate.length + country.free.length + country.rent.length + country.buy.length;
    if (offerCount > 0) {
      availability[countryCode] = country;
    }
  }

  return availability;
};
