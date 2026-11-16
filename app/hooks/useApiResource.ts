'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFetchLifecycle } from '@/app/hooks/useFetchLifecycle';
import { CLIENT_CACHE_TTL_MS, MAX_CLIENT_CACHE_ENTRIES } from '@/app/config';

import { ClientRequestError } from '@/app/utils/clientErrors';
import { fetchJson } from '@/app/utils/fetchJson';

// Shared across remounts so navigation cannot bypass a server retry deadline.
const retryFailures = new Map<string, ClientRequestError>();
function retryFailure(url: string): ClientRequestError | undefined {
  const failure = retryFailures.get(url);
  if (failure && (failure.retryAt ?? 0) > Date.now()) return failure;
  retryFailures.delete(url);
  return undefined;
}

const responseCache = new Map<string, { data: unknown; expiresAt: number }>();

function readCached<T>(url: string): T | undefined {
  const hit = responseCache.get(url);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    responseCache.delete(url);
    return undefined;
  }
  return hit.data as T;
}

function writeCached(url: string, data: unknown): void {
  if (responseCache.size >= MAX_CLIENT_CACHE_ENTRIES) {
    responseCache.clear();
  }
  responseCache.set(url, { data, expiresAt: Date.now() + CLIENT_CACHE_TTL_MS });
}

/** Clears the client response cache. Intended for tests. */
export function clearApiResourceCache(): void {
  responseCache.clear();
  retryFailures.clear();
}

/**
 * Fetches JSON from an API route whenever the URL changes, with a short-lived
 * client cache so revisiting a page renders instantly.
 *
 * @param url - API URL to fetch, or null to fetch nothing yet
 * @returns The data for the current URL, loading and error state, and a reload function
 */
export function useApiResource<T>(url: string | null) {
  const [result, setResult] = useState<{ url: string; data: T } | null>(() => {
    const cached = url ? readCached<T>(url) : undefined;
    return url && cached !== undefined ? { url, data: cached } : null;
  });
  const [requestUrl, setRequestUrl] = useState(url);
  const [reloadCount, setReloadCount] = useState(0);
  const { run, cancel, error, failure, clearError } = useFetchLifecycle();

  useEffect(() => {
    if (!url) {
      return;
    }
    setRequestUrl(url);
    clearError();
    const cached = reloadCount === 0 ? readCached<T>(url) : undefined;
    if (cached !== undefined) {
      setResult({ url, data: cached });
      return;
    }
    void run(async (signal) => {
      let data: T;
      try {
        const waiting = retryFailure(url);
        if (waiting) throw waiting;
        data = await fetchJson<T>(url, signal);
      } catch (error) {
        if (!signal.aborted && error instanceof ClientRequestError && error.retryAt) {
          for (const key of retryFailures.keys()) retryFailure(key);
          retryFailures.set(url, error);
        }
        throw error;
      }
      if (signal.aborted) {
        return;
      }
      writeCached(url, data);
      setResult({ url, data });
    });
    return cancel;
  }, [url, reloadCount, run, cancel, clearError]);

  // Gate the action itself as well as the button, including retained callbacks.
  const reload = useCallback(() => {
    if (url && retryFailure(url)) return;
    setReloadCount((count) => count + 1);
  }, [url]);

  const data = result && result.url === url ? result.data : undefined;
  return {
    data,
    failure: requestUrl === url && data === undefined ? failure : null,
    error: requestUrl === url && data === undefined ? error : null,
    isLoading: url !== null && data === undefined && (requestUrl !== url || !error),
    reload,
  };
}
