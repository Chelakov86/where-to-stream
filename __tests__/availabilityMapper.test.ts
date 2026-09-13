import { mapAvailability, isStreamingProvider } from '@/app/availabilityMapper';
import { TmdbCountryWatchProviders, TmdbWatchProviderInfo } from '@/app/tmdbTypes';

const provider = (id: number, name: string, priority = 1, logo = ''): TmdbWatchProviderInfo => ({
  provider_id: id,
  provider_name: name,
  logo_path: logo,
  display_priority: priority,
});

describe('streaming category rule agreement', () => {
  // What mapAvailability groups as streaming (flatrate or free) is what the provider filter matches.
  it('agrees on flatrate-only providers', () => {
    const region: TmdbCountryWatchProviders = { flatrate: [provider(8, 'Netflix')] };

    expect(isStreamingProvider(region, [8])).toBe(true);
    expect(mapAvailability({ id: 1, results: { US: region } }).US.flatrate).toEqual([
      { id: 8, name: 'Netflix' },
    ]);
  });

  it('agrees on ads and free providers', () => {
    const region: TmdbCountryWatchProviders = {
      ads: [provider(337, 'Peacock')],
      free: [provider(300, 'Pluto TV')],
    };

    expect(isStreamingProvider(region, [337])).toBe(true);
    expect(isStreamingProvider(region, [300])).toBe(true);
    expect(mapAvailability({ id: 1, results: { US: region } }).US.free.map((p) => p.id)).toEqual(
      expect.arrayContaining([337, 300])
    );
  });

  it('agrees that rent and buy are not streaming', () => {
    const region: TmdbCountryWatchProviders = {
      rent: [provider(8, 'Netflix')],
      buy: [provider(9, 'Prime Video')],
    };

    expect(isStreamingProvider(region, [8])).toBe(false);
    expect(isStreamingProvider(region, [9])).toBe(false);
    const us = mapAvailability({ id: 1, results: { US: region } }).US;
    expect(us.flatrate).toEqual([]);
    expect(us.free).toEqual([]);
  });
});

describe('mapAvailability', () => {
  it('returns an empty object when there are no providers', () => {
    expect(mapAvailability({ id: 1, results: {} })).toEqual({});
  });

  it('keys countries by code with names, watch links and all four offer groups', () => {
    const result = mapAvailability({
      id: 1,
      results: {
        DE: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=DE',
          flatrate: [provider(8, 'Netflix', 1, '/netflix.jpg')],
          rent: [provider(2, 'Apple TV')],
          buy: [provider(3, 'Google Play')],
        },
      },
    });

    expect(result.DE).toEqual({
      countryCode: 'DE',
      countryName: 'Germany',
      watchLink: 'https://www.themoviedb.org/movie/1/watch?locale=DE',
      flatrate: [{ id: 8, name: 'Netflix', logoUrl: 'https://image.tmdb.org/t/p/w92/netflix.jpg' }],
      free: [],
      rent: [{ id: 2, name: 'Apple TV' }],
      buy: [{ id: 3, name: 'Google Play' }],
    });
  });

  it('keeps rent/buy-only countries', () => {
    const result = mapAvailability({
      id: 1,
      results: { FR: { buy: [provider(2, 'Apple TV')] } },
    });
    expect(Object.keys(result)).toEqual(['FR']);
  });

  it('omits countries without any offers', () => {
    const result = mapAvailability({
      id: 1,
      results: { US: { link: 'https://example.com' }, GB: { flatrate: [provider(8, 'Netflix')] } },
    });
    expect(Object.keys(result)).toEqual(['GB']);
  });

  it('merges free and ads providers without duplicates, ordered by display priority', () => {
    const result = mapAvailability({
      id: 1,
      results: {
        US: {
          free: [provider(300, 'Pluto TV', 5), provider(73, 'Tubi', 2)],
          ads: [provider(73, 'Tubi', 2), provider(337, 'Peacock', 1)],
        },
      },
    });
    expect(result.US.free.map((p) => p.name)).toEqual(['Peacock', 'Tubi', 'Pluto TV']);
  });

  it('falls back to the country code for unknown countries', () => {
    const result = mapAvailability({
      id: 1,
      results: { XX: { flatrate: [provider(8, 'Netflix')] } },
    });
    expect(result.XX.countryName).toBe('XX');
  });
});
