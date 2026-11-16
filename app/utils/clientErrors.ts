/** Client-safe transport facts. Never retain or display server response bodies. */
export type FailureKind =
  | 'not-found'
  | 'offline'
  | 'network'
  | 'timeout'
  | 'rate-limit'
  | 'server'
  | 'invalid'
  | 'unknown';

export class ClientRequestError extends Error {
  constructor(
    public readonly kind: FailureKind,
    public readonly status?: number,
    public readonly retryAt?: number
  ) {
    super(kind);
    this.name = 'ClientRequestError';
  }
}

/** Ignore invalid/past headers; cap dates at the largest representable JS date. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value?.trim()) return undefined;
  const raw = value.trim();
  const deadline = /^\d+$/.test(raw)
    ? Math.min(now + Number(raw) * 1000, 8.64e15)
    : /^[A-Za-z]{3},/.test(raw)
      ? Date.parse(raw)
      : NaN;
  return Number.isFinite(deadline) && deadline > now ? deadline : undefined;
}

export function httpFailure(status: number, retryAfter: string | null): ClientRequestError {
  const kind =
    status === 404
      ? 'not-found'
      : status === 429
        ? 'rate-limit'
        : status === 408 || status === 504
          ? 'timeout'
          : status >= 500
            ? 'server'
            : status === 400
              ? 'invalid'
              : 'unknown';
  return new ClientRequestError(
    kind,
    status,
    parseRetryAfter(retryAfter) ?? (status === 429 ? Date.now() + 30_000 : undefined)
  );
}

export const FAILURE_COPY: Record<FailureKind, { title: string; message: string }> = {
  'not-found': {
    title: 'Not found',
    message: "We couldn't find what you're looking for. Return to search to find another title.",
  },
  offline: {
    title: 'You appear to be offline',
    message: 'Check your internet connection, then try again.',
  },
  network: {
    title: 'Unable to connect',
    message: 'Check your connection and try again. If it continues, try again later.',
  },
  timeout: {
    title: 'The request took too long',
    message: 'Please try again. If it continues, try again later.',
  },
  'rate-limit': {
    title: 'Too many requests',
    message: 'Please wait before trying again.',
  },
  server: {
    title: 'The service is temporarily unavailable',
    message: 'Please try again later.',
  },
  invalid: {
    title: 'Check your search',
    message: 'Review your search and filters, then try again.',
  },
  unknown: {
    title: "We couldn't load this data",
    message: "We're having trouble fetching data right now. Please try again later.",
  },
};

export function classifyClientError(error: unknown): ClientRequestError {
  if (error instanceof ClientRequestError) return error;
  return new ClientRequestError('unknown');
}
