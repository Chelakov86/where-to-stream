import { useState, useEffect, useCallback } from 'react';
import { Genre } from '@/app/types';

const GLOBAL_ERROR_MESSAGE =
  "We're having trouble fetching data right now. Please try again later.";

/**
 * Custom hook for fetching and managing genres state.
 * Fetches genres from the API on mount and handles loading and error states.
 *
 * @returns Object containing genres array, loading state, and error handling functions
 */
export function useGenres() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const showError = useCallback((message: string) => setError(message), []);

  useEffect(() => {
    const fetchGenres = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/genres');
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
        setGenres([]);
        showError(GLOBAL_ERROR_MESSAGE);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGenres();
  }, [clearError, showError]);

  return {
    genres,
    isLoading,
    error,
    clearError,
  };
}
