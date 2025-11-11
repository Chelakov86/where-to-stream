import { tmdbGet, TmdbError } from '@/app/tmdbClient';
import { getTmdbApiKey } from '@/app/config';

// Mock the config module
jest.mock('@/app/config', () => ({
  ...jest.requireActual('@/app/config'),
  getTmdbApiKey: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('tmdbClient', () => {
  const mockApiKey = 'test-api-key-12345';
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  const mockGetTmdbApiKey = getTmdbApiKey as jest.MockedFunction<typeof getTmdbApiKey>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTmdbApiKey.mockReturnValue(mockApiKey);
  });

  describe('tmdbGet', () => {
    it('should make a GET request and return parsed JSON', async () => {
      const mockResponse = { id: 123, title: 'Test Movie' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      } as Response);

      const result = await tmdbGet<typeof mockResponse>('/movie/123');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should correctly build URL with base URL and path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({}),
      } as Response);

      await tmdbGet('/search/movie');

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('https://api.themoviedb.org/3/search/movie');
    });

    it('should append query parameters to the URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({}),
      } as Response);

      await tmdbGet('/search/movie', { query: 'Inception', page: 1 });

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('query=Inception');
      expect(fetchUrl).toContain('page=1');
    });

    it('should include Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({}),
      } as Response);

      await tmdbGet('/movie/123');

      const fetchOptions = mockFetch.mock.calls[0][1];
      expect(fetchOptions?.headers).toEqual({
        Authorization: `Bearer ${mockApiKey}`,
        'Content-Type': 'application/json',
      });
    });

    it('should filter out undefined query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({}),
      } as Response);

      await tmdbGet('/search/movie', {
        query: 'Inception',
        page: undefined,
        year: 2010,
      });

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('query=Inception');
      expect(fetchUrl).toContain('year=2010');
      expect(fetchUrl).not.toContain('page');
    });

    it('should throw TmdbError for non-2xx responses', async () => {
      const errorBody = { status_message: 'Invalid API key', status_code: 7 };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => errorBody,
      } as Response);

      await expect(tmdbGet('/movie/123')).rejects.toThrow(TmdbError);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => errorBody,
      } as Response);

      try {
        await tmdbGet('/movie/123');
      } catch (error) {
        expect(error).toBeInstanceOf(TmdbError);
        if (error instanceof TmdbError) {
          expect(error.status).toBe(401);
          expect(error.statusText).toBe('Unauthorized');
          expect(error.body).toEqual(errorBody);
          expect(error.message).toContain('401');
          expect(error.message).toContain('Unauthorized');
        }
      }
    });

    it('should throw TmdbError with status 404 for not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ status_message: 'Resource not found' }),
      } as Response);

      await expect(tmdbGet('/movie/999999')).rejects.toThrow(TmdbError);

      try {
        await tmdbGet('/movie/999999');
      } catch (error) {
        if (error instanceof TmdbError) {
          expect(error.status).toBe(404);
          expect(error.statusText).toBe('Not Found');
        }
      }
    });

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(tmdbGet('/movie/123')).rejects.toThrow('Network error');
    });

    it('should return typed response based on generic parameter', async () => {
      interface MovieResponse {
        id: number;
        title: string;
        release_date: string;
      }

      const mockMovie: MovieResponse = {
        id: 550,
        title: 'Fight Club',
        release_date: '1999-10-15',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockMovie,
      } as Response);

      const result = await tmdbGet<MovieResponse>('/movie/550');

      expect(result.id).toBe(550);
      expect(result.title).toBe('Fight Club');
      expect(result.release_date).toBe('1999-10-15');
    });

    it('should handle empty query parameters object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({}),
      } as Response);

      await tmdbGet('/movie/123', {});

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toBe('https://api.themoviedb.org/3/movie/123');
    });

    it('should handle no query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({}),
      } as Response);

      await tmdbGet('/movie/123');

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toBe('https://api.themoviedb.org/3/movie/123');
    });
  });

  describe('TmdbError', () => {
    it('should be an instance of Error', () => {
      const error = new TmdbError(404, 'Not Found', { error: 'test' });
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct properties', () => {
      const body = { status_message: 'Test error' };
      const error = new TmdbError(500, 'Internal Server Error', body);

      expect(error.status).toBe(500);
      expect(error.statusText).toBe('Internal Server Error');
      expect(error.body).toEqual(body);
      expect(error.name).toBe('TmdbError');
    });

    it('should create error without body', () => {
      const error = new TmdbError(503, 'Service Unavailable');

      expect(error.status).toBe(503);
      expect(error.statusText).toBe('Service Unavailable');
      expect(error.body).toBeUndefined();
    });
  });
});
