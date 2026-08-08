import {
  filterResultsByProvider,
  isKnownCountryCode,
  isStreamingProvider,
} from '@/app/availabilityMapper';
import { NormalizedSearchResult } from '@/app/types';

const makeResult = (id: number, type: 'movie' | 'tv' = 'movie'): NormalizedSearchResult => ({
  id,
  type,
  title: `Title ${id}`,
});

const makeRegion = (overrides: {
  flatrate?: number[];
  ads?: number[];
  free?: number[];
  rent?: number[];
  buy?: number[];
}) => {
  const provider = (id: number) => ({
    provider_id: id,
    provider_name: `P${id}`,
    logo_path: '',
    display_priority: 0,
  });
  return {
    flatrate: overrides.flatrate?.map(provider),
    ads: overrides.ads?.map(provider),
    free: overrides.free?.map(provider),
    rent: overrides.rent?.map(provider),
    buy: overrides.buy?.map(provider),
  };
};

describe('isStreamingProvider', () => {
  it('matches providers in flatrate', () => {
    const region = makeRegion({ flatrate: [8, 9] });
    expect(isStreamingProvider(region, [8])).toBe(true);
  });

  it('matches providers in ads and free categories', () => {
    const region = makeRegion({ ads: [337], free: [300] });
    expect(isStreamingProvider(region, [337])).toBe(true);
    expect(isStreamingProvider(region, [300])).toBe(true);
  });

  it('does not match rent or buy providers', () => {
    const region = makeRegion({ rent: [8], buy: [9] });
    expect(isStreamingProvider(region, [8])).toBe(false);
  });
});

describe('filterResultsByProvider', () => {
  it('returns all results when no filters are given', async () => {
    const fetchMock = jest.fn();
    const results = await filterResultsByProvider([makeResult(1)], {}, fetchMock as never);
    expect(results).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns all results when only a region is selected', async () => {
    const fetchMock = jest.fn();
    const results = await filterResultsByProvider(
      [makeResult(1)],
      { watchRegion: 'US' },
      fetchMock as never
    );
    expect(results).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps only results available on a selected provider in the region', async () => {
    const filtered = await filterResultsByProvider(
      [makeResult(1), makeResult(2), makeResult(3)],
      { watchRegion: 'US', providerIds: [8] },
      async (_type, id) => ({
        id,
        results: {
          US: id === 1 || id === 2 ? makeRegion({ flatrate: [8] }) : makeRegion({ flatrate: [9] }),
        },
      })
    );
    expect(filtered.map((r) => r.id)).toEqual([1, 2]);
  });

  it('keeps items available via ads or free categories', async () => {
    const filtered = await filterResultsByProvider(
      [makeResult(1), makeResult(2)],
      { watchRegion: 'US', providerIds: [337, 300] },
      async (type, id) => ({
        id,
        results: {
          US: id === 1 ? makeRegion({ ads: [337] }) : makeRegion({ free: [300] }),
        },
      })
    );
    expect(filtered.map((r) => r.id)).toEqual([1, 2]);
  });

  it('excludes items only available via rent or buy', async () => {
    const filtered = await filterResultsByProvider(
      [makeResult(1)],
      { watchRegion: 'US', providerIds: [8] },
      async (_, id) => ({ id, results: { US: makeRegion({ rent: [8] }) } })
    );
    expect(filtered).toHaveLength(0);
  });

  it('falls back to the default region when watchRegion is missing', async () => {
    const filtered = await filterResultsByProvider(
      [makeResult(1)],
      { providerIds: [8] },
      async (_, id) => ({ id, results: { US: makeRegion({ flatrate: [8] }) } })
    );
    expect(filtered).toHaveLength(1);
  });

  it('excludes items whose provider lookup fails and keeps the rest', async () => {
    const filtered = await filterResultsByProvider(
      [makeResult(1), makeResult(2)],
      { watchRegion: 'US', providerIds: [8] },
      async (_type, id) => {
        if (id === 1) {
          throw new Error('boom');
        }
        return { id, results: { US: makeRegion({ flatrate: [8] }) } };
      }
    );
    expect(filtered.map((r) => r.id)).toEqual([2]);
  });
});

describe('isKnownCountryCode', () => {
  it('accepts known country codes', () => {
    expect(isKnownCountryCode('US')).toBe(true);
    expect(isKnownCountryCode('DE')).toBe(true);
  });

  it('rejects unknown codes and null', () => {
    expect(isKnownCountryCode('XY')).toBe(false);
    expect(isKnownCountryCode(null)).toBe(false);
    expect(isKnownCountryCode('')).toBe(false);
  });
});
