import { clearCache, stopCacheCleanup } from '@/app/cache';
import {
  YEAR_SEARCH_MAX_PAGES,
  YEAR_SEARCH_CONCURRENCY,
  YEAR_SEARCH_CACHE_TTL_SECONDS,
} from '@/app/config';
import { GET } from '@/app/api/search/route';
import * as tmdbApi from '@/app/tmdbApi';
import { TmdbError } from '@/app/tmdbClient';
import { TmdbSearchResponse, TmdbSearchResult } from '@/app/tmdbTypes';

// Mock Next.js server components
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn((data, options) => {
        return {
          json: () => Promise.resolve(data),
          status: options?.status || 200,
        };
      }),
    },
    NextRequest: jest.fn().mockImplementation((input: RequestInfo, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      return {
        ...request,
        nextUrl: url,
      };
    }),
  };
});

// Import NextRequest after mocking
import { NextRequest } from 'next/server';

jest.mock('@/app/tmdbApi');
const mockedTmdbApi = tmdbApi as jest.Mocked<typeof tmdbApi>;

const createRequest = (searchParams: Record<string, string>) => {
  const url = new URL('http://localhost/api/search');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url.toString());
};

describe('GET /api/search', () => {
  beforeEach(() => clearCache());
  afterAll(() => stopCacheCleanup());
  describe('Parameter Validation', () => {
    it('should return 400 if query is missing in autocomplete mode', async () => {
      const req = createRequest({ mode: 'autocomplete' });
      const res = await GET(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Query parameter is required' });
    });
  });

  describe('Browse mode (no query)', () => {
    const discoverPage = (results: TmdbSearchResult[], totalPages = 3): TmdbSearchResponse => ({
      page: 1,
      results,
      total_pages: totalPages,
      total_results: results.length,
    });
    const movie: TmdbSearchResult = {
      id: 10,
      title: 'Popular Movie',
      release_date: '2025-01-01',
      poster_path: '/movie.jpg',
      vote_average: 7.5,
      genre_ids: [28],
      popularity: 100,
    };
    const show: TmdbSearchResult = {
      id: 20,
      name: 'Popular Show',
      first_air_date: '2024-01-01',
      poster_path: '/show.jpg',
      vote_average: 8.5,
      genre_ids: [18],
      popularity: 250,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockedTmdbApi.discoverMovies.mockResolvedValue(discoverPage([movie]));
      mockedTmdbApi.discoverTv.mockResolvedValue(discoverPage([show], 7));
    });

    it('discovers popular movies and series in the watch region, merged by popularity', async () => {
      const res = await GET(createRequest({ watchRegion: 'DE' }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(mockedTmdbApi.searchMovies).not.toHaveBeenCalled();
      expect(mockedTmdbApi.discoverMovies).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          watchRegion: 'DE',
          sortBy: 'popularity.desc',
          voteCountGte: 50,
        })
      );
      expect(mockedTmdbApi.discoverTv).toHaveBeenCalledWith(
        expect.objectContaining({ watchRegion: 'DE', sortBy: 'popularity.desc' })
      );
      expect(data.results.map((r: { title: string }) => r.title)).toEqual([
        'Popular Show',
        'Popular Movie',
      ]);
      expect(data.results[1]).toEqual({
        id: 10,
        type: 'movie',
        title: 'Popular Movie',
        year: 2025,
        posterUrl: 'https://image.tmdb.org/t/p/w342/movie.jpg',
        rating: 7.5,
        genres: [28],
        popularity: 100,
      });
      expect(data.totalPages).toBe(7);
    });

    it('defaults to the US when no watch region is given', async () => {
      await GET(createRequest({}));
      expect(mockedTmdbApi.discoverMovies).toHaveBeenCalledWith(
        expect.objectContaining({ watchRegion: 'US' })
      );
    });

    it('passes providers, genres, language, rating and year range to discover', async () => {
      await GET(
        createRequest({
          type: 'tv',
          watchRegion: 'GB',
          providerIds: '8,337',
          genreIds: '18,10765',
          language: 'en',
          minRating: '7',
          yearFrom: '2010',
          yearTo: '2020',
          sort: 'rating',
          page: '2',
        })
      );

      expect(mockedTmdbApi.discoverMovies).not.toHaveBeenCalled();
      expect(mockedTmdbApi.discoverTv).toHaveBeenCalledWith({
        page: 2,
        watchRegion: 'GB',
        withWatchProviders: '8|337',
        withGenres: '18|10765',
        language: 'en',
        sortBy: 'vote_average.desc',
        voteAverageGte: 7,
        voteCountGte: 50,
        firstAirDateGte: '2010-01-01',
        firstAirDateLte: '2020-12-31',
      });
    });

    it('limits newest-first browsing to titles released by today', async () => {
      await GET(createRequest({ type: 'movie', sort: 'newest' }));
      expect(mockedTmdbApi.discoverMovies).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'primary_release_date.desc',
          releaseDateLte: new Date().toISOString().slice(0, 10),
        })
      );
    });
  });

  describe('Search sorting and filtering', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockedTmdbApi.searchMovies.mockResolvedValue({
        page: 1,
        total_pages: 1,
        total_results: 3,
        results: [
          {
            id: 1,
            title: 'B',
            release_date: '2001-01-01',
            poster_path: null,
            vote_average: 6,
            genre_ids: [28],
            popularity: 3,
          },
          {
            id: 2,
            title: 'A',
            release_date: '1999-01-01',
            poster_path: null,
            vote_average: 9,
            genre_ids: [18],
            popularity: 2,
          },
          {
            id: 3,
            title: 'C',
            release_date: '2010-01-01',
            poster_path: null,
            vote_average: 7,
            genre_ids: [28, 18],
            popularity: 1,
          },
        ],
      });
    });

    it('sorts search results by the requested order', async () => {
      const res = await GET(createRequest({ query: 'x', type: 'movie', sort: 'rating' }));
      const data = await res.json();
      expect(data.results.map((r: { id: number }) => r.id)).toEqual([2, 3, 1]);
    });

    it('keeps relevance order by default', async () => {
      const res = await GET(createRequest({ query: 'x', type: 'movie' }));
      const data = await res.json();
      expect(data.results.map((r: { id: number }) => r.id)).toEqual([1, 2, 3]);
    });

    it('filters search results by any selected genre', async () => {
      const res = await GET(createRequest({ query: 'x', type: 'movie', genreIds: '18' }));
      const data = await res.json();
      expect(data.results.map((r: { id: number }) => r.id)).toEqual([2, 3]);
    });

    it('filters search results to a year range when both bounds are given', async () => {
      const res = await GET(
        createRequest({ query: 'x', type: 'movie', yearFrom: '2000', yearTo: '2009' })
      );
      const data = await res.json();
      expect(data.results.map((r: { id: number }) => r.id)).toEqual([1]);
    });

    it('filters search results by yearFrom alone', async () => {
      const res = await GET(createRequest({ query: 'x', type: 'movie', yearFrom: '2005' }));
      const data = await res.json();
      expect(data.results.map((r: { id: number }) => r.id)).toEqual([3]);
    });

    it('filters search results by yearTo alone', async () => {
      const res = await GET(createRequest({ query: 'x', type: 'movie', yearTo: '2000' }));
      const data = await res.json();
      expect(data.results.map((r: { id: number }) => r.id)).toEqual([2]);
    });
  });

  describe.each(['movie', 'tv'] as const)('%s year-range contract', (type) => {
    const catalogue = [1999, 2000, 2005, 2020, 2021, undefined].map((year, index) => ({
      id: index + 1,
      title: 'Batman',
      name: 'Batman',
      release_date: year ? `${year}-01-01` : '',
      first_air_date: year ? `${year}-01-01` : '',
      poster_path: null,
      vote_average: 7,
      genre_ids: [],
      popularity: 1,
    }));

    beforeEach(() => {
      jest.clearAllMocks();
      // Model the actual upstream behavior: an exact-year parameter discards
      // all other years before the route gets a chance to apply its range.
      mockedTmdbApi.searchMovies.mockImplementation(async (params) => ({
        page: params.page ?? 1,
        total_pages: 1,
        total_results: catalogue.length,
        results: catalogue.filter(
          (r) => !params.year || r.release_date.startsWith(`${params.year}-`)
        ),
      }));
      mockedTmdbApi.searchTv.mockImplementation(async (params) => ({
        page: params.page ?? 1,
        total_pages: 1,
        total_results: catalogue.length,
        results: catalogue.filter(
          (r) =>
            !params.firstAirDateYear || r.first_air_date.startsWith(`${params.firstAirDateYear}-`)
        ),
      }));
    });

    it.each([
      [{ yearFrom: '2000' }, [2000, 2005, 2020, 2021]],
      [{ yearTo: '2020' }, [1999, 2000, 2005, 2020]],
      [{ yearFrom: '2000', yearTo: '2020' }, [2000, 2005, 2020]],
      [{ yearFrom: '2005', yearTo: '2005' }, [2005]],
    ] as [Record<string, string>, number[]][])(
      'preserves inclusive years for %j',
      async (bounds, expectedYears) => {
        const response = await GET(createRequest({ query: 'Batman', type, ...bounds }));
        const data = await response.json();
        expect(data.results.map((r: { year: number }) => r.year)).toEqual(expectedYears);
        const mock = type === 'movie' ? mockedTmdbApi.searchMovies : mockedTmdbApi.searchTv;
        const yearKey = type === 'movie' ? 'year' : 'firstAirDateYear';
        const upstreamParams = mock.mock.calls[0][0];
        if (bounds.yearFrom && bounds.yearFrom === bounds.yearTo) {
          expect(upstreamParams).toHaveProperty(yearKey, Number(bounds.yearFrom));
        } else {
          expect(upstreamParams).not.toHaveProperty(yearKey);
        }
      }
    );

    it('finds matches beyond an empty upstream page and counts only those matches', async () => {
      const upstreamPage = (page: number): TmdbSearchResponse => ({
        page,
        total_pages: 3,
        total_results: 3,
        results: [catalogue[page === 2 ? 2 : 0]],
      });
      mockedTmdbApi.searchMovies.mockImplementation(async (p) => upstreamPage(p.page ?? 1));
      mockedTmdbApi.searchTv.mockImplementation(async (p) => upstreamPage(p.page ?? 1));
      const response = await GET(
        createRequest({ query: 'Batman', type, yearFrom: '2000', yearTo: '2020' })
      );
      const data = await response.json();
      expect(data).toMatchObject({ page: 1, totalPages: 1, totalResults: 1 });
      expect(data).not.toHaveProperty('paginationScope');
      expect(data.results.map((r: { year: number }) => r.year)).toEqual([2005]);
    });

    it('filters and sorts across upstream pages before paginating, reusing the snapshot', async () => {
      const upstreamPage = (page: number): TmdbSearchResponse => ({
        page,
        total_pages: 3,
        total_results: 60,
        results: Array.from({ length: 20 }, (_, index) => ({
          ...catalogue[2],
          id: (page - 1) * 20 + index + 1,
          vote_average: page,
        })),
      });
      mockedTmdbApi.searchMovies.mockImplementation(async (p) => upstreamPage(p.page ?? 1));
      mockedTmdbApi.searchTv.mockImplementation(async (p) => upstreamPage(p.page ?? 1));
      const request = (page: number) =>
        createRequest({
          query: 'Batman',
          type,
          yearFrom: '2000',
          yearTo: '2020',
          minRating: '2',
          sort: 'rating',
          page: String(page),
        });
      const first = await (await GET(request(1))).json();
      const second = await (await GET(request(2))).json();
      expect(first).toMatchObject({ page: 1, totalPages: 2, totalResults: 40 });
      expect(second).toMatchObject({ page: 2, totalPages: 2, totalResults: 40 });
      expect(first.results.map((r: { id: number }) => r.id)).toEqual(
        Array.from({ length: 20 }, (_, i) => i + 41)
      );
      expect(second.results.map((r: { id: number }) => r.id)).toEqual(
        Array.from({ length: 20 }, (_, i) => i + 21)
      );
      const mock = type === 'movie' ? mockedTmdbApi.searchMovies : mockedTmdbApi.searchTv;
      expect(mock).toHaveBeenCalledTimes(3);
      const beyond = await (await GET(request(99))).json();
      expect(beyond.page).toBe(2);
      const otherRange = createRequest({ query: 'Batman', type, yearTo: '1990' });
      expect(await (await GET(otherRange)).json()).toMatchObject({
        totalResults: 0,
        totalPages: 1,
      });
      expect(mock).toHaveBeenCalledTimes(6);
    });

    it('bounds page fetches and concurrency and marks partial counts explicitly', async () => {
      let active = 0;
      let peak = 0;
      const upstreamPage = async (page: number): Promise<TmdbSearchResponse> => {
        active++;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active--;
        return {
          page,
          total_pages: 600,
          total_results: 12000,
          results: [{ ...catalogue[2], id: page }],
        };
      };
      mockedTmdbApi.searchMovies.mockImplementation((p) => upstreamPage(p.page ?? 1));
      mockedTmdbApi.searchTv.mockImplementation((p) => upstreamPage(p.page ?? 1));
      const data = await (
        await GET(createRequest({ query: 'Batman', type, yearFrom: '2000' }))
      ).json();
      expect(data).toMatchObject({ resultsTruncated: true, totalResults: YEAR_SEARCH_MAX_PAGES });
      const mock = type === 'movie' ? mockedTmdbApi.searchMovies : mockedTmdbApi.searchTv;
      expect(mock).toHaveBeenCalledTimes(YEAR_SEARCH_MAX_PAGES);
      expect(peak).toBeLessThanOrEqual(YEAR_SEARCH_CONCURRENCY);
      expect(mock.mock.calls.every(([p]) => p.page! <= 500)).toBe(true);
    });

    it('rejects a failed upstream page and allows a complete retry', async () => {
      const response = (page: number): TmdbSearchResponse => ({
        page,
        total_pages: 2,
        total_results: 2,
        results: [{ ...catalogue[2], id: page }],
      });
      let fail = true;
      const upstream = async (page: number) => {
        if (page === 2 && fail) throw new TmdbError(503, 'Unavailable');
        return response(page);
      };
      mockedTmdbApi.searchMovies.mockImplementation((p) => upstream(p.page ?? 1));
      mockedTmdbApi.searchTv.mockImplementation((p) => upstream(p.page ?? 1));
      const request = () => createRequest({ query: 'Batman', type, yearTo: '2020' });
      expect((await GET(request())).status).toBe(503);
      fail = false;
      expect(await (await GET(request())).json()).toMatchObject({ totalResults: 2 });
    });
  });

  it('shares concurrent snapshots and refreshes them after the cache TTL', async () => {
    const clock = jest.spyOn(Date, 'now');
    const startedAt = Date.now();
    clock.mockReturnValue(startedAt);
    mockedTmdbApi.searchMovies.mockImplementation(async (p) => ({
      page: p.page ?? 1,
      total_pages: 2,
      total_results: 2,
      results: [
        {
          id: p.page ?? 1,
          title: 'Batman',
          release_date: '2005-01-01',
          poster_path: null,
          vote_average: 7,
          genre_ids: [],
          popularity: 1,
        },
      ],
    }));
    const request = () => createRequest({ query: 'Batman', type: 'movie', yearFrom: '2000' });
    try {
      const responses = await Promise.all([GET(request()), GET(request())]);
      expect(responses.every((r) => r.status === 200)).toBe(true);
      expect(mockedTmdbApi.searchMovies).toHaveBeenCalledTimes(2);
      clock.mockReturnValue(startedAt + YEAR_SEARCH_CACHE_TTL_SECONDS * 1000 + 1);
      expect((await GET(request())).status).toBe(200);
      expect(mockedTmdbApi.searchMovies).toHaveBeenCalledTimes(4);
    } finally {
      clock.mockRestore();
    }
  });

  it('deduplicates repeated titles while retaining distinct movie and TV IDs', async () => {
    const item = {
      id: 1,
      title: 'Batman',
      name: 'Batman',
      release_date: '2005-01-01',
      first_air_date: '2005-01-01',
      poster_path: null,
      vote_average: 7,
      genre_ids: [],
      popularity: 1,
    };
    const response = { page: 1, total_pages: 2, total_results: 2, results: [item] };
    mockedTmdbApi.searchMovies.mockResolvedValue(response);
    mockedTmdbApi.searchTv.mockResolvedValue(response);
    const data = await (
      await GET(createRequest({ query: 'Batman', type: 'all', yearFrom: '2000' }))
    ).json();
    expect(data.totalResults).toBe(2);
    expect(data.results.map((r: { type: string }) => r.type)).toEqual(['movie', 'tv']);
  });

  describe('TMDB Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call searchMovies and return normalized results for type=movie', async () => {
      const req = createRequest({ query: 'Dune', type: 'movie' });
      const mockResponse: TmdbSearchResponse = {
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [
          {
            id: 123,
            title: 'Dune',
            release_date: '2021-09-15',
            poster_path: '/d5NXSklXo0qyIY2VhrJUdJ9qpGu.jpg',
            vote_average: 7.9,
            genre_ids: [878, 12],
            overview: 'A mythic and emotionally charged hero’s journey...',
            popularity: 150.0,
          },
        ],
      };

      mockedTmdbApi.searchMovies.mockResolvedValueOnce(mockResponse);

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(mockedTmdbApi.searchMovies).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'Dune', page: 1 })
      );
      expect(mockedTmdbApi.searchTv).not.toHaveBeenCalled();
      expect(data).toEqual({
        page: 1,
        totalPages: 1,
        totalResults: 1,
        results: [
          {
            id: 123,
            type: 'movie',
            title: 'Dune',
            year: 2021,
            posterUrl: 'https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIY2VhrJUdJ9qpGu.jpg',
            rating: 7.9,
            genres: [878, 12],
            overview: 'A mythic and emotionally charged hero’s journey...',
            popularity: 150.0,
          },
        ],
      });
    });

    it('should call searchTv and return normalized results for type=tv', async () => {
      const req = createRequest({ query: 'Chernobyl', type: 'tv' });
      const mockResponse: TmdbSearchResponse = {
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [
          {
            id: 456,
            name: 'Chernobyl',
            first_air_date: '2019-05-06',
            poster_path: '/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg',
            vote_average: 8.6,
            genre_ids: [18],
            overview: 'A dramatization of the 1986 nuclear accident...',
            popularity: 100.0,
          },
        ],
      };

      mockedTmdbApi.searchTv.mockResolvedValueOnce(mockResponse);

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(mockedTmdbApi.searchTv).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'Chernobyl', page: 1 })
      );
      expect(mockedTmdbApi.searchMovies).not.toHaveBeenCalled();
      expect(data).toEqual({
        page: 1,
        totalPages: 1,
        totalResults: 1,
        results: [
          {
            id: 456,
            type: 'tv',
            title: 'Chernobyl',
            year: 2019,
            posterUrl: 'https://image.tmdb.org/t/p/w342/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg',
            rating: 8.6,
            genres: [18],
            overview: 'A dramatization of the 1986 nuclear accident...',
            popularity: 100.0,
          },
        ],
      });
    });

    it('should call both services, merge, and sort results for type=all', async () => {
      const req = createRequest({ query: 'Star', type: 'all' });
      const movie: TmdbSearchResult = {
        id: 1,
        title: 'Star Wars',
        popularity: 200,
        release_date: '1977-05-25',
        poster_path: '',
        vote_average: 8,
        genre_ids: [],
        overview: '',
      };
      const tv: TmdbSearchResult = {
        id: 2,
        name: 'Star Trek',
        popularity: 300,
        first_air_date: '1966-09-08',
        poster_path: '',
        vote_average: 8,
        genre_ids: [],
        overview: '',
      };

      mockedTmdbApi.searchMovies.mockResolvedValueOnce({
        page: 1,
        results: [movie],
        total_pages: 1,
        total_results: 1,
      });
      mockedTmdbApi.searchTv.mockResolvedValueOnce({
        page: 1,
        results: [tv],
        total_pages: 1,
        total_results: 1,
      });

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.results.length).toBe(2);
      expect(data.totalResults).toBe(2);
      expect(data.results[0].title).toBe('Star Trek'); // Higher popularity
      expect(data.results[1].title).toBe('Star Wars');
    });

    it('should return minimal fields for autocomplete mode', async () => {
      const req = createRequest({ query: 'Dune', type: 'movie', mode: 'autocomplete' });
      const mockResponse: TmdbSearchResponse = {
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [
          {
            id: 123,
            title: 'Dune',
            release_date: '2021-09-15',
            poster_path: '/d5NXSklXo0qyIY2VhrJUdJ9qpGu.jpg',
            popularity: 150.0,
            vote_average: 7.9,
            genre_ids: [878, 12],
            overview: 'A mythic and emotionally charged hero’s journey...',
          },
        ],
      };

      mockedTmdbApi.searchMovies.mockResolvedValueOnce(mockResponse);

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.results[0]).toEqual({
        id: 123,
        type: 'movie',
        title: 'Dune',
        year: 2021,
        posterUrl: 'https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIY2VhrJUdJ9qpGu.jpg',
        popularity: 150.0,
      });
      expect(data.results[0]).not.toHaveProperty('rating');
      expect(data.results[0]).not.toHaveProperty('genres');
      expect(data.results[0]).not.toHaveProperty('overview');
    });

    it('should return 502 on TMDB error', async () => {
      const req = createRequest({ query: 'error', type: 'movie' });
      mockedTmdbApi.searchMovies.mockRejectedValueOnce(new TmdbError(500, 'Server Error'));

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(502);
      expect(data).toEqual({ error: 'Error fetching data from TMDB.' });
    });

    it('should return 503 on TMDB service unavailability', async () => {
      const req = createRequest({ query: 'retry', type: 'movie' });
      mockedTmdbApi.searchMovies.mockRejectedValueOnce(new TmdbError(503, 'Service Unavailable'));

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data).toEqual({ error: 'Error fetching data from TMDB.' });
    });
  });
});
