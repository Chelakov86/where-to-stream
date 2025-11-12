/**
 * Availability Mapper Module
 *
 * Transforms TMDB watch provider data into a structured availability model
 * that groups countries by preference and normalizes provider information.
 *
 * Key Features:
 * - Groups countries into "preferred" (DE, GB, US, CA) and "other" categories
 * - Detects Netflix availability by provider name matching
 * - Extracts free/ad-supported providers from flatrate providers
 * - Maps country codes to full country names with fallback to code
 * - Always includes preferred countries in results (even if no providers)
 *
 * Assumptions:
 * - Netflix detection: Uses provider name matching ("Netflix"). A more robust
 *   solution could use TMDB provider IDs (e.g., 8, 1773) but name matching
 *   is simpler and works for most cases.
 * - Preferred countries order: Fixed order [DE, GB, US, CA] as defined in config.
 *   This order is preserved in the output.
 * - Country name mapping: Uses ISO 3166-1 alpha-2 codes. If a code is not found
 *   in the mapping, the code itself is used as the display name.
 * - Free/ad-supported providers: Currently extracted from the `flatrate` category
 *   only. The `ads` and `free` categories from TMDB are not included in the
 *   current implementation.
 * - Other countries: Only included if they have at least one provider (Netflix
 *   or free/ad-supported). Countries with only buy/rent options are excluded.
 */

import { PREFERRED_COUNTRIES } from './config';
import { TmdbWatchProviderInfo, TmdbWatchProvidersResponse } from './tmdbTypes';
import { getCountryName } from './utils/countries';

// --- Internal Availability Model ---

export interface CountryAvailability {
  countryCode: string;
  countryName: string;
  hasNetflix: boolean;
  freeOrAdsProviders: string[];
  watchLink?: string;
}

export interface AvailabilityResult {
  preferredCountries: CountryAvailability[];
  otherCountries: CountryAvailability[];
}

// --- Constants ---

/**
 * Netflix provider name for detection.
 * Note: A more robust solution could use TMDB provider IDs (e.g., 8, 1773),
 * but name matching is simpler and works for most cases.
 */
const NETFLIX_PROVIDER_NAME = 'Netflix';

// --- Helper Functions ---

/**
 * Checks if Netflix is available in the given provider list.
 * Uses provider name matching (case-sensitive).
 */
const hasNetflix = (providers: TmdbWatchProviderInfo[] = []): boolean => {
  return providers.some((p) => p.provider_name === NETFLIX_PROVIDER_NAME);
};

/**
 * Extracts unique provider names from flatrate providers and returns them sorted.
 * This represents free/ad-supported streaming providers.
 * Note: Currently only uses flatrate category; ads and free categories are not included.
 * Excludes Netflix since it's shown in a dedicated column.
 */
const getFreeOrAdsProviders = (flatrateProviders: TmdbWatchProviderInfo[] = []): string[] => {
  const providers = new Set<string>();
  flatrateProviders.forEach((p) => {
    // Exclude Netflix since it's shown in a dedicated column
    if (p.provider_name !== NETFLIX_PROVIDER_NAME) {
      providers.add(p.provider_name);
    }
  });
  return Array.from(providers).sort();
};

// --- Mapper ---

/**
 * Maps TMDB watch providers response to a structured availability model.
 *
 * Processing steps:
 * 1. Process preferred countries (DE, GB, US, CA) in order - always included even if no providers
 * 2. Process other countries - only included if they have Netflix or free/ad-supported providers
 * 3. Sort other countries alphabetically by country name
 *
 * @param tmdbProviders - Raw watch providers response from TMDB API
 * @returns AvailabilityResult with preferredCountries and otherCountries arrays
 */
export const mapAvailability = (tmdbProviders: TmdbWatchProvidersResponse): AvailabilityResult => {
  const tmdbResults = tmdbProviders.results || {};
  const preferredCountries: CountryAvailability[] = [];
  const otherCountries: CountryAvailability[] = [];

  const processedPreferred = new Set<string>();

  // 1. Process preferred countries
  for (const countryCode of PREFERRED_COUNTRIES) {
    const countryData = tmdbResults[countryCode];
    const flatrateProviders = countryData?.flatrate || [];
    const allProviders = [...flatrateProviders];

    preferredCountries.push({
      countryCode,
      countryName: getCountryName(countryCode),
      hasNetflix: hasNetflix(allProviders),
      freeOrAdsProviders: getFreeOrAdsProviders(flatrateProviders),
      watchLink: countryData?.link,
    });
    processedPreferred.add(countryCode);
  }

  // 2. Process other countries
  for (const countryCode in tmdbResults) {
    if (processedPreferred.has(countryCode)) {
      continue;
    }

    const countryData = tmdbResults[countryCode];
    const flatrateProviders = countryData?.flatrate || [];
    // Check all provider categories for Netflix detection
    const allProviders = [
      ...flatrateProviders,
      ...(countryData?.buy || []),
      ...(countryData?.rent || []),
    ];

    // Only include countries with Netflix or free/ad-supported services
    const hasNetflixAvailability = hasNetflix(allProviders);
    const freeProviders = getFreeOrAdsProviders(flatrateProviders);

    if (hasNetflixAvailability || freeProviders.length > 0) {
      otherCountries.push({
        countryCode,
        countryName: getCountryName(countryCode),
        hasNetflix: hasNetflixAvailability,
        freeOrAdsProviders: freeProviders,
        watchLink: countryData?.link,
      });
    }
  }

  // 3. Sort other countries by name
  otherCountries.sort((a, b) => a.countryName.localeCompare(b.countryName));

  return {
    preferredCountries,
    otherCountries,
  };
};
