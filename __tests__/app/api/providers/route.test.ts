import { GET } from '@/app/api/providers/route';
import * as tmdbApi from '@/app/tmdbApi';
import { TmdbError } from '@/app/tmdbClient';

// Mock the tmdbApi module
jest.mock('@/app/tmdbApi');

// Helper to create a test Request for the providers route
const makeRequest = (params: Record<string, string> = {}) => {
  const url = new URL('http://localhost/api/providers');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString());
};

describe('GET /api/providers', () => {
  const mockMovieProviders = {
    results: [
      { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
      {
        provider_id: 9,
        provider_name: 'Amazon Prime Video',
        logo_path: '/prime.jpg',
        display_priority: 2,
      },
      {
        provider_id: 337,
        provider_name: 'Disney Plus',
        logo_path: '/disney.jpg',
        display_priority: 3,
      },
    ],
  };

  const mockTvProviders = {
    results: [
      { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
      {
        provider_id: 350,
        provider_name: 'Apple TV Plus',
        logo_path: '/apple.jpg',
        display_priority: 4,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns combined and deduplicated list of providers', async () => {
    (tmdbApi.getMovieWatchProvidersList as jest.Mock).mockResolvedValue(mockMovieProviders);
    (tmdbApi.getTvWatchProvidersList as jest.Mock).mockResolvedValue(mockTvProviders);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.providers).toHaveLength(4); // 8, 9, 337, 350 (8 is deduplicated)
    expect(data.providers).toEqual([
      { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
      {
        provider_id: 9,
        provider_name: 'Amazon Prime Video',
        logo_path: '/prime.jpg',
        display_priority: 2,
      },
      {
        provider_id: 337,
        provider_name: 'Disney Plus',
        logo_path: '/disney.jpg',
        display_priority: 3,
      },
      {
        provider_id: 350,
        provider_name: 'Apple TV Plus',
        logo_path: '/apple.jpg',
        display_priority: 4,
      },
    ]);
  });

  it('returns providers sorted by display_priority', async () => {
    const unsortedMovieProviders = {
      results: [
        {
          provider_id: 337,
          provider_name: 'Disney Plus',
          logo_path: '/disney.jpg',
          display_priority: 10,
        },
        {
          provider_id: 8,
          provider_name: 'Netflix',
          logo_path: '/netflix.jpg',
          display_priority: 1,
        },
        {
          provider_id: 9,
          provider_name: 'Amazon Prime Video',
          logo_path: '/prime.jpg',
          display_priority: 5,
        },
      ],
    };

    (tmdbApi.getMovieWatchProvidersList as jest.Mock).mockResolvedValue(unsortedMovieProviders);
    (tmdbApi.getTvWatchProvidersList as jest.Mock).mockResolvedValue({ results: [] });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.providers[0].provider_id).toBe(8); // Netflix with priority 1
    expect(data.providers[1].provider_id).toBe(9); // Prime with priority 5
    expect(data.providers[2].provider_id).toBe(337); // Disney with priority 10
  });

  it('handles TMDB API errors gracefully', async () => {
    // TmdbError constructor: (status: number, statusText: string, body?)
    const tmdbError = new TmdbError(503, 'TMDB service unavailable');
    (tmdbApi.getMovieWatchProvidersList as jest.Mock).mockRejectedValue(tmdbError);
    (tmdbApi.getTvWatchProvidersList as jest.Mock).mockResolvedValue(mockTvProviders);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(503); // Service Unavailable for retryable TMDB errors (429, 503, 504)
    expect(data.error).toBe('TMDB API error: 503 TMDB service unavailable');
  });

  it('handles internal errors gracefully', async () => {
    const internalError = new Error('Unexpected error');
    (tmdbApi.getMovieWatchProvidersList as jest.Mock).mockRejectedValue(internalError);
    (tmdbApi.getTvWatchProvidersList as jest.Mock).mockResolvedValue(mockTvProviders);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('fetches movie and TV providers in parallel', async () => {
    (tmdbApi.getMovieWatchProvidersList as jest.Mock).mockResolvedValue(mockMovieProviders);
    (tmdbApi.getTvWatchProvidersList as jest.Mock).mockResolvedValue(mockTvProviders);

    await GET(makeRequest());

    // Both functions should be called
    expect(tmdbApi.getMovieWatchProvidersList).toHaveBeenCalledTimes(1);
    expect(tmdbApi.getTvWatchProvidersList).toHaveBeenCalledTimes(1);
  });
});
