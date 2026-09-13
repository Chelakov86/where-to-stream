'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFetchLifecycle } from '@/app/hooks/useFetchLifecycle';
import { CLIENT_CACHE_TTL_MS, MAX_CLIENT_CACHE_ENTRIES } from '@/app/config';

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
  const [reloadCount, setReloadCount] = useState(0);
  const { run, error, clearError } = useFetchLifecycle();

  useEffect(() => {
    if (!url) {
      return;
    }
    clearError();
    const cached = reloadCount === 0 ? readCached<T>(url) : undefined;
    if (cached !== undefined) {
      setResult({ url, data: cached });
      return;
    }
    void run(async (signal) => {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`Request to ${url} failed with status ${response.status}`);
      }
      const data = (await response.json()) as T;
      if (signal.aborted) {
        return;
      }
      writeCached(url, data);
      setResult({ url, data });
    });
  }, [url, reloadCount, run, clearError]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  const data = result && result.url === url ? result.data : undefined;
  return {
    data,
    error: data === undefined ? error : null,
    isLoading: url !== null && data === undefined && !error,
    reload,
  };
}
