import { mapAvailability } from '../app/availabilityMapper';
import { TmdbWatchProvidersResponse } from '../app/tmdbTypes';
import { PREFERRED_COUNTRIES } from '../app/config';

// Mock PREFERRED_COUNTRIES to isolate tests from config changes
jest.mock('../app/config', () => ({
  PREFERRED_COUNTRIES: ['DE', 'GB', 'US', 'CA'],
}));

describe('mapAvailability', () => {
  it('should return empty lists when there is no availability', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {},
    };

    const result = mapAvailability(tmdbProviders);

    expect(result.preferredCountries).toHaveLength(PREFERRED_COUNTRIES.length);
    result.preferredCountries.forEach((c) => {
      expect(c.hasNetflix).toBe(false);
      expect(c.freeOrAdsProviders).toEqual([]);
      expect(c.watchLink).toBeUndefined();
    });
    expect(result.otherCountries).toEqual([]);
  });

  it('should map a full TMDB response to the internal model', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
        GB: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=GB',
        },
        FR: {
          // Other country
          link: 'https://www.themoviedb.org/movie/1/watch?locale=FR',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
        DE: {
          // Preferred, but no providers
          link: 'https://www.themoviedb.org/movie/1/watch?locale=DE',
        },
      },
    };

    const result = mapAvailability(tmdbProviders);

    // Check preferred countries
    expect(result.preferredCountries).toHaveLength(4);

    const usData = result.preferredCountries.find((c) => c.countryCode === 'US');
    expect(usData).toBeDefined();
    expect(usData?.countryName).toBe('United States');
    expect(usData?.hasNetflix).toBe(true);
    // Netflix should not appear in freeOrAdsProviders since it has its own column
    expect(usData?.freeOrAdsProviders).toEqual([]);
    expect(usData?.watchLink).toContain('locale=US');

    const gbData = result.preferredCountries.find((c) => c.countryCode === 'GB');
    expect(gbData).toBeDefined();
    expect(gbData?.countryName).toBe('United Kingdom');
    expect(gbData?.hasNetflix).toBe(false);
    expect(gbData?.freeOrAdsProviders).toEqual([]);

    const deData = result.preferredCountries.find((c) => c.countryCode === 'DE');
    expect(deData).toBeDefined();
    expect(deData?.countryName).toBe('Germany');
    expect(deData?.hasNetflix).toBe(false);
    expect(deData?.freeOrAdsProviders).toEqual([]);

    const caData = result.preferredCountries.find((c) => c.countryCode === 'CA');
    expect(caData).toBeDefined();
    expect(caData?.countryName).toBe('Canada');
    expect(caData?.hasNetflix).toBe(false);
    expect(caData?.freeOrAdsProviders).toEqual([]);

    // Check other countries
    expect(result.otherCountries).toHaveLength(1);
    const frData = result.otherCountries[0];
    expect(frData.countryCode).toBe('FR');
    expect(frData.countryName).toBe('France');
    expect(frData.hasNetflix).toBe(true);
    // Netflix should not appear in freeOrAdsProviders since it has its own column
    expect(frData.freeOrAdsProviders).toEqual([]);
  });

  it('should handle only non-preferred countries having availability', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        JP: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=JP',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
        AU: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=AU',
        },
      },
    };

    const result = mapAvailability(tmdbProviders);

    expect(result.preferredCountries).toHaveLength(4);
    result.preferredCountries.forEach((c) => {
      expect(c.hasNetflix).toBe(false);
      expect(c.freeOrAdsProviders).toEqual([]);
    });

    expect(result.otherCountries).toHaveLength(1);
    expect(result.otherCountries[0].countryCode).toBe('JP');
    expect(result.otherCountries[0].countryName).toBe('Japan');
  });

  it('should correctly identify unique and sorted free/ads providers', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
          flatrate: [
            { provider_id: 2, provider_name: 'Tubi TV', logo_path: '', display_priority: 0 },
            { provider_id: 1, provider_name: 'Freevee', logo_path: '', display_priority: 0 },
          ],
        },
      },
    };

    const result = mapAvailability(tmdbProviders);
    const usData = result.preferredCountries.find((c) => c.countryCode === 'US');
    expect(usData?.freeOrAdsProviders).toEqual(['Freevee', 'Tubi TV']);
  });

  it('should not list other countries if they have no providers', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        FR: {
          // No providers
          link: 'https://www.themoviedb.org/movie/1/watch?locale=FR',
        },
      },
    };
    const result = mapAvailability(tmdbProviders);
    expect(result.otherCountries).toHaveLength(0);
  });

  it('should exclude Netflix Standard with Ads from freeOrAdsProviders', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
            {
              provider_id: 1773,
              provider_name: 'Netflix Standard with Ads',
              logo_path: '',
              display_priority: 0,
            },
            { provider_id: 2, provider_name: 'Tubi TV', logo_path: '', display_priority: 0 },
          ],
        },
      },
    };

    const result = mapAvailability(tmdbProviders);
    const usData = result.preferredCountries.find((c) => c.countryCode === 'US');
    expect(usData).toBeDefined();
    expect(usData?.hasNetflix).toBe(true);
    // Both Netflix and Netflix Standard with Ads should be excluded from freeOrAdsProviders
    expect(usData?.freeOrAdsProviders).toEqual(['Tubi TV']);
  });

  it('should detect Netflix Standard with Ads as Netflix availability', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
          flatrate: [
            {
              provider_id: 1773,
              provider_name: 'Netflix Standard with Ads',
              logo_path: '',
              display_priority: 0,
            },
          ],
        },
      },
    };

    const result = mapAvailability(tmdbProviders);
    const usData = result.preferredCountries.find((c) => c.countryCode === 'US');
    expect(usData).toBeDefined();
    expect(usData?.hasNetflix).toBe(true);
    // Netflix Standard with Ads should be excluded from freeOrAdsProviders
    expect(usData?.freeOrAdsProviders).toEqual([]);
  });

  it('should not list other countries if they only have buy/rent providers (no Netflix or free services)', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        IT: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=IT',
          buy: [{ provider_id: 2, provider_name: 'Apple TV', logo_path: '', display_priority: 0 }],
          rent: [
            { provider_id: 3, provider_name: 'Google Play', logo_path: '', display_priority: 0 },
          ],
          // No flatrate (Netflix or free services)
        },
        ES: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=ES',
          flatrate: [
            { provider_id: 337, provider_name: 'Disney Plus', logo_path: '', display_priority: 0 },
          ],
          // Has flatrate provider (free service), should be included
        },
        BR: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=BR',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
          // Has Netflix, should be included
        },
      },
    };
    const result = mapAvailability(tmdbProviders);
    // Should only include ES (has free service) and BR (has Netflix), not IT (only buy/rent)
    expect(result.otherCountries).toHaveLength(2);
    const countryCodes = result.otherCountries.map((c) => c.countryCode);
    expect(countryCodes).toContain('ES');
    expect(countryCodes).toContain('BR');
    expect(countryCodes).not.toContain('IT');
  });
});
