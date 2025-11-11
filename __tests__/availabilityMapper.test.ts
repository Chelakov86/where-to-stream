
import { mapAvailability } from '../app/availabilityMapper';
import { TmdbWatchProvidersResponse } from '../app/tmdbTypes';
import { PREFERRED_COUNTRIES } from '../app/config';

// Mock PREFERRED_COUNTRIES to isolate tests from config changes
jest.mock('../app/config', () => ({
  PREFERRED_COUNTRIES: ["DE", "GB", "US", "CA"],
}));

describe('mapAvailability', () => {
  it('should return empty lists when there is no availability', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {},
    };

    const result = mapAvailability(tmdbProviders);

    expect(result.preferredCountries).toHaveLength(PREFERRED_COUNTRIES.length);
    result.preferredCountries.forEach(c => {
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
          flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '' }],
          ads: [{ provider_id: 1, provider_name: 'Freevee', logo_path: '' }],
        },
        GB: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=GB',
          free: [{ provider_id: 2, provider_name: 'BBC iPlayer', logo_path: '' }],
        },
        FR: { // Other country
          link: 'https://www.themoviedb.org/movie/1/watch?locale=FR',
          flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '' }],
        },
        DE: { // Preferred, but no providers
            link: 'https://www.themoviedb.org/movie/1/watch?locale=DE',
        }
      },
    };

    const result = mapAvailability(tmdbProviders);

    // Check preferred countries
    expect(result.preferredCountries).toHaveLength(4);

    const usData = result.preferredCountries.find(c => c.countryCode === 'US');
    expect(usData).toBeDefined();
    expect(usData?.countryName).toBe('United States');
    expect(usData?.hasNetflix).toBe(true);
    expect(usData?.freeOrAdsProviders).toEqual(['Freevee']);
    expect(usData?.watchLink).toContain('locale=US');

    const gbData = result.preferredCountries.find(c => c.countryCode === 'GB');
    expect(gbData).toBeDefined();
    expect(gbData?.countryName).toBe('United Kingdom');
    expect(gbData?.hasNetflix).toBe(false);
    expect(gbData?.freeOrAdsProviders).toEqual(['BBC iPlayer']);

    const deData = result.preferredCountries.find(c => c.countryCode === 'DE');
    expect(deData).toBeDefined();
    expect(deData?.countryName).toBe('Germany');
    expect(deData?.hasNetflix).toBe(false);
    expect(deData?.freeOrAdsProviders).toEqual([]);

    const caData = result.preferredCountries.find(c => c.countryCode === 'CA');
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
    expect(frData.freeOrAdsProviders).toEqual([]);
  });

  it('should handle only non-preferred countries having availability', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
        id: 1,
        results: {
            JP: {
                link: "https://www.themoviedb.org/movie/1/watch?locale=JP",
                flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '' }],
            },
            AU: {
                link: "https://www.themoviedb.org/movie/1/watch?locale=AU",
                ads: [{ provider_id: 1, provider_name: '7plus', logo_path: '' }],
            }
        }
    };

    const result = mapAvailability(tmdbProviders);

    expect(result.preferredCountries).toHaveLength(4);
    result.preferredCountries.forEach(c => {
        expect(c.hasNetflix).toBe(false);
        expect(c.freeOrAdsProviders).toEqual([]);
    });

    expect(result.otherCountries).toHaveLength(2);
    expect(result.otherCountries[0].countryCode).toBe('AU');
    expect(result.otherCountries[0].countryName).toBe('Australia');
    expect(result.otherCountries[1].countryCode).toBe('JP');
    expect(result.otherCountries[1].countryName).toBe('Japan');
  });

  it('should correctly identify unique and sorted free/ads providers', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
        id: 1,
        results: {
            US: {
                link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
                ads: [
                    { provider_id: 2, provider_name: 'Tubi TV', logo_path: '' },
                    { provider_id: 1, provider_name: 'Freevee', logo_path: '' }
                ],
                free: [
                    { provider_id: 2, provider_name: 'Tubi TV', logo_path: '' },
                    { provider_id: 3, provider_name: 'Plex', logo_path: '' },
                ]
            }
        }
    };

    const result = mapAvailability(tmdbProviders);
    const usData = result.preferredCountries.find(c => c.countryCode === 'US');
    expect(usData?.freeOrAdsProviders).toEqual(['Freevee', 'Plex', 'Tubi TV']);
  });

  it('should not list other countries if they have no providers', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
        id: 1,
        results: {
            FR: { // No providers
                link: "https://www.themoviedb.org/movie/1/watch?locale=FR",
            }
        }
    };
    const result = mapAvailability(tmdbProviders);
    expect(result.otherCountries).toHaveLength(0);
  });
});
