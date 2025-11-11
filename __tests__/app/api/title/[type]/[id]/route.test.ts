import { GET } from '../../../../../../app/api/title/[type]/[id]/route';
import * as tmdbApi from '../../../../../../app/tmdbApi';
import * as availabilityMapper from '../../../../../../app/availabilityMapper';
import { TmdbError } from '../../../../../../app/tmdbClient';
import { NextRequest, NextResponse } from 'next/server';

// Mock next/server to handle NextResponse correctly in tests
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => {
      return {
        status: init?.status || 200,
        json: async () => data,
      };
    }),
  },
}));

// Mock the TMDB API functions
jest.mock('../../../../../../app/tmdbApi', () => ({
  getMovieDetails: jest.fn(),
  getTvDetails: jest.fn(),
  getMovieWatchProviders: jest.fn(),
  getTvWatchProviders: jest.fn(),
}));

// Mock the availabilityMapper
jest.mock('../../../../../../app/availabilityMapper', () => ({
  mapAvailability: jest.fn(),
}));

const mockGetMovieDetails = tmdbApi.getMovieDetails as jest.Mock;
const mockGetTvDetails = tmdbApi.getTvDetails as jest.Mock;
const mockGetMovieWatchProviders = tmdbApi.getMovieWatchProviders as jest.Mock;
const mockGetTvWatchProviders = tmdbApi.getTvWatchProviders as jest.Mock;
const mockMapAvailability = availabilityMapper.mapAvailability as jest.Mock;

describe('GET /api/title/[type]/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create a mock NextRequest
  const createMockRequest = (type: string, id: string) => {
    return {
      url: `http://localhost:3000/api/title/${type}/${id}`,
    } as NextRequest;
  };

  // Mock data
  const mockMovie = {
    id: 123,
    title: 'Mock Movie',
    original_title: 'Original Mock Movie',
    release_date: '2023-01-01',
    genres: [{ id: 1, name: 'Action' }],
    overview: 'Movie overview',
    vote_average: 7.5,
    poster_path: '/poster.jpg',
    runtime: 120,
  };

  const mockTv = {
    id: 456,
    name: 'Mock TV Show',
    original_name: 'Original Mock TV Show',
    first_air_date: '2022-01-01',
    genres: [{ id: 2, name: 'Drama' }],
    overview: 'TV show overview',
    vote_average: 8.0,
    poster_path: '/tv_poster.jpg',
    episode_run_time: [60],
  };

  const mockWatchProviders = {
    id: 123,
    results: {
      US: {
        link: 'https://www.themoviedb.org/movie/123-mock-movie/watch?locale=US',
        flatrate: [{ provider_id: 8, provider_name: 'Netflix', display_priority: 1 }],
      },
    },
  };

  const mockAvailabilityResult = {
    preferredCountries: [
      {
        countryCode: 'US',
        countryName: 'United States',
        hasNetflix: true,
        freeOrAdsProviders: [],
        watchLink: 'https://www.themoviedb.org/movie/123-mock-movie/watch?locale=US',
      },
    ],
    otherCountries: [],
  };

  it('should return 200 with normalized movie data and availability', async () => {
    mockGetMovieDetails.mockResolvedValue(mockMovie);
    mockGetMovieWatchProviders.mockResolvedValue(mockWatchProviders);
    mockMapAvailability.mockReturnValue(mockAvailabilityResult);

    const request = createMockRequest('movie', '123');
    const response = await GET(request, { params: { type: 'movie', id: '123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: 123,
      type: 'movie',
      title: 'Mock Movie',
      originalTitle: 'Original Mock Movie',
      year: 2023,
      genres: [{ id: 1, name: 'Action' }],
      overview: 'Movie overview',
      rating: 7.5,
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
      runtime: 120,
      availability: mockAvailabilityResult,
    });
    expect(mockGetMovieDetails).toHaveBeenCalledWith(123);
    expect(mockGetMovieWatchProviders).toHaveBeenCalledWith(123);
    expect(mockMapAvailability).toHaveBeenCalledWith(mockWatchProviders);
  });

  it('should return 200 with normalized TV data and availability', async () => {
    mockGetTvDetails.mockResolvedValue(mockTv);
    mockGetTvWatchProviders.mockResolvedValue(mockWatchProviders);
    mockMapAvailability.mockReturnValue(mockAvailabilityResult);

    const request = createMockRequest('tv', '456');
    const response = await GET(request, { params: { type: 'tv', id: '456' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: 456,
      type: 'tv',
      title: 'Mock TV Show',
      originalTitle: 'Original Mock TV Show',
      year: 2022,
      genres: [{ id: 2, name: 'Drama' }],
      overview: 'TV show overview',
      rating: 8.0,
      posterUrl: 'https://image.tmdb.org/t/p/w500/tv_poster.jpg',
      runtime: 60, // Takes first episode_run_time
      availability: mockAvailabilityResult,
    });
    expect(mockGetTvDetails).toHaveBeenCalledWith(456);
    expect(mockGetTvWatchProviders).toHaveBeenCalledWith(456);
    expect(mockMapAvailability).toHaveBeenCalledWith(mockWatchProviders);
  });

  it('should return 400 for an invalid type', async () => {
    const request = createMockRequest('unknown', '123');
    const response = await GET(request, { params: { type: 'unknown', id: '123' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid type. Must be "movie" or "tv".' });
  });

  it('should return 400 for a non-numeric ID', async () => {
    const request = createMockRequest('movie', 'abc');
    const response = await GET(request, { params: { type: 'movie', id: 'abc' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid ID. Must be a positive integer.' });
  });

  it('should return 400 for a non-positive ID', async () => {
    const request = createMockRequest('movie', '0');
    const response = await GET(request, { params: { type: 'movie', id: '0' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid ID. Must be a positive integer.' });
  });

  it('should return 502 if getMovieDetails throws TmdbError', async () => {
    mockGetMovieDetails.mockRejectedValue(new TmdbError(404, 'Not Found'));

    const request = createMockRequest('movie', '123');
    const response = await GET(request, { params: { type: 'movie', id: '123' } });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data).toEqual({ error: 'Failed to fetch movie details from TMDB: 404 Not Found' });
  });

  it('should return 502 if getMovieWatchProviders throws TmdbError', async () => {
    mockGetMovieDetails.mockResolvedValue(mockMovie);
    mockGetMovieWatchProviders.mockRejectedValue(new TmdbError(404, 'Not Found'));

    const request = createMockRequest('movie', '123');
    const response = await GET(request, { params: { type: 'movie', id: '123' } });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data).toEqual({ error: 'Failed to fetch movie details from TMDB: 404 Not Found' });
  });

  it('should return 502 if getTvDetails throws TmdbError', async () => {
    mockGetTvDetails.mockRejectedValue(new TmdbError(404, 'Not Found'));

    const request = createMockRequest('tv', '456');
    const response = await GET(request, { params: { type: 'tv', id: '456' } });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data).toEqual({ error: 'Failed to fetch tv details from TMDB: 404 Not Found' });
  });

  it('should return 502 if getTvWatchProviders throws TmdbError', async () => {
    mockGetTvDetails.mockResolvedValue(mockTv);
    mockGetTvWatchProviders.mockRejectedValue(new TmdbError(404, 'Not Found'));

    const request = createMockRequest('tv', '456');
    const response = await GET(request, { params: { type: 'tv', id: '456' } });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data).toEqual({ error: 'Failed to fetch tv details from TMDB: 404 Not Found' });
  });

  it('should return 500 if mapAvailability throws an error', async () => {
    mockGetMovieDetails.mockResolvedValue(mockMovie);
    mockGetMovieWatchProviders.mockResolvedValue(mockWatchProviders);
    mockMapAvailability.mockImplementation(() => {
      throw new Error('Mapping error');
    });

    const request = createMockRequest('movie', '123');
    const response = await GET(request, { params: { type: 'movie', id: '123' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal Server Error: Mapping error' });
  });

  it('should return 500 for other unexpected errors during movie processing', async () => {
    mockGetMovieDetails.mockRejectedValue(new Error('Network error'));

    const request = createMockRequest('movie', '123');
    const response = await GET(request, { params: { type: 'movie', id: '123' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal Server Error: Network error' });
  });

  it('should return 500 for other unexpected errors during TV processing', async () => {
    mockGetTvDetails.mockRejectedValue(new Error('Network error'));

    const request = createMockRequest('tv', '456');
    const response = await GET(request, { params: { type: 'tv', id: '456' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal Server Error: Network error' });
  });
});
