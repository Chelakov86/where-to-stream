import { useState, useEffect } from 'react';
import { WatchProvider } from '@/app/types';
import { useFetchLifecycle } from '@/app/hooks/useFetchLifecycle';

/**
 * Custom hook for fetching and managing watch providers state with request cancellation.
 * Fetches providers from the API on mount and handles loading and error states.
 * Cancels the request if component unmounts before completion.
 *
 * @returns Object containing providers array, loading state, and error handling functions
 */
export function useProviders(watchRegion?: string) {
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [settledRegion, setSettledRegion] = useState<string | null>(null);
  const { run, cancel, isLoading, error, clearError } = useFetchLifecycle();

  useEffect(() => {
    let active = true;
    setSettledRegion(null);
    clearError();
    // If no region is selected, clear providers and don't fetch
    if (!watchRegion) {
      setProviders([]);
      return;
    }

    run(async (signal) => {
      const url = new URL('/api/providers', window.location.origin);
      if (watchRegion) {
        url.searchParams.append('watchRegion', watchRegion);
      }

      const response = await fetch(url.toString(), { signal });

      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }

      const data = await response.json();
      if (signal.aborted) {
        return;
      }
      setProviders(Array.isArray(data.providers) ? data.providers : []);
    }).then((status) => {
      if (!active) return;
      if (status === 'error') {
        setProviders([]);
      }
      setSettledRegion(watchRegion);
    });

    return () => {
      active = false;
      cancel();
    };
  }, [watchRegion, run, cancel, clearError]);

  return {
    providers: settledRegion === watchRegion ? providers : [],
    // A new region is pending even before the fetching effect has started.
    isLoading: !!watchRegion && (isLoading || settledRegion !== watchRegion),
    error: settledRegion === watchRegion ? error : null,
    clearError,
  };
}
