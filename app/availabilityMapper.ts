/**
 * Availability Mapper Module
 *
 * Transforms TMDB watch provider data into a structured availability model
 * that shows user's detected country separately and categorizes providers by type.
 *
 * Key Features:
 * - Detects user's country automatically via HTTP headers
 * - Shows user's country separately (even if no providers available)
 * - Separates providers into free (ads, free) and paid (flatrate) categories
 * - Maps country codes to full country names with fallback to code
 * - Falls back to showing all countries if detection fails
 *
 * Assumptions:
 * - Free providers: Includes providers from `ads` and `free` categories (ad-supported and free services)
 * - Paid providers: Includes providers from `flatrate` category (subscription services like Netflix, Disney+, etc.)
 * - Country name mapping: Uses ISO 3166-1 alpha-2 codes. If a code is not found
 *   in the mapping, the code itself is used as the display name.
 * - Other countries: Only included if they have at least one streaming service.
 *   Countries with only buy/rent options are excluded.
 */

import {
  TmdbCountryWatchProviders,
  TmdbWatchProviderInfo,
  TmdbWatchProvidersResponse,
} from './tmdbTypes';
import { CountryAvailability, NormalizedSearchResult } from './types';
import { getCountryName, COUNTRY_NAMES } from './utils/countries';
import { logger } from './utils/logger';

export interface AvailabilityResult {
  userCountry: CountryAvailability | null; // Single country or null
  otherCountries: CountryAvailability[];
}

/**
 * Region used when filtering by providers but no watch region is selected.
 */
export const DEFAULT_WATCH_REGION = 'US';

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

  const region = options.watchRegion || DEFAULT_WATCH_REGION;

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
 * Extracts unique provider names from free provider categories (ads and free) and returns them sorted.
 * Free providers include ad-supported services and completely free services.
 */
const getFreeProviders = (
  adsProviders: TmdbWatchProviderInfo[] = [],
  freeProviders: TmdbWatchProviderInfo[] = []
): string[] => {
  const providers = new Set<string>();

  // Combine ads and free categories
  [...adsProviders, ...freeProviders].forEach((p) => {
    providers.add(p.provider_name);
  });

  return Array.from(providers).sort();
};

/**
 * Extracts unique provider names from paid provider categories (flatrate) and returns them sorted.
 * Paid providers are subscription-based streaming services.
 */
const getPaidProviders = (flatrateProviders: TmdbWatchProviderInfo[] = []): string[] => {
  const providers = new Set<string>();

  flatrateProviders.forEach((p) => {
    providers.add(p.provider_name);
  });

  return Array.from(providers).sort();
};

/**
 * Helper to build a CountryAvailability object from TMDB country watch provider data.
 */
const createCountryAvailability = (
  countryCode: string,
  countryData?: TmdbCountryWatchProviders
): CountryAvailability => {
  const flatrateProviders = countryData?.flatrate || [];
  const adsProviders = countryData?.ads || [];
  const freeProviders = countryData?.free || [];

  return {
    countryCode,
    countryName: getCountryName(countryCode),
    freeProviders: getFreeProviders(adsProviders, freeProviders),
    paidProviders: getPaidProviders(flatrateProviders),
    watchLink: countryData?.link,
  };
};

// --- Mapper ---

/**
 * Maps TMDB watch providers response to a structured availability model.
 *
 * Processing steps:
 * 1. If userCountryCode is provided and exists in TMDB results:
 *    - Create userCountry object (even if no providers - will show "not available" message)
 *    - Exclude this country from otherCountries
 * 2. If userCountryCode is null or not in TMDB results:
 *    - Set userCountry to null
 *    - Include ALL countries with providers in otherCountries
 * 3. Sort otherCountries alphabetically by country name
 *
 * @param tmdbProviders - Raw watch providers response from TMDB API
 * @param userCountryCode - User's detected country code (null if detection failed)
 * @returns AvailabilityResult with userCountry and otherCountries
 */
export const mapAvailability = (
  tmdbProviders: TmdbWatchProvidersResponse,
  userCountryCode: string | null
): AvailabilityResult => {
  const tmdbResults = tmdbProviders.results || {};
  let userCountry: CountryAvailability | null = null;
  const otherCountries: CountryAvailability[] = [];

  // 1. Process user's country if detected and valid
  if (isKnownCountryCode(userCountryCode)) {
    userCountry = createCountryAvailability(userCountryCode, tmdbResults[userCountryCode]);
  }

  // 2. Process other countries (exclude user's country if it was processed)
  for (const countryCode in tmdbResults) {
    // Skip user's country if it was already processed
    if (userCountryCode && countryCode === userCountryCode) {
      continue;
    }

    const country = createCountryAvailability(countryCode, tmdbResults[countryCode]);

    // Only include countries with streaming services (flatrate, ads, or free)
    if (country.freeProviders.length > 0 || country.paidProviders.length > 0) {
      otherCountries.push(country);
    }
  }

  // 3. Sort other countries by name
  otherCountries.sort((a, b) => a.countryName.localeCompare(b.countryName));

  return {
    userCountry,
    otherCountries,
  };
};
