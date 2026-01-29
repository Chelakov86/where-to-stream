import { mapAvailability } from '../app/availabilityMapper';
import { TmdbWatchProvidersResponse } from '../app/tmdbTypes';

describe('mapAvailability', () => {
  it('should return null userCountry and empty otherCountries when no providers exist', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {},
    };

    const result = mapAvailability(tmdbProviders, null);

    expect(result.userCountry).toBeNull();
    expect(result.otherCountries).toEqual([]);
  });

  it('should return null userCountry when country code is null', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
      },
    };

    const result = mapAvailability(tmdbProviders, null);

    expect(result.userCountry).toBeNull();
    expect(result.otherCountries).toHaveLength(1);
    expect(result.otherCountries[0].countryCode).toBe('US');
  });

  it('should return userCountry when valid country code is provided', () => {
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
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
      },
    };

    const result = mapAvailability(tmdbProviders, 'US');

    expect(result.userCountry).not.toBeNull();
    expect(result.userCountry?.countryCode).toBe('US');
    expect(result.userCountry?.countryName).toBe('United States');
    expect(result.userCountry?.paidProviders).toEqual(['Netflix']);
    expect(result.userCountry?.freeProviders).toEqual([]);
    expect(result.userCountry?.watchLink).toContain('locale=US');
  });

  it('should exclude user country from otherCountries', () => {
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
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
        DE: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=DE',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
      },
    };

    const result = mapAvailability(tmdbProviders, 'US');

    expect(result.userCountry?.countryCode).toBe('US');
    expect(result.otherCountries).toHaveLength(2);
    const otherCountryCodes = result.otherCountries.map((c) => c.countryCode);
    expect(otherCountryCodes).not.toContain('US');
    expect(otherCountryCodes).toContain('GB');
    expect(otherCountryCodes).toContain('DE');
  });

  it('should include user country even when it has no providers', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        CU: {
          // Cuba with no providers
          link: 'https://www.themoviedb.org/movie/1/watch?locale=CU',
        },
        US: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
      },
    };

    const result = mapAvailability(tmdbProviders, 'CU');

    expect(result.userCountry).not.toBeNull();
    expect(result.userCountry?.countryCode).toBe('CU');
    expect(result.userCountry?.countryName).toBe('Cuba');
    expect(result.userCountry?.freeProviders).toEqual([]);
    expect(result.userCountry?.paidProviders).toEqual([]);
    expect(result.otherCountries).toHaveLength(1);
    expect(result.otherCountries[0].countryCode).toBe('US');
  });

  it('should return null userCountry when country code not in TMDB results', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
      },
    };

    const result = mapAvailability(tmdbProviders, 'XY');

    expect(result.userCountry).toBeNull();
    expect(result.otherCountries).toHaveLength(1);
    expect(result.otherCountries[0].countryCode).toBe('US');
  });

  it('should sort otherCountries alphabetically by country name', () => {
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
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
        FR: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=FR',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
      },
    };

    const result = mapAvailability(tmdbProviders, null);

    expect(result.otherCountries).toHaveLength(3);
    // Should be sorted: Australia, France, Japan
    expect(result.otherCountries[0].countryName).toBe('Australia');
    expect(result.otherCountries[1].countryName).toBe('France');
    expect(result.otherCountries[2].countryName).toBe('Japan');
  });

  it('should correctly categorize free and paid providers', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
            { provider_id: 337, provider_name: 'Disney Plus', logo_path: '', display_priority: 0 },
          ],
          ads: [{ provider_id: 2, provider_name: 'Tubi TV', logo_path: '', display_priority: 0 }],
          free: [{ provider_id: 1, provider_name: 'Freevee', logo_path: '', display_priority: 0 }],
        },
      },
    };

    const result = mapAvailability(tmdbProviders, 'US');

    expect(result.userCountry).not.toBeNull();
    // Free providers come from ads and free categories, sorted alphabetically
    expect(result.userCountry?.freeProviders).toEqual(['Freevee', 'Tubi TV']);
    // Paid providers come from flatrate category, sorted alphabetically
    expect(result.userCountry?.paidProviders).toEqual(['Disney Plus', 'Netflix']);
  });

  it('should not list other countries if they have no streaming providers', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
        FR: {
          // No providers
          link: 'https://www.themoviedb.org/movie/1/watch?locale=FR',
        },
      },
    };

    const result = mapAvailability(tmdbProviders, 'US');

    expect(result.userCountry?.countryCode).toBe('US');
    expect(result.otherCountries).toHaveLength(0); // FR excluded because no providers
  });

  it('should not list countries with only buy/rent providers in otherCountries', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=US',
          flatrate: [
            { provider_id: 8, provider_name: 'Netflix', logo_path: '', display_priority: 0 },
          ],
        },
        IT: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=IT',
          buy: [{ provider_id: 2, provider_name: 'Apple TV', logo_path: '', display_priority: 0 }],
          rent: [
            { provider_id: 3, provider_name: 'Google Play', logo_path: '', display_priority: 0 },
          ],
          // No flatrate, ads, or free providers
        },
        ES: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=ES',
          flatrate: [
            { provider_id: 337, provider_name: 'Disney Plus', logo_path: '', display_priority: 0 },
          ],
        },
        BR: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=BR',
          ads: [{ provider_id: 613, provider_name: 'Pluto TV', logo_path: '', display_priority: 0 }],
        },
      },
    };

    const result = mapAvailability(tmdbProviders, 'US');

    expect(result.userCountry?.countryCode).toBe('US');
    expect(result.otherCountries).toHaveLength(2); // Only ES and BR, not IT
    const countryCodes = result.otherCountries.map((c) => c.countryCode);
    expect(countryCodes).toContain('ES');
    expect(countryCodes).toContain('BR');
    expect(countryCodes).not.toContain('IT');
  });

  it('should handle all provider variants', () => {
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
            { provider_id: 337, provider_name: 'Disney Plus', logo_path: '', display_priority: 0 },
          ],
        },
      },
    };

    const result = mapAvailability(tmdbProviders, 'US');

    expect(result.userCountry).not.toBeNull();
    expect(result.userCountry?.freeProviders).toEqual([]);
    // All paid providers should be included, sorted alphabetically
    expect(result.userCountry?.paidProviders).toEqual([
      'Disney Plus',
      'Netflix',
      'Netflix Standard with Ads',
    ]);
  });

  it('should handle empty TMDB results with userCountryCode', () => {
    const tmdbProviders: TmdbWatchProvidersResponse = {
      id: 1,
      results: {},
    };

    const result = mapAvailability(tmdbProviders, 'US');

    expect(result.userCountry).toBeNull(); // US not in results
    expect(result.otherCountries).toEqual([]);
  });
});
