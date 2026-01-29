import { GET } from '@/app/api/providers/route';
import * as tmdbApi from '@/app/tmdbApi';
import { TmdbError } from '@/app/tmdbClient';

// Mock the tmdbApi module
jest.mock('@/app/tmdbApi');

describe('GET /api/providers', () => {
  const mockMovieProviders = {
    results: [
      { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
      { provider_id: 9, provider_name: 'Amazon Prime Video', logo_path: '/prime.jpg', display_priority: 2 },
      { provider_id: 337, provider_name: 'Disney Plus', logo_path: '/disney.jpg', display_priority: 3 },
    ],
  };

  const mockTvProviders = {
    results: [
      { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
      { provider_id: 350, provider_name: 'Apple TV Plus', logo_path: '/apple.jpg', display_priority: 4 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns combined and deduplicated list of providers', async () => {
    (tmdbApi.getMovieWatchProvidersList as jest.Mock).mockResolvedValue(mockMovieProviders);
    (tmdbApi.getTvWatchProvidersList as jest.Mock).mockResolvedValue(mockTvProviders);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.providers).toHaveLength(4); // 8, 9, 337, 350 (8 is deduplicated)
    expect(data.providers).toEqual([
      { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
      { provider_id: 9, provider_name: 'Amazon Prime Video', logo_path: '/prime.jpg', display_priority: 2 },
      { provider_id: 337, provider_name: 'Disney Plus', logo_path: '/disney.jpg', display_priority: 3 },
      { provider_id: 350, provider_name: 'Apple TV Plus', logo_path: '/apple.jpg', display_priority: 4 },
    ]);
  });

  it('returns providers sorted by display_priority', async () => {
    const unsortedMovieProviders = {
      results: [
        { provider_id: 337, provider_name: 'Disney Plus', logo_path: '/disney.jpg', display_priority: 10 },
        { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
        { provider_id: 9, provider_name: 'Amazon Prime Video', logo_path: '/prime.jpg', display_priority: 5 },
      ],
    };

    (tmdbApi.getMovieWatchProvidersList as jest.Mock).mockResolvedValue(unsortedMovieProviders);
    (tmdbApi.getTvWatchProvidersList as jest.Mock).mockResolvedValue({ results: [] });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.providers[0].provider_id).toBe(8); // Netflix with priority 1
    expect(data.providers[1].provider_id).toBe(9); // Prime with priority 5
    expect(data.providers[2].provider_id).toBe(337); // Disney with priority 10
  });

  it('handles TMDB API errors gracefully', async () => {
    const tmdbError = new TmdbError('TMDB service unavailable', 503);
    (tmdbApi.getMovieWatchProvidersList as jest.Mock).mockRejectedValue(tmdbError);
    (tmdbApi.getTvWatchProvidersList as jest.Mock).mockResolvedValue(mockTvProviders);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(502); // Bad Gateway for TMDB errors
    expect(data.error).toBe('TMDB API error: TMDB service unavailable 503');
  });

  it('handles internal errors gracefully', async () => {
    const internalError = new Error('Unexpected error');
    (tmdbApi.getMovieWatchProvidersList as jest.Mock).mockRejectedValue(internalError);
    (tmdbApi.getTvWatchProvidersList as jest.Mock).mockResolvedValue(mockTvProviders);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('fetches movie and TV providers in parallel', async () => {
    (tmdbApi.getMovieWatchProvidersList as jest.Mock).mockResolvedValue(mockMovieProviders);
    (tmdbApi.getTvWatchProvidersList as jest.Mock).mockResolvedValue(mockTvProviders);

    await GET();

    // Both functions should be called
    expect(tmdbApi.getMovieWatchProvidersList).toHaveBeenCalledTimes(1);
    expect(tmdbApi.getTvWatchProvidersList).toHaveBeenCalledTimes(1);
  });
});
