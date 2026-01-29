import { useState, useEffect, useCallback, useRef } from 'react';
import { WatchProvider } from '@/app/types';

const GLOBAL_ERROR_MESSAGE =
  "We're having trouble fetching data right now. Please try again later.";

/**
 * Custom hook for fetching and managing watch providers state with request cancellation.
 * Fetches providers from the API on mount and handles loading and error states.
 * Cancels the request if component unmounts before completion.
 *
 * @returns Object containing providers array, loading state, and error handling functions
 */
export function useProviders() {
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const showError = useCallback((message: string) => setError(message), []);

  useEffect(() => {
    const fetchProviders = async () => {
      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);

      try {
        const response = await fetch('/api/providers', {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch providers');
        }

        const data = await response.json();
        setProviders(Array.isArray(data.providers) ? data.providers : []);
        clearError();
      } catch (err) {
        // Don't show error for aborted requests
        if ((err as Error).name !== 'AbortError') {
          setProviders([]);
          showError(GLOBAL_ERROR_MESSAGE);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProviders();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [clearError, showError]);

  return {
    providers,
    isLoading,
    error,
    clearError,
  };
}
