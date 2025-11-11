import { NextRequest, NextResponse } from 'next/server';
import { TmdbError } from '@/app/tmdbClient';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => {
      return {
        json: () => Promise.resolve(data), // Mock the json() method of the response object
        status: init?.status || 200,
      };
    }),
  },
}));

// Mock TMDB API functions
jest.mock('@/app/tmdbApi', () => ({
  getMovieDetails: jest.fn(),
  getMovieWatchProviders: jest.fn(),
  getTvDetails: jest.fn(),
  getTvWatchProviders: jest.fn(),
}));

// Mock availabilityMapper
jest.mock('@/app/availabilityMapper', () => ({
  mapAvailability: jest.fn(),
}));

// Import the mocked modules AFTER jest.mock calls
import * as tmdbApi from '@/app/tmdbApi';
import * as availabilityMapper from '@/app/availabilityMapper';
import { GET } from '@/app/api/title/[type]/[id]/route';

// Now, get references to the mocked functions
const mockGetMovieDetails = tmdbApi.getMovieDetails as jest.Mock;
const mockGetMovieWatchProviders = tmdbApi.getMovieWatchProviders as jest.Mock;
const mockGetTvDetails = tmdbApi.getTvDetails as jest.Mock;
const mockGetTvWatchProviders = tmdbApi.getTvWatchProviders as jest.Mock;
const mockMapAvailability = availabilityMapper.mapAvailability as jest.Mock;

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

describe('GET /api/title/[type]/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations for successful calls
    mockGetMovieDetails.mockResolvedValue({
      id: 550,
      title: 'Fight Club',
      original_title: 'Fight Club',
      release_date: '1999-10-15',
      genres: [{ id: 18, name: 'Drama' }],
      overview: 'An insomniac office worker looking for a way to change his life crosses paths with a devil-may-care soap maker and they form an underground fight club that evolves into something much, much more.',
      vote_average: 8.4,
      poster_path: '/pB8BM7pdXLXbZVZC65E3J9xk3LX.jpg',
      runtime: 139,
    });
    mockGetMovieWatchProviders.mockResolvedValue({
      id: 550,
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=US',
          flatrate: [{ logo_path: '/5NyMoF5fJbB62D3B5F5F5F5F.jpg', provider_id: 8, provider_name: 'Netflix', display_priority: 1 }],
        },
      },
    });
    mockGetTvDetails.mockResolvedValue({
      id: 1399,
      name: 'Game of Thrones',
      original_name: 'Game of Thrones',
      first_air_date: '2011-04-17',
      genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }],
      overview: 'Nine noble families fight for control over the mythical lands of Westeros, while an ancient enemy returns after being dormant for thousands of years.',
      vote_average: 8.4,
      poster_path: '/2OMB0ynKlyXlHZWSnQcBGqL2AER.jpg',
      episode_run_time: [60],
    });
    mockGetTvWatchProviders.mockResolvedValue({
      id: 1399,
      results: {
        US: {
          link: 'https://www.themoviedb.org/tv/1399-game_of_thrones/watch?locale=US',
          flatrate: [{ logo_path: '/5NyMoF5fJbB62D3B5F5F5F5F.jpg', provider_id: 8, provider_name: 'HBO Max', display_priority: 1 }],
        },
      },
    });
    mockMapAvailability.mockReturnValue({
      flatrate: [{ provider_name: 'Netflix', logo_url: `${TMDB_IMAGE_BASE_URL}/5NyMoF5fJbB62D3B5F5F5F5F.jpg` }],
      buy: [],
      rent: [],
    });
  });

  // Helper to create a mock NextRequest
  const createMockRequest = (type: string, id: string) => {
    return {
      nextUrl: {
        pathname: `/api/title/${type}/${id}`,
      },
    } as unknown as NextRequest;
  };

  // --- Valid Requests ---
  it('should return normalized movie details and availability for a valid movie ID', async () => {
    const req = createMockRequest('movie', '550');
    const response = await GET(req, { params: { type: 'movie', id: '550' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetMovieDetails).toHaveBeenCalledWith(550);
    expect(mockGetMovieWatchProviders).toHaveBeenCalledWith(550);
    expect(mockMapAvailability).toHaveBeenCalledWith({
      US: {
        link: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=US',
        flatrate: [{ logo_path: '/5NyMoF5fJbB62D3B5F5F5F5F.jpg', provider_id: 8, provider_name: 'Netflix', display_priority: 1 }],
      },
    });
    expect(json).toEqual({
      id: 550,
      type: 'movie',
      title: 'Fight Club',
      originalTitle: 'Fight Club',
      year: 1999,
      genres: [{ id: 18, name: 'Drama' }],
      overview: 'An insomniac office worker looking for a way to change his life crosses paths with a devil-may-care soap maker and they form an underground fight club that evolves into something much, much more.',
      rating: 8.4,
      posterUrl: `${TMDB_IMAGE_BASE_URL}/pB8BM7pdXLXbZVZC65E3J9xk3LX.jpg`,
      runtime: 139,
      availability: {
        flatrate: [{ provider_name: 'Netflix', logo_url: `${TMDB_IMAGE_BASE_URL}/5NyMoF5fJbB62D3B5F5F5F5F.jpg` }],
        buy: [],
        rent: [],
      },
    });
  });

  it('should return normalized TV show details and availability for a valid TV show ID', async () => {
    const req = createMockRequest('tv', '1399');
    const response = await GET(req, { params: { type: 'tv', id: '1399' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetTvDetails).toHaveBeenCalledWith(1399);
    expect(mockGetTvWatchProviders).toHaveBeenCalledWith(1399);
    expect(mockMapAvailability).toHaveBeenCalledWith({
      US: {
        link: 'https://www.themoviedb.org/tv/1399-game_of_thrones/watch?locale=US',
        flatrate: [{ logo_path: '/5NyMoF5fJbB62D3B5F5F5F5F.jpg', provider_id: 8, provider_name: 'HBO Max', display_priority: 1 }],
      },
    });
    expect(json).toEqual({
      id: 1399,
      type: 'tv',
      title: 'Game of Thrones',
      originalTitle: 'Game of Thrones',
      year: 2011,
      genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }],
      overview: 'Nine noble families fight for control over the mythical lands of Westeros, while an ancient enemy returns after being dormant for thousands of years.',
      rating: 8.4,
      posterUrl: `${TMDB_IMAGE_BASE_URL}/2OMB0ynKlyXlHZWSnQcBGqL2AER.jpg`,
      runtime: 60, // Assuming episode_run_time[0] for TV
      availability: {
        flatrate: [{ provider_name: 'Netflix', logo_url: `${TMDB_IMAGE_BASE_URL}/5NyMoF5fJbB62D3B5F5F5F5F.jpg` }],
        buy: [],
        rent: [],
      },
    });
  });

  // --- Invalid Requests ---
  it('should return 400 for an invalid type parameter', async () => {
    const req = createMockRequest('unknown', '123');
    const response = await GET(req, { params: { type: 'unknown', id: '123' } });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'Invalid type. Must be "movie" or "tv".' });
    expect(mockGetMovieDetails).not.toHaveBeenCalled();
    expect(mockGetTvDetails).not.toHaveBeenCalled();
  });

  it('should return 400 for a non-numeric ID parameter', async () => {
    const req = createMockRequest('movie', 'abc');
    const response = await GET(req, { params: { type: 'movie', id: 'abc' } });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'Invalid ID. Must be a positive integer.' });
    expect(mockGetMovieDetails).not.toHaveBeenCalled();
  });

  it('should return 400 for a non-positive integer ID parameter', async () => {
    const req = createMockRequest('tv', '0');
    const response = await GET(req, { params: { type: 'tv', id: '0' } });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'Invalid ID. Must be a positive integer.' });
    expect(mockGetTvDetails).not.toHaveBeenCalled();
  });

  // --- Error Handling ---
  it('should return 502/503 if getMovieDetails fails', async () => {
    mockGetMovieDetails.mockRejectedValue(new TmdbError('TMDB Movie Details Error', 500));
    const req = createMockRequest('movie', '550');
    const response = await GET(req, { params: { type: 'movie', id: '550' } });
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json).toEqual({ error: 'Error fetching data from TMDB.' });
  });

  it('should return 502/503 if getMovieWatchProviders fails', async () => {
    mockGetMovieWatchProviders.mockRejectedValue(new TmdbError('TMDB Movie Providers Error', 500));
    const req = createMockRequest('movie', '550');
    const response = await GET(req, { params: { type: 'movie', id: '550' } });
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json).toEqual({ error: 'Error fetching data from TMDB.' });
  });

  it('should return 502/503 if getTvDetails fails', async () => {
    mockGetTvDetails.mockRejectedValue(new TmdbError('TMDB TV Details Error', 500));
    const req = createMockRequest('tv', '1399');
    const response = await GET(req, { params: { type: 'tv', id: '1399' } });
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json).toEqual({ error: 'Error fetching data from TMDB.' });
  });

  it('should return 502/503 if getTvWatchProviders fails', async () => {
    mockGetTvWatchProviders.mockRejectedValue(new TmdbError('TMDB TV Providers Error', 500));
    const req = createMockRequest('tv', '1399');
    const response = await GET(req, { params: { type: 'tv', id: '1399' } });
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json).toEqual({ error: 'Error fetching data from TMDB.' });
  });

  it('should return 500 if mapAvailability throws an error', async () => {
    mockMapAvailability.mockImplementation(() => {
      throw new Error('Availability mapping failed');
    });
    const req = createMockRequest('movie', '550');
    const response = await GET(req, { params: { type: 'movie', id: '550' } });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: 'Internal Server Error' });
  });
});
