import {
  DEFAULT_SEARCH_PAGE_STATE,
  activeFilterCount,
  effectiveSort,
  parseSearchPageState,
  serializeSearchPageState,
  titleHref,
  toSearchRequestParams,
} from '@/app/utils/searchPageState';

const parse = (query: string) => parseSearchPageState(new URLSearchParams(query));

describe('parseSearchPageState', () => {
  it('returns defaults for an empty URL', () => {
    expect(parse('')).toEqual({ ...DEFAULT_SEARCH_PAGE_STATE });
    expect(parseSearchPageState(null)).toEqual({ ...DEFAULT_SEARCH_PAGE_STATE });
  });

  it('reads every field', () => {
    expect(
      parse(
        'q=%20dune%20&type=movie&genre=28,12&from=2000&to=2020&rating=7&lang=de&sort=rating&page=3&mine=1'
      )
    ).toEqual({
      query: 'dune',
      type: 'movie',
      genreIds: [28, 12],
      yearFrom: 2000,
      yearTo: 2020,
      minRating: 7,
      language: 'de',
      sort: 'rating',
      page: 3,
      mine: true,
    });
  });

  it('ignores invalid values', () => {
    expect(parse('type=anime&genre=x,-1,5&from=abc&rating=42&sort=random&page=0&mine=yes')).toEqual(
      {
        ...DEFAULT_SEARCH_PAGE_STATE,
        genreIds: [5],
      }
    );
  });
});

describe('serializeSearchPageState', () => {
  it('omits defaults', () => {
    expect(serializeSearchPageState(DEFAULT_SEARCH_PAGE_STATE)).toBe('');
  });

  it('round-trips through parse and keeps a country override', () => {
    const state = parse(
      'q=dune&type=tv&genre=18&from=1990&rating=6&lang=en&sort=newest&page=2&mine=1'
    );
    const serialized = serializeSearchPageState(state, 'GB');
    expect(new URLSearchParams(serialized).get('country')).toBe('GB');
    expect(parse(serialized)).toEqual(state);
  });
});

describe('effectiveSort', () => {
  it('defaults to most popular when browsing and best match when searching', () => {
    expect(effectiveSort(parse(''))).toBe('popularity');
    expect(effectiveSort(parse('q=dune'))).toBe('relevance');
  });

  it('keeps an explicit sort, except best match while browsing', () => {
    expect(effectiveSort(parse('sort=rating'))).toBe('rating');
    expect(effectiveSort(parse('sort=relevance'))).toBe('popularity');
    expect(effectiveSort(parse('q=dune&sort=title'))).toBe('title');
  });
});

describe('activeFilterCount', () => {
  it('counts genres, years, rating and language but not type, sort or mine', () => {
    expect(activeFilterCount(parse('type=tv&sort=rating&mine=1'))).toBe(0);
    expect(activeFilterCount(parse('genre=1,2&from=2000&to=2010&rating=5&lang=en'))).toBe(6);
  });
});

describe('toSearchRequestParams', () => {
  it('maps page state to API parameters for the country', () => {
    expect(
      toSearchRequestParams(parse('q=dune&genre=878&from=2020&rating=7&lang=en'), 'DE', [])
    ).toEqual({
      query: 'dune',
      type: 'all',
      watchRegion: 'DE',
      sort: 'relevance',
      genreIds: [878],
      yearFrom: 2020,
      minRating: 7,
      language: 'en',
    });
  });

  it('only filters by services when "mine" is on and services are selected', () => {
    expect(toSearchRequestParams(parse('mine=1'), 'DE', [8]).providerIds).toEqual([8]);
    expect(toSearchRequestParams(parse('mine=1'), 'DE', [])).not.toHaveProperty('providerIds');
    expect(toSearchRequestParams(parse(''), 'DE', [8])).not.toHaveProperty('providerIds');
  });
});

describe('titleHref', () => {
  it('links to the title page with the country', () => {
    expect(titleHref('tv', 1399, 'DE')).toBe('/title/tv/1399?country=DE');
  });
});
