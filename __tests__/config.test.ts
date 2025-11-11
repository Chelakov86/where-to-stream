import { TMDB_BASE_URL, PREFERRED_COUNTRIES, CACHE_TTL_SECONDS, getTmdbApiKey } from '@/app/config';

describe('config module', () => {
  describe('TMDB_BASE_URL', () => {
    it('should be a string with the correct TMDB API base URL', () => {
      expect(TMDB_BASE_URL).toBe('https://api.themoviedb.org/3');
      expect(typeof TMDB_BASE_URL).toBe('string');
    });
  });

  describe('PREFERRED_COUNTRIES', () => {
    it('should be exactly ["DE", "GB", "US", "CA"] in that order', () => {
      expect(PREFERRED_COUNTRIES).toEqual(['DE', 'GB', 'US', 'CA']);
    });

    it('should have exactly 4 countries', () => {
      expect(PREFERRED_COUNTRIES).toHaveLength(4);
    });

    it('should be readonly (immutable)', () => {
      expect(Object.isFrozen(PREFERRED_COUNTRIES)).toBe(true);
    });
  });

  describe('CACHE_TTL_SECONDS', () => {
    it('should be a number representing 12 hours in seconds', () => {
      expect(CACHE_TTL_SECONDS).toBe(43200); // 12 * 60 * 60
      expect(typeof CACHE_TTL_SECONDS).toBe('number');
    });
  });

  describe('getTmdbApiKey()', () => {
    const originalEnv = process.env.TMDB_API_KEY;

    afterEach(() => {
      // Restore original env var after each test
      if (originalEnv !== undefined) {
        process.env.TMDB_API_KEY = originalEnv;
      } else {
        delete process.env.TMDB_API_KEY;
      }
    });

    it('should throw a clear error when TMDB_API_KEY is not set', () => {
      delete process.env.TMDB_API_KEY;

      expect(() => getTmdbApiKey()).toThrow('TMDB_API_KEY is not set');
    });

    it('should throw a clear error when TMDB_API_KEY is empty string', () => {
      process.env.TMDB_API_KEY = '';

      expect(() => getTmdbApiKey()).toThrow('TMDB_API_KEY is not set');
    });

    it('should return the API key when TMDB_API_KEY is set', () => {
      const testApiKey = 'test-api-key-12345';
      process.env.TMDB_API_KEY = testApiKey;

      expect(getTmdbApiKey()).toBe(testApiKey);
    });

    it('should return a string', () => {
      process.env.TMDB_API_KEY = 'test-key';

      expect(typeof getTmdbApiKey()).toBe('string');
    });
  });
});
