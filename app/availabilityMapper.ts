/**
 * Availability Mapper Module
 *
 * Transforms TMDB watch provider data into a structured availability model
 * that groups countries by preference and categorizes providers by type.
 *
 * Key Features:
 * - Groups countries into "preferred" (DE, GB, US, CA) and "other" categories
 * - Separates providers into free (ads, free) and paid (flatrate) categories
 * - Maps country codes to full country names with fallback to code
 * - Always includes preferred countries in results (even if no providers)
 *
 * Assumptions:
 * - Free providers: Includes providers from `ads` and `free` categories (ad-supported and free services)
 * - Paid providers: Includes providers from `flatrate` category (subscription services like Netflix, Disney+, etc.)
 * - Preferred countries order: Fixed order [DE, GB, US, CA] as defined in config.
 *   This order is preserved in the output.
 * - Country name mapping: Uses ISO 3166-1 alpha-2 codes. If a code is not found
 *   in the mapping, the code itself is used as the display name.
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
  freeProviders: string[];
  paidProviders: string[];
  watchLink?: string;
}

export interface AvailabilityResult {
  preferredCountries: CountryAvailability[];
  otherCountries: CountryAvailability[];
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

    preferredCountries.push({
      countryCode,
      countryName: getCountryName(countryCode),
      freeProviders: getFreeProviders(adsProviders, freeProviders),
      paidProviders: getPaidProviders(flatrateProviders),
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

    // Only include countries with streaming services (flatrate, ads, or free)
    const free = getFreeProviders(adsProviders, freeProviders);
    const paid = getPaidProviders(flatrateProviders);

    if (free.length > 0 || paid.length > 0) {
      otherCountries.push({
        countryCode,
        countryName: getCountryName(countryCode),
        freeProviders: free,
        paidProviders: paid,
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
