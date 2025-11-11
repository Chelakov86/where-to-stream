/**
 * Tests for TMDB API domain-specific methods.
 * Tests verify that each function calls tmdbGet with correct paths and parameters.
 */

import {
  searchMovies,
  searchTv,
  getMovieDetails,
  getTvDetails,
  getMovieWatchProviders,
  getTvWatchProviders,
  getMovieGenres,
  getTvGenres,
} from '@/app/tmdbApi';
import { tmdbGet } from '@/app/tmdbClient';
import {
  TmdbSearchResponse,
  TmdbMovieDetails,
  TmdbTvDetails,
  TmdbWatchProvidersResponse,
  TmdbGenreList,
} from '@/app/tmdbTypes';
import * as cache from '@/app/cache';

// Mock the tmdbClient module
jest.mock('@/app/tmdbClient', () => ({
  tmdbGet: jest.fn(),
}));

// Mock the cache module
jest.mock('@/app/cache', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  clearCache: jest.fn(),
}));

describe('tmdbApi', () => {
  const mockTmdbGet = tmdbGet as jest.MockedFunction<typeof tmdbGet>;
  const mockGetCache = cache.getCache as jest.MockedFunction<
    typeof cache.getCache
  >;
  const mockSetCache = cache.setCache as jest.MockedFunction<
    typeof cache.setCache
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchMovies', () => {
    it('should call tmdbGet with correct path and query parameter', async () => {
      const mockResponse: TmdbSearchResponse = {
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      const result = await searchMovies({ query: 'Inception' });

      expect(mockTmdbGet).toHaveBeenCalledWith('/search/movie', {
        query: 'Inception',
        page: undefined,
        year: undefined,
        language: undefined,
        with_genres: undefined,
        'vote_average.gte': undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should pass all optional parameters correctly', async () => {
      const mockResponse: TmdbSearchResponse = {
        page: 2,
        results: [],
        total_pages: 5,
        total_results: 100,
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      await searchMovies({
        query: 'Batman',
        page: 2,
        year: 2022,
        language: 'en-US',
        withGenres: '28,12',
        voteAverageGte: 7.5,
      });

      expect(mockTmdbGet).toHaveBeenCalledWith('/search/movie', {
        query: 'Batman',
        page: 2,
        year: 2022,
        language: 'en-US',
        with_genres: '28,12',
        'vote_average.gte': 7.5,
      });
    });

    it('should handle partial parameters', async () => {
      const mockResponse: TmdbSearchResponse = {
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      await searchMovies({
        query: 'Matrix',
        year: 1999,
      });

      expect(mockTmdbGet).toHaveBeenCalledWith('/search/movie', {
        query: 'Matrix',
        page: undefined,
        year: 1999,
        language: undefined,
        with_genres: undefined,
        'vote_average.gte': undefined,
      });
    });
  });

  describe('searchTv', () => {
    it('should call tmdbGet with correct path and query parameter', async () => {
      const mockResponse: TmdbSearchResponse = {
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      const result = await searchTv({ query: 'Breaking Bad' });

      expect(mockTmdbGet).toHaveBeenCalledWith('/search/tv', {
        query: 'Breaking Bad',
        page: undefined,
        first_air_date_year: undefined,
        language: undefined,
        with_genres: undefined,
        'vote_average.gte': undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should pass all optional parameters correctly', async () => {
      const mockResponse: TmdbSearchResponse = {
        page: 3,
        results: [],
        total_pages: 10,
        total_results: 200,
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      await searchTv({
        query: 'Game of Thrones',
        page: 3,
        firstAirDateYear: 2011,
        language: 'en-US',
        withGenres: '18,10765',
        voteAverageGte: 8.0,
      });

      expect(mockTmdbGet).toHaveBeenCalledWith('/search/tv', {
        query: 'Game of Thrones',
        page: 3,
        first_air_date_year: 2011,
        language: 'en-US',
        with_genres: '18,10765',
        'vote_average.gte': 8.0,
      });
    });

    it('should handle partial parameters', async () => {
      const mockResponse: TmdbSearchResponse = {
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      await searchTv({
        query: 'Stranger Things',
        firstAirDateYear: 2016,
      });

      expect(mockTmdbGet).toHaveBeenCalledWith('/search/tv', {
        query: 'Stranger Things',
        page: undefined,
        first_air_date_year: 2016,
        language: undefined,
        with_genres: undefined,
        'vote_average.gte': undefined,
      });
    });
  });

  describe('getMovieDetails', () => {
    it('should call tmdbGet with correct path for movie ID', async () => {
      const mockResponse: TmdbMovieDetails = {
        id: 550,
        title: 'Fight Club',
        original_title: 'Fight Club',
        release_date: '1999-10-15',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.4,
        vote_count: 26000,
        popularity: 45.2,
        overview: 'A movie about fight club',
        runtime: 139,
        genres: [{ id: 18, name: 'Drama' }],
        original_language: 'en',
        status: 'Released',
        tagline: 'Mischief. Mayhem. Soap.',
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      const result = await getMovieDetails(550);

      expect(mockTmdbGet).toHaveBeenCalledWith('/movie/550');
      expect(result).toEqual(mockResponse);
    });

    it('should handle different movie IDs', async () => {
      const mockResponse: TmdbMovieDetails = {
        id: 12345,
        title: 'Test Movie',
        original_title: 'Test Movie',
        release_date: '2023-01-01',
        poster_path: null,
        backdrop_path: null,
        vote_average: 7.0,
        vote_count: 100,
        popularity: 10.0,
        overview: 'Test overview',
        runtime: 120,
        genres: [],
        original_language: 'en',
        status: 'Released',
        tagline: null,
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      await getMovieDetails(12345);

      expect(mockTmdbGet).toHaveBeenCalledWith('/movie/12345');
    });
  });

  describe('getTvDetails', () => {
    it('should call tmdbGet with correct path for TV ID', async () => {
      const mockResponse: TmdbTvDetails = {
        id: 1396,
        name: 'Breaking Bad',
        original_name: 'Breaking Bad',
        first_air_date: '2008-01-20',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 9.0,
        vote_count: 12000,
        popularity: 150.5,
        overview: 'A chemistry teacher turned meth cook',
        genres: [{ id: 18, name: 'Drama' }],
        original_language: 'en',
        status: 'Ended',
        tagline: 'Change the equation.',
        number_of_seasons: 5,
        number_of_episodes: 62,
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      const result = await getTvDetails(1396);

      expect(mockTmdbGet).toHaveBeenCalledWith('/tv/1396');
      expect(result).toEqual(mockResponse);
    });

    it('should handle different TV show IDs', async () => {
      const mockResponse: TmdbTvDetails = {
        id: 67890,
        name: 'Test Show',
        original_name: 'Test Show',
        first_air_date: '2020-05-15',
        poster_path: null,
        backdrop_path: null,
        vote_average: 8.0,
        vote_count: 500,
        popularity: 25.0,
        overview: 'Test TV show',
        genres: [],
        original_language: 'en',
        status: 'Returning Series',
        tagline: null,
        number_of_seasons: 3,
        number_of_episodes: 30,
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      await getTvDetails(67890);

      expect(mockTmdbGet).toHaveBeenCalledWith('/tv/67890');
    });
  });

  describe('getMovieWatchProviders', () => {
    it('should call tmdbGet with correct path for movie watch providers', async () => {
      const mockResponse: TmdbWatchProvidersResponse = {
        id: 550,
        results: {
          US: {
            link: 'https://www.themoviedb.org/movie/550/watch',
            flatrate: [
              {
                logo_path: '/logo.jpg',
                provider_id: 8,
                provider_name: 'Netflix',
                display_priority: 1,
              },
            ],
          },
        },
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      const result = await getMovieWatchProviders(550);

      expect(mockTmdbGet).toHaveBeenCalledWith('/movie/550/watch/providers');
      expect(result).toEqual(mockResponse);
    });

    it('should handle different movie IDs for watch providers', async () => {
      const mockResponse: TmdbWatchProvidersResponse = {
        id: 11111,
        results: {},
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      await getMovieWatchProviders(11111);

      expect(mockTmdbGet).toHaveBeenCalledWith('/movie/11111/watch/providers');
    });
  });

  describe('getTvWatchProviders', () => {
    it('should call tmdbGet with correct path for TV watch providers', async () => {
      const mockResponse: TmdbWatchProvidersResponse = {
        id: 1396,
        results: {
          US: {
            link: 'https://www.themoviedb.org/tv/1396/watch',
            flatrate: [
              {
                logo_path: '/logo.jpg',
                provider_id: 119,
                provider_name: 'Amazon Prime Video',
                display_priority: 2,
              },
            ],
          },
        },
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      const result = await getTvWatchProviders(1396);

      expect(mockTmdbGet).toHaveBeenCalledWith('/tv/1396/watch/providers');
      expect(result).toEqual(mockResponse);
    });

    it('should handle different TV show IDs for watch providers', async () => {
      const mockResponse: TmdbWatchProvidersResponse = {
        id: 22222,
        results: {},
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      await getTvWatchProviders(22222);

      expect(mockTmdbGet).toHaveBeenCalledWith('/tv/22222/watch/providers');
    });
  });

  describe('getMovieGenres', () => {
    it('should call tmdbGet with correct path for movie genres', async () => {
      const mockResponse: TmdbGenreList = {
        genres: [
          { id: 28, name: 'Action' },
          { id: 12, name: 'Adventure' },
          { id: 16, name: 'Animation' },
        ],
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      const result = await getMovieGenres();

      expect(mockTmdbGet).toHaveBeenCalledWith('/genre/movie/list');
      expect(result).toEqual(mockResponse);
    });

    it('should return genre list without parameters', async () => {
      const mockResponse: TmdbGenreList = {
        genres: [],
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      await getMovieGenres();

      expect(mockTmdbGet).toHaveBeenCalledWith('/genre/movie/list');
      expect(mockTmdbGet).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTvGenres', () => {
    it('should call tmdbGet with correct path for TV genres', async () => {
      const mockResponse: TmdbGenreList = {
        genres: [
          { id: 10759, name: 'Action & Adventure' },
          { id: 16, name: 'Animation' },
          { id: 35, name: 'Comedy' },
        ],
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      const result = await getTvGenres();

      expect(mockTmdbGet).toHaveBeenCalledWith('/genre/tv/list');
      expect(result).toEqual(mockResponse);
    });

    it('should return genre list without parameters', async () => {
      const mockResponse: TmdbGenreList = {
        genres: [],
      };
      mockTmdbGet.mockResolvedValueOnce(mockResponse);

      await getTvGenres();

      expect(mockTmdbGet).toHaveBeenCalledWith('/genre/tv/list');
      expect(mockTmdbGet).toHaveBeenCalledTimes(1);
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      // Reset mocks before each test in this block
      mockGetCache.mockClear();
      mockSetCache.mockClear();
      mockTmdbGet.mockClear();
    });

    describe('getMovieGenres', () => {
      it('should cache results and return from cache on second call', async () => {
        const mockResponse: TmdbGenreList = { genres: [{ id: 28, name: 'Action' }] };
        mockTmdbGet.mockResolvedValue(mockResponse);
        mockGetCache.mockReturnValue(undefined);

        // First call
        await getMovieGenres();
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
        expect(mockSetCache).toHaveBeenCalledWith('genres:movie', mockResponse, 86400);

        // Second call
        mockGetCache.mockReturnValue(mockResponse);
        await getMovieGenres();
        expect(mockTmdbGet).toHaveBeenCalledTimes(1); // Should not be called again
      });
    });

    describe('getTvGenres', () => {
      it('should cache results and return from cache on second call', async () => {
        const mockResponse: TmdbGenreList = { genres: [{ id: 18, name: 'Drama' }] };
        mockTmdbGet.mockResolvedValue(mockResponse);
        mockGetCache.mockReturnValue(undefined);

        // First call
        await getTvGenres();
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
        expect(mockSetCache).toHaveBeenCalledWith('genres:tv', mockResponse, 86400);

        // Second call
        mockGetCache.mockReturnValue(mockResponse);
        await getTvGenres();
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
      });
    });

    describe('searchMovies', () => {
      it('should cache search results and return from cache on subsequent identical calls', async () => {
        const params = { query: 'Inception', year: 2010 };
        const mockResponse: TmdbSearchResponse = { page: 1, results: [], total_pages: 1, total_results: 0 };
        mockTmdbGet.mockResolvedValue(mockResponse);
        mockGetCache.mockReturnValue(undefined);

        // First call
        await searchMovies(params);
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
        const cacheKey = `search:movie:${JSON.stringify(params)}`;
        expect(mockSetCache).toHaveBeenCalledWith(cacheKey, mockResponse, 43200);

        // Second call
        mockGetCache.mockReturnValue(mockResponse);
        await searchMovies(params);
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
      });

      it('should not use cache for different search parameters', async () => {
        const params1 = { query: 'Inception' };
        const params2 = { query: 'Interstellar' };
        const mockResponse1: TmdbSearchResponse = { page: 1, results: [{ id: 27205 }], total_pages: 1, total_results: 1 } as any;
        const mockResponse2: TmdbSearchResponse = { page: 1, results: [{ id: 157336 }], total_pages: 1, total_results: 1 } as any;

        // First call
        mockGetCache.mockReturnValue(undefined);
        mockTmdbGet.mockResolvedValueOnce(mockResponse1);
        await searchMovies(params1);
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
        const cacheKey1 = `search:movie:${JSON.stringify(params1)}`;
        expect(mockSetCache).toHaveBeenCalledWith(cacheKey1, mockResponse1, 43200);

        // Second call with different params
        mockGetCache.mockReturnValue(undefined);
        mockTmdbGet.mockResolvedValueOnce(mockResponse2);
        await searchMovies(params2);
        expect(mockTmdbGet).toHaveBeenCalledTimes(2);
        const cacheKey2 = `search:movie:${JSON.stringify(params2)}`;
        expect(mockSetCache).toHaveBeenCalledWith(cacheKey2, mockResponse2, 43200);
      });
    });

    describe('searchTv', () => {
        it('should cache search results and return from cache on subsequent identical calls', async () => {
          const params = { query: 'Breaking Bad', firstAirDateYear: 2008 };
          const mockResponse: TmdbSearchResponse = { page: 1, results: [], total_pages: 1, total_results: 0 };
          mockTmdbGet.mockResolvedValue(mockResponse);
          mockGetCache.mockReturnValue(undefined);
  
          // First call
          await searchTv(params);
          expect(mockTmdbGet).toHaveBeenCalledTimes(1);
          const cacheKey = `search:tv:${JSON.stringify(params)}`;
          expect(mockSetCache).toHaveBeenCalledWith(cacheKey, mockResponse, 43200);
  
          // Second call
          mockGetCache.mockReturnValue(mockResponse);
          await searchTv(params);
          expect(mockTmdbGet).toHaveBeenCalledTimes(1);
        });
      });

    describe('getMovieDetails', () => {
      it('should cache details and return from cache on second call', async () => {
        const mockResponse: TmdbMovieDetails = { id: 550 } as any;
        mockTmdbGet.mockResolvedValue(mockResponse);
        mockGetCache.mockReturnValue(undefined);

        // First call
        await getMovieDetails(550);
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
        expect(mockSetCache).toHaveBeenCalledWith('title:movie:550', mockResponse, 43200);

        // Second call
        mockGetCache.mockReturnValue(mockResponse);
        await getMovieDetails(550);
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
      });
    });

    describe('getTvDetails', () => {
      it('should cache details and return from cache on second call', async () => {
        const mockResponse: TmdbTvDetails = { id: 1396 } as any;
        mockTmdbGet.mockResolvedValue(mockResponse);
        mockGetCache.mockReturnValue(undefined);

        // First call
        await getTvDetails(1396);
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
        expect(mockSetCache).toHaveBeenCalledWith('title:tv:1396', mockResponse, 43200);

        // Second call
        mockGetCache.mockReturnValue(mockResponse);
        await getTvDetails(1396);
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
      });
    });

    describe('getMovieWatchProviders', () => {
      it('should cache providers and return from cache on second call', async () => {
        const mockResponse: TmdbWatchProvidersResponse = { id: 550, results: {} };
        mockTmdbGet.mockResolvedValue(mockResponse);
        mockGetCache.mockReturnValue(undefined);

        // First call
        await getMovieWatchProviders(550);
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
        expect(mockSetCache).toHaveBeenCalledWith('providers:movie:550', mockResponse, 43200);

        // Second call
        mockGetCache.mockReturnValue(mockResponse);
        await getMovieWatchProviders(550);
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
      });
    });

    describe('getTvWatchProviders', () => {
      it('should cache providers and return from cache on second call', async () => {
        const mockResponse: TmdbWatchProvidersResponse = { id: 1396, results: {} };
        mockTmdbGet.mockResolvedValue(mockResponse);
        mockGetCache.mockReturnValue(undefined);

        // First call
        await getTvWatchProviders(1396);
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
        expect(mockSetCache).toHaveBeenCalledWith('providers:tv:1396', mockResponse, 43200);

        // Second call
        mockGetCache.mockReturnValue(mockResponse);
        await getTvWatchProviders(1396);
        expect(mockTmdbGet).toHaveBeenCalledTimes(1);
      });
    });
  });
});