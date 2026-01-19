import { useState, useEffect, useCallback, useRef } from 'react';
import { Genre } from '@/app/types';

const GLOBAL_ERROR_MESSAGE =
  "We're having trouble fetching data right now. Please try again later.";

/**
 * Custom hook for fetching and managing genres state with request cancellation.
 * Fetches genres from the API on mount and handles loading and error states.
 * Cancels the request if component unmounts before completion.
 *
 * @returns Object containing genres array, loading state, and error handling functions
 */
export function useGenres() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const showError = useCallback((message: string) => setError(message), []);

  useEffect(() => {
    const fetchGenres = async () => {
      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);

      try {
        const response = await fetch('/api/genres', {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch genres');
        }

        const data = await response.json();
        // API returns { movie: Genre[], tv: Genre[] }, combine and deduplicate by id
        const allGenres = [...(data.movie || []), ...(data.tv || [])];
        const uniqueGenres = Array.from(
          new Map(allGenres.map((genre) => [genre.id, genre])).values()
        );
        setGenres(Array.isArray(uniqueGenres) ? uniqueGenres : []);
        clearError();
      } catch (err) {
        // Don't show error for aborted requests
        if ((err as Error).name !== 'AbortError') {
          setGenres([]);
          showError(GLOBAL_ERROR_MESSAGE);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenres();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [clearError, showError]);

  return {
    genres,
    isLoading,
    error,
    clearError,
  };
}
