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

import { TmdbWatchProviderInfo, TmdbWatchProvidersResponse } from './tmdbTypes';
import { getCountryName, COUNTRY_NAMES } from './utils/countries';

// --- Internal Availability Model ---

export interface CountryAvailability {
  countryCode: string;
  countryName: string;
  freeProviders: string[];
  paidProviders: string[];
  watchLink?: string;
}

export interface AvailabilityResult {
  userCountry: CountryAvailability | null; // Single country or null
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
  if (userCountryCode && userCountryCode in COUNTRY_NAMES) {
    const countryData = tmdbResults[userCountryCode];
    const flatrateProviders = countryData?.flatrate || [];
    const adsProviders = countryData?.ads || [];
    const freeProviders = countryData?.free || [];

    userCountry = {
      countryCode: userCountryCode,
      countryName: getCountryName(userCountryCode),
      freeProviders: getFreeProviders(adsProviders, freeProviders),
      paidProviders: getPaidProviders(flatrateProviders),
      watchLink: countryData?.link,
    };
  }

  // 2. Process other countries (exclude user's country if it was processed)
  for (const countryCode in tmdbResults) {
    // Skip user's country if it was already processed
    if (userCountryCode && countryCode === userCountryCode) {
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
    userCountry,
    otherCountries,
  };
};
