import {
  enforceRateLimit,
  handleRouteError,
  rateLimitHeaders,
  withRouteGuard,
} from '@/app/api/routeGuard';
import { TmdbError } from '@/app/tmdbClient';
import { clearRateLimits } from '@/app/utils/rateLimiter';

const RATE_LIMIT_ERROR_MESSAGE = 'Rate limit exceeded. Please try again later.';
const TMDB_ERROR_MESSAGE = 'Error fetching data from TMDB.';

describe('route guard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    clearRateLimits();
  });

  describe('withRouteGuard', () => {
    it('runs the handler and returns its response when allowed', async () => {
      const response = await withRouteGuard(
        { identifier: 'test-1', rateLimit: { windowMs: 60000, maxRequests: 10 }, context: 'test' },
        async () => new Response('ok', { status: 200 })
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('ok');
    });

    it('passes the rate limit result to the handler', async () => {
      let seenResult: unknown;
      await withRouteGuard(
        { identifier: 'test-1', rateLimit: { windowMs: 60000, maxRequests: 10 }, context: 'test' },
        async (result) => {
          seenResult = result;
          return new Response('ok');
        }
      );

      expect(seenResult).toMatchObject({ allowed: true, remaining: 9 });
    });

    it('returns 429 with limit headers when the rate limit is exceeded', async () => {
      const options = {
        identifier: 'test-2',
        rateLimit: { windowMs: 60000, maxRequests: 1 },
        context: 'test',
      };

      await withRouteGuard(options, async () => new Response('ok'));
      const blocked = await withRouteGuard(options, async () => new Response('ok'));

      expect(blocked.status).toBe(429);
      const body = await blocked.json();
      expect(body.error).toBe(RATE_LIMIT_ERROR_MESSAGE);
      expect(blocked.headers.get('Retry-After')).toBeTruthy();
      expect(blocked.headers.get('X-RateLimit-Limit')).toBe('1');
      expect(blocked.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(blocked.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('translates TmdbError to a mapped status with the standard message', async () => {
      const tmdbError = new TmdbError(500, 'TMDB service unavailable');
      const response = await withRouteGuard(
        { identifier: 'test-3', rateLimit: { windowMs: 60000, maxRequests: 10 }, context: 'test' },
        async () => {
          throw tmdbError;
        }
      );

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: TMDB_ERROR_MESSAGE });
    });

    it('maps retryable TMDB statuses to 503', async () => {
      const tmdbError = new TmdbError(429, 'Too many requests');
      const response = await withRouteGuard(
        { identifier: 'test-3', rateLimit: { windowMs: 60000, maxRequests: 10 }, context: 'test' },
        async () => {
          throw tmdbError;
        }
      );

      expect(response.status).toBe(503);
    });

    it('translates unknown errors to 500', async () => {
      const response = await withRouteGuard(
        { identifier: 'test-4', rateLimit: { windowMs: 60000, maxRequests: 10 }, context: 'test' },
        async () => {
          throw new Error('boom');
        }
      );

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Internal Server Error' });
    });
  });

  describe('enforceRateLimit', () => {
    it('returns no response when allowed and a 429 response when blocked', () => {
      const first = enforceRateLimit('test-5', { windowMs: 60000, maxRequests: 1 });
      expect(first.response).toBeNull();
      expect(first.result.allowed).toBe(true);

      const second = enforceRateLimit('test-5', { windowMs: 60000, maxRequests: 1 });
      expect(second.response).not.toBeNull();
      expect(second.response?.status).toBe(429);
      expect(second.result.allowed).toBe(false);
    });
  });

  describe('rateLimitHeaders', () => {
    it('builds the limit header set from a result', () => {
      const headers = rateLimitHeaders(
        { allowed: true, remaining: 7, resetTime: 1234567890000 },
        10
      );

      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('7');
      expect(headers['X-RateLimit-Reset']).toBe('2009-02-13T23:31:30.000Z');
    });
  });

  describe('handleRouteError', () => {
    it('returns 500 for non-TMDB errors', () => {
      const response = handleRouteError(new Error('boom'), 'test route');
      expect(response.status).toBe(500);
    });

    it('returns a mapped status for TMDB errors', () => {
      const response = handleRouteError(new TmdbError(404, 'Not found'), 'test route');
      expect(response.status).toBe(502);
    });
  });
});
