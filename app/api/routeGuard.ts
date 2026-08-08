/**
 * Route guard module.
 *
 * Wraps API route handlers with rate limiting and standardized error
 * responses, so route handlers only contain their own logic: the fact that
 * TMDB errors exist, that limits can be hit, and that failures must be
 * logged never appears in a route body.
 */

import { TmdbError } from '@/app/tmdbClient';
import { checkRateLimit, RateLimitConfig, RateLimitResult } from '@/app/utils/rateLimiter';
import { logger } from '@/app/utils/logger';

const RATE_LIMIT_ERROR_MESSAGE = 'Rate limit exceeded. Please try again later.';
const TMDB_ERROR_MESSAGE = 'Error fetching data from TMDB.';
const INTERNAL_ERROR_MESSAGE = 'Internal Server Error';

const RETRYABLE_STATUS_CODES = new Set([429, 503, 504]);

const mapTmdbErrorToHttpStatus = (error: TmdbError): number => {
  if (RETRYABLE_STATUS_CODES.has(error.status)) {
    return 503;
  }
  return 502;
};

/**
 * Runs the rate limiter for a request. Returns either a 429 response
 * (when the limit is hit) or the result for attaching limit headers to
 * the successful response.
 */
export function enforceRateLimit(
  identifier: string,
  config: RateLimitConfig
): { response: Response | null; result: RateLimitResult } {
  const result = checkRateLimit(identifier, config);

  if (result.allowed) {
    return { response: null, result };
  }

  const resetDate = new Date(result.resetTime);
  const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);

  return {
    response: new Response(
      JSON.stringify({ error: RATE_LIMIT_ERROR_MESSAGE, resetTime: resetDate.toISOString() }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfterSeconds.toString(),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetDate.toISOString(),
        },
      }
    ),
    result,
  };
}

/**
 * Rate limit headers for a successful response.
 */
export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  const resetDate = new Date(result.resetTime);
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': resetDate.toISOString(),
  };
}

/**
 * Translates any thrown error into a standardized response: TmdbError gets a
 * mapped status (503 for retryable, 502 otherwise), everything else gets 500.
 * Logs both cases.
 */
export function handleRouteError(error: unknown, context: string): Response {
  if (error instanceof TmdbError) {
    logger.error(`TMDB API error in ${context}`, { status: error.status, message: error.message });
    return new Response(JSON.stringify({ error: TMDB_ERROR_MESSAGE }), {
      status: mapTmdbErrorToHttpStatus(error),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  logger.error(`Error in ${context}`, { error });
  return new Response(JSON.stringify({ error: INTERNAL_ERROR_MESSAGE }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface RouteGuardOptions {
  identifier: string;
  rateLimit: RateLimitConfig;
  context: string;
}

/**
 * Wraps a route handler: enforces the rate limit (429 when hit), runs the
 * handler, and translates any thrown error into a standardized response.
 *
 * @param options - Client identifier, rate limit config, and logging context
 * @param handler - The route's own logic; receives the rate limit result
 * @returns The handler's response, a 429, or a mapped error response
 */
export async function withRouteGuard(
  options: RouteGuardOptions,
  handler: (result: RateLimitResult) => Promise<Response>
): Promise<Response> {
  const { response: rateLimitResponse, result } = enforceRateLimit(
    options.identifier,
    options.rateLimit
  );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    return await handler(result);
  } catch (error) {
    return handleRouteError(error, options.context);
  }
}
