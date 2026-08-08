import { useState, useCallback, useRef, useEffect } from 'react';
import { debounceWithCancel } from '@/app/utils/debounce';
import { TMDBResult } from '@/app/types';
import { serializeSearchRequest } from '@/app/searchContract';
import { useFetchLifecycle } from '@/app/hooks/useFetchLifecycle';

const DEBOUNCE_DELAY_MS = 300; // 300ms debounce delay

/**
 * Custom hook for managing autocomplete suggestions with debouncing and request cancellation.
 * Reduces API calls by debouncing rapid user input and cancels in-flight requests when new ones start.
 *
 * @param onError - Optional callback to handle errors
 * @returns Object containing autocomplete items, loading state, and handler functions
 */
export function useAutocomplete(onError?: (message: string | null) => void) {
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<TMDBResult[]>([]);
  // Optimistic loading shown during the debounce window, before the fetch starts
  const [pendingLoad, setPendingLoad] = useState(false);
  const { run, cancel, isLoading: isFetching } = useFetchLifecycle(onError);
  const isLoading = pendingLoad || isFetching;

  // Actual fetch function that will be debounced
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setAutocompleteSuggestions([]);
        setPendingLoad(false);
        return;
      }

      const status = await run(async (signal) => {
        const queryString = serializeSearchRequest({ query }, { mode: 'autocomplete' });
        const response = await fetch(`/api/search?${queryString}`, { signal });

        if (!response.ok) {
          throw new Error('Failed to fetch autocomplete suggestions');
        }

        const data = await response.json();
        if (signal.aborted) {
          return;
        }
        setAutocompleteSuggestions(data.results);
      });

      if (status !== 'cancelled') {
        setPendingLoad(false);
      }
    },
    [run]
  );

  // Create debounced version of fetch
  const debouncedFetch = useRef(
    debounceWithCancel(
      ((query: string) => {
        void fetchSuggestions(query);
      }) as (...args: unknown[]) => unknown,
      DEBOUNCE_DELAY_MS
    )
  ).current;

  const handleAutocompleteRequest = useCallback(
    (query: string) => {
      // Show loading immediately for better UX
      if (query.trim().length >= 2) {
        setPendingLoad(true);
      } else {
        setAutocompleteSuggestions([]);
        setPendingLoad(false);
      }
      // Debounce the actual fetch
      debouncedFetch.debounced(query);
    },
    [debouncedFetch]
  );

  const clearAutocomplete = useCallback(() => {
    setAutocompleteSuggestions([]);
    setPendingLoad(false);
    debouncedFetch.cancel();
    // Cancel any pending request
    cancel();
  }, [cancel, debouncedFetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedFetch.cancel();
      cancel();
    };
  }, [cancel, debouncedFetch]);

  return {
    autocompleteSuggestions,
    isLoading,
    handleAutocompleteRequest,
    clearAutocomplete,
  };
}
