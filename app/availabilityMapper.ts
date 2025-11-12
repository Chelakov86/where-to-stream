
import { PREFERRED_COUNTRIES } from './config';
import { TmdbWatchProviderInfo, TmdbWatchProvidersResponse } from './tmdbTypes';

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

const NETFLIX_PROVIDER_NAME = "Netflix";
// A more robust solution could use a set of known Netflix provider IDs
// const NETFLIX_PROVIDER_IDS = new Set([8, 1773]); 

// A simple map for country codes to names.
// In a real app, this might come from a library or a more extensive list.
const COUNTRY_NAMES: Record<string, string> = {
  DE: 'Germany',
  GB: 'United Kingdom',
  US: 'United States',
  CA: 'Canada',
  FR: 'France',
  JP: 'Japan',
  AU: 'Australia',
};

// --- Helper Functions ---

const getCountryName = (code: string): string => COUNTRY_NAMES[code] || code;

const hasNetflix = (providers: TmdbWatchProviderInfo[] = []): boolean => {
    return providers.some(p => p.provider_name === NETFLIX_PROVIDER_NAME);
}

const getFreeOrAdsProviders = (
    flatrateProviders: TmdbWatchProviderInfo[] = []
): string[] => {
    const providers = new Set<string>();
    flatrateProviders.forEach(p => providers.add(p.provider_name));
    return Array.from(providers).sort();
}

// --- Mapper ---

export const mapAvailability = (tmdbProviders: TmdbWatchProvidersResponse): AvailabilityResult => {
    const tmdbResults = tmdbProviders.results || {};
    const preferredCountries: CountryAvailability[] = [];
    const otherCountries: CountryAvailability[] = [];

    const processedPreferred = new Set<string>();

    // 1. Process preferred countries
    for (const countryCode of PREFERRED_COUNTRIES) {
        const countryData = tmdbResults[countryCode];
        const allProviders = [
            ...(countryData?.flatrate || []),
            // ...(countryData?.ads || []), // Removed
            // ...(countryData?.free || []), // Removed
        ];

        preferredCountries.push({
            countryCode,
            countryName: getCountryName(countryCode),
            hasNetflix: hasNetflix(allProviders),
            freeOrAdsProviders: getFreeOrAdsProviders(countryData?.flatrate), // Changed
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
        const allProviders = [
            ...(countryData?.flatrate || []),
            // ...(countryData?.ads || []), // Removed
            // ...(countryData?.free || []), // Removed
            ...(countryData?.buy || []),
            ...(countryData?.rent || []),
        ];

        if (allProviders.length > 0) {
            otherCountries.push({
                countryCode,
                countryName: getCountryName(countryCode),
                hasNetflix: hasNetflix(allProviders),
                freeOrAdsProviders: getFreeOrAdsProviders(countryData?.flatrate), // Changed
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
