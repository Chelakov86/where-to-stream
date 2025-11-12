import { TmdbError } from '@/app/tmdbClient';

const RETRYABLE_STATUS_CODES = new Set([429, 503, 504]);

export const mapTmdbErrorToHttpStatus = (error: TmdbError): number => {
  if (RETRYABLE_STATUS_CODES.has(error.status)) {
    return 503;
  }

  return 502;
};
