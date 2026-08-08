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
  const { run, isLoading, error, clearError } = useFetchLifecycle();

  useEffect(() => {
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
      if (status === 'error') {
        setProviders([]);
      }
    });
  }, [watchRegion, run]);

  return {
    providers,
    isLoading,
    error,
    clearError,
  };
}
