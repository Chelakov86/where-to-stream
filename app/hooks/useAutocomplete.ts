import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from '@/app/utils/debounce';
import { TMDBResult } from '@/app/types';

const GLOBAL_ERROR_MESSAGE =
  "We're having trouble fetching data right now. Please try again later.";

const DEBOUNCE_DELAY_MS = 300; // 300ms debounce delay

/**
 * Custom hook for managing autocomplete suggestions with debouncing and request cancellation.
 * Reduces API calls by debouncing rapid user input and cancels in-flight requests when new ones start.
 *
 * @param onError - Optional callback to handle errors
 * @returns Object containing autocomplete items, loading state, and handler functions
 */
export function useAutocomplete(onError?: (message: string) => void) {
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<TMDBResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Actual fetch function that will be debounced
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setAutocompleteSuggestions([]);
        setIsLoading(false);
        return;
      }

      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/search?mode=autocomplete&query=${encodeURIComponent(query)}`,
          { signal: abortControllerRef.current.signal }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch autocomplete suggestions');
        }

        const data = await response.json();
        setAutocompleteSuggestions(data.results);
      } catch (err) {
        // Don't show error for aborted requests
        if ((err as Error).name !== 'AbortError') {
          setAutocompleteSuggestions([]);
          if (onError) {
            onError(GLOBAL_ERROR_MESSAGE);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [onError]
  );

  // Create debounced version of fetch
  const debouncedFetch = useRef(
    debounce((query: string) => {
      fetchSuggestions(query);
    }, DEBOUNCE_DELAY_MS)
  ).current;

  const handleAutocompleteRequest = useCallback(
    (query: string) => {
      // Show loading immediately for better UX
      if (query.trim().length >= 2) {
        setIsLoading(true);
      } else {
        setAutocompleteSuggestions([]);
        setIsLoading(false);
      }
      // Debounce the actual fetch
      debouncedFetch(query);
    },
    [debouncedFetch]
  );

  const clearAutocomplete = useCallback(() => {
    setAutocompleteSuggestions([]);
    setIsLoading(false);
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    autocompleteSuggestions,
    isLoading,
    handleAutocompleteRequest,
    clearAutocomplete,
  };
}
