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
  describe('Parameter Validation', () => {
    it('should return 400 if query is missing', async () => {
      const req = createRequest({});
      const res = await GET(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Query parameter is required' });
    });
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
            posterUrl: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIY2VhrJUdJ9qpGu.jpg',
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
            posterUrl: 'https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg',
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
        posterUrl: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIY2VhrJUdJ9qpGu.jpg',
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
      expect(data).toEqual({ error: 'Error from TMDB API' });
    });

    it('should return 503 on TMDB service unavailability', async () => {
      const req = createRequest({ query: 'retry', type: 'movie' });
      mockedTmdbApi.searchMovies.mockRejectedValueOnce(new TmdbError(503, 'Service Unavailable'));

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data).toEqual({ error: 'Error from TMDB API' });
    });
  });
});
