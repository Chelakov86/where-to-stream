/**
 * Availability Mapper Module
 *
 * Transforms TMDB watch provider data into a structured availability model
 * that groups countries by preference and normalizes provider information.
 *
 * Key Features:
 * - Groups countries into "preferred" (DE, GB, US, CA) and "other" categories
 * - Detects Netflix availability by provider name matching
 * - Extracts all streaming providers from flatrate, ads, and free categories
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
 * - Streaming providers: Includes all providers from `flatrate`, `ads`, and `free`
 *   categories from TMDB. All providers including Netflix are shown in the services list.
 * - Other countries: Only included if they have at least one streaming service.
 *   Countries with only buy/rent options are excluded.
 */

import { PREFERRED_COUNTRIES } from './config';
import { TmdbWatchProviderInfo, TmdbWatchProvidersResponse } from './tmdbTypes';
import { getCountryName } from './utils/countries';

// --- Internal Availability Model ---

export interface CountryAvailability {
  countryCode: string;
  countryName: string;
  hasNetflix: boolean;
  allStreamingProviders: string[];
  watchLink?: string;
}

export interface AvailabilityResult {
  preferredCountries: CountryAvailability[];
  otherCountries: CountryAvailability[];
}

// --- Constants ---

/**
 * Netflix provider names for detection.
 * Note: A more robust solution could use TMDB provider IDs (e.g., 8, 1773),
 * but name matching is simpler and works for most cases.
 */
const NETFLIX_PROVIDER_NAME = 'Netflix';
const NETFLIX_ADS_PROVIDER_NAME = 'Netflix Standard with Ads';

// --- Helper Functions ---

/**
 * Checks if Netflix is available in the given provider list.
 * Uses provider name matching (case-sensitive).
 * Detects both "Netflix" and "Netflix Standard with Ads" as Netflix options.
 */
const hasNetflix = (providers: TmdbWatchProviderInfo[] = []): boolean => {
  return providers.some(
    (p) =>
      p.provider_name === NETFLIX_PROVIDER_NAME || p.provider_name === NETFLIX_ADS_PROVIDER_NAME
  );
};

/**
 * Extracts unique provider names from all available provider categories and returns them sorted.
 * This includes providers from flatrate, ads, and free categories.
 * Includes all providers including Netflix.
 */
const getAllStreamingProviders = (
  flatrateProviders: TmdbWatchProviderInfo[] = [],
  adsProviders: TmdbWatchProviderInfo[] = [],
  freeProviders: TmdbWatchProviderInfo[] = []
): string[] => {
  const providers = new Set<string>();

  // Include all provider categories
  [...flatrateProviders, ...adsProviders, ...freeProviders].forEach((p) => {
    providers.add(p.provider_name);
  });

  return Array.from(providers).sort();
};

// --- Mapper ---

/**
 * Maps TMDB watch providers response to a structured availability model.
 *
 * Processing steps:
 * 1. Process preferred countries (DE, GB, US, CA) in order - always included even if no providers
 * 2. Process other countries - only included if they have streaming services (flatrate, ads, or free)
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
    const adsProviders = countryData?.ads || [];
    const freeProviders = countryData?.free || [];
    const allProviders = [...flatrateProviders, ...adsProviders, ...freeProviders];

    preferredCountries.push({
      countryCode,
      countryName: getCountryName(countryCode),
      hasNetflix: hasNetflix(allProviders),
      allStreamingProviders: getAllStreamingProviders(flatrateProviders, adsProviders, freeProviders),
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
    const adsProviders = countryData?.ads || [];
    const freeProviders = countryData?.free || [];
    // Check all provider categories for Netflix detection
    const allProviders = [
      ...flatrateProviders,
      ...adsProviders,
      ...freeProviders,
      ...(countryData?.buy || []),
      ...(countryData?.rent || []),
    ];

    // Only include countries with streaming services (flatrate, ads, or free)
    const hasNetflixAvailability = hasNetflix(allProviders);
    const streamingProviders = getAllStreamingProviders(flatrateProviders, adsProviders, freeProviders);

    if (hasNetflixAvailability || streamingProviders.length > 0) {
      otherCountries.push({
        countryCode,
        countryName: getCountryName(countryCode),
        hasNetflix: hasNetflixAvailability,
        allStreamingProviders: streamingProviders,
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
