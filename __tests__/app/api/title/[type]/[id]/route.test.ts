import { NextRequest } from 'next/server';
import { TmdbError } from '@/app/tmdbClient';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: () => Promise.resolve(JSON.parse(JSON.stringify(data))),
      status: init?.status || 200,
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

// Mock country detection utilities
jest.mock('@/app/utils/countryDetection', () => ({
  detectUserCountry: jest.fn(),
}));

import * as tmdbApi from '@/app/tmdbApi';
import * as countryDetection from '@/app/utils/countryDetection';
import { GET } from '@/app/api/title/[type]/[id]/route';

const mockGetMovieDetails = tmdbApi.getMovieDetails as jest.Mock;
const mockGetMovieWatchProviders = tmdbApi.getMovieWatchProviders as jest.Mock;
const mockGetTvDetails = tmdbApi.getTvDetails as jest.Mock;
const mockGetTvWatchProviders = tmdbApi.getTvWatchProviders as jest.Mock;
const mockDetectUserCountry = countryDetection.detectUserCountry as jest.Mock;

const IMG = 'https://image.tmdb.org/t/p';

const netflix = {
  logo_path: '/netflix.jpg',
  provider_id: 8,
  provider_name: 'Netflix',
  display_priority: 1,
};

describe('GET /api/title/[type]/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetMovieDetails.mockResolvedValue({
      id: 550,
      title: 'Fight Club',
      original_title: 'Fight Club',
      release_date: '1999-10-15',
      genres: [{ id: 18, name: 'Drama' }],
      overview: 'An insomniac office worker...',
      tagline: 'Mischief. Mayhem. Soap.',
      vote_average: 8.4,
      vote_count: 30000,
      poster_path: '/poster.jpg',
      backdrop_path: '/backdrop.jpg',
      original_language: 'en',
      runtime: 139,
      credits: {
        cast: [
          { name: 'Edward Norton', character: 'Narrator', profile_path: '/norton.jpg' },
          { name: 'Brad Pitt', character: 'Tyler Durden', profile_path: null },
        ],
      },
      videos: {
        results: [
          { key: 'teaser', site: 'YouTube', type: 'Teaser' },
          { key: 'fan', site: 'YouTube', type: 'Trailer', official: false },
          { key: 'official', site: 'YouTube', type: 'Trailer', official: true },
        ],
      },
    });
    mockGetMovieWatchProviders.mockResolvedValue({
      id: 550,
      results: {
        US: { link: 'https://www.themoviedb.org/movie/550/watch?locale=US', flatrate: [netflix] },
        DE: { buy: [{ ...netflix, provider_id: 2, provider_name: 'Apple TV' }] },
        FR: {},
      },
    });
    mockGetTvDetails.mockResolvedValue({
      id: 1399,
      name: 'Game of Thrones',
      original_name: 'Game of Thrones',
      first_air_date: '2011-04-17',
      genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }],
      overview: 'Nine noble families...',
      tagline: '',
      vote_average: 8.4,
      vote_count: 25000,
      poster_path: '/got.jpg',
      backdrop_path: null,
      original_language: 'en',
      number_of_seasons: 8,
      number_of_episodes: 73,
      episode_run_time: [60],
    });
    mockGetTvWatchProviders.mockResolvedValue({ id: 1399, results: {} });

    mockDetectUserCountry.mockReturnValue('US');
  });

  const createMockRequest = (type: string, id: string) =>
    ({
      nextUrl: { pathname: `/api/title/${type}/${id}` },
      headers: { get: () => null },
    }) as unknown as NextRequest;

  // --- Valid Requests ---
  it('returns movie details with cast, trailer and availability by country', async () => {
    const req = createMockRequest('movie', '550');
    const response = await GET(req, { params: { type: 'movie', id: '550' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetMovieDetails).toHaveBeenCalledWith(550);
    expect(mockGetMovieWatchProviders).toHaveBeenCalledWith(550);
    expect(mockDetectUserCountry).toHaveBeenCalledWith(req);
    expect(json).toEqual({
      id: 550,
      type: 'movie',
      title: 'Fight Club',
      originalTitle: 'Fight Club',
      year: 1999,
      genres: [{ id: 18, name: 'Drama' }],
      overview: 'An insomniac office worker...',
      tagline: 'Mischief. Mayhem. Soap.',
      rating: 8.4,
      voteCount: 30000,
      posterUrl: `${IMG}/w500/poster.jpg`,
      backdropUrl: `${IMG}/w1280/backdrop.jpg`,
      runtime: 139,
      language: 'en',
      cast: [
        { name: 'Edward Norton', character: 'Narrator', profileUrl: `${IMG}/w185/norton.jpg` },
        { name: 'Brad Pitt', character: 'Tyler Durden' },
      ],
      trailerUrl: 'https://www.youtube.com/watch?v=official',
      detectedCountry: 'US',
      availability: {
        US: {
          countryCode: 'US',
          countryName: 'United States',
          watchLink: 'https://www.themoviedb.org/movie/550/watch?locale=US',
          flatrate: [{ id: 8, name: 'Netflix', logoUrl: `${IMG}/w92/netflix.jpg` }],
          free: [],
          rent: [],
          buy: [],
        },
        DE: {
          countryCode: 'DE',
          countryName: 'Germany',
          flatrate: [],
          free: [],
          rent: [],
          buy: [{ id: 2, name: 'Apple TV', logoUrl: `${IMG}/w92/netflix.jpg` }],
        },
      },
    });
  });

  it('returns series details with seasons and episodes', async () => {
    const response = await GET(createMockRequest('tv', '1399'), {
      params: { type: 'tv', id: '1399' },
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetTvDetails).toHaveBeenCalledWith(1399);
    expect(mockGetTvWatchProviders).toHaveBeenCalledWith(1399);
    expect(json).toMatchObject({
      id: 1399,
      type: 'tv',
      title: 'Game of Thrones',
      year: 2011,
      runtime: 60,
      seasons: 8,
      episodes: 73,
      cast: [],
      availability: {},
    });
    expect(json).not.toHaveProperty('tagline');
    expect(json).not.toHaveProperty('backdropUrl');
    expect(json).not.toHaveProperty('trailerUrl');
  });

  it('reports an undetected country as null', async () => {
    mockDetectUserCountry.mockReturnValue('XX');
    const response = await GET(createMockRequest('movie', '550'), {
      params: { type: 'movie', id: '550' },
    });
    expect((await response.json()).detectedCountry).toBeNull();
  });

  // --- Invalid Requests ---
  it('should return 400 for an invalid type parameter', async () => {
    const response = await GET(createMockRequest('unknown', '123'), {
      params: { type: 'unknown', id: '123' },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid type. Must be "movie" or "tv".' });
    expect(mockGetMovieDetails).not.toHaveBeenCalled();
    expect(mockGetTvDetails).not.toHaveBeenCalled();
  });

  it('should return 400 for a non-numeric ID parameter', async () => {
    const response = await GET(createMockRequest('movie', 'abc'), {
      params: { type: 'movie', id: 'abc' },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid ID. Must be a positive integer.' });
    expect(mockGetMovieDetails).not.toHaveBeenCalled();
  });

  it('should return 400 for a non-positive integer ID parameter', async () => {
    const response = await GET(createMockRequest('tv', '0'), { params: { type: 'tv', id: '0' } });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid ID. Must be a positive integer.' });
    expect(mockGetTvDetails).not.toHaveBeenCalled();
  });

  // --- Error Handling ---
  it('should return 502 if getMovieDetails fails', async () => {
    mockGetMovieDetails.mockRejectedValue(new TmdbError(500, 'TMDB Movie Details Error'));
    const response = await GET(createMockRequest('movie', '550'), {
      params: { type: 'movie', id: '550' },
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Error fetching data from TMDB.' });
  });

  it('should return 503 if TMDB movie details are unavailable', async () => {
    mockGetMovieDetails.mockRejectedValue(new TmdbError(503, 'Service Unavailable'));
    const response = await GET(createMockRequest('movie', '550'), {
      params: { type: 'movie', id: '550' },
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Error fetching data from TMDB.' });
  });

  it('should return 502 if getTvWatchProviders fails', async () => {
    mockGetTvWatchProviders.mockRejectedValue(new TmdbError(500, 'TMDB TV Providers Error'));
    const response = await GET(createMockRequest('tv', '1399'), {
      params: { type: 'tv', id: '1399' },
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Error fetching data from TMDB.' });
  });

  it('should return 500 if the provider data is malformed', async () => {
    mockGetMovieWatchProviders.mockResolvedValue(null);
    const response = await GET(createMockRequest('movie', '550'), {
      params: { type: 'movie', id: '550' },
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal Server Error' });
  });
});
