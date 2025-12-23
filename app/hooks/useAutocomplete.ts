import { useState, useCallback } from 'react';
import { TMDBResult } from '@/app/types';

const GLOBAL_ERROR_MESSAGE =
  "We're having trouble fetching data right now. Please try again later.";

/**
 * Custom hook for managing autocomplete suggestions.
 * Handles fetching autocomplete results and managing the suggestions state.
 *
 * @param onError - Optional callback to handle errors
 * @returns Object containing autocomplete items, loading state, and handler functions
 */
export function useAutocomplete(onError?: (message: string) => void) {
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<TMDBResult[]>([]);

  const handleAutocompleteRequest = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setAutocompleteSuggestions([]);
        return;
      }
      try {
        const response = await fetch(
          `/api/search?mode=autocomplete&query=${encodeURIComponent(query)}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch autocomplete suggestions');
        }
        const data = await response.json();
        setAutocompleteSuggestions(data.results);
      } catch (err) {
        setAutocompleteSuggestions([]);
        if (onError) {
          onError(GLOBAL_ERROR_MESSAGE);
        }
      }
    },
    [onError]
  );

  const clearAutocomplete = useCallback(() => {
    setAutocompleteSuggestions([]);
  }, []);

  return {
    autocompleteSuggestions,
    handleAutocompleteRequest,
    clearAutocomplete,
  };
}
