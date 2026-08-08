import { useState, useEffect } from 'react';
import { Genre } from '@/app/types';
import { useFetchLifecycle } from '@/app/hooks/useFetchLifecycle';

/**
 * Custom hook for fetching and managing genres state with request cancellation.
 * Fetches genres from the API on mount and handles loading and error states.
 * Cancels the request if component unmounts before completion.
 *
 * @returns Object containing genres array, loading state, and error handling functions
 */
export function useGenres() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const { run, isLoading, error, clearError } = useFetchLifecycle();

  useEffect(() => {
    run(async (signal) => {
      const response = await fetch('/api/genres', { signal });

      if (!response.ok) {
        throw new Error('Failed to fetch genres');
      }

      const data = await response.json();
      if (signal.aborted) {
        return;
      }
      // API returns { movie: Genre[], tv: Genre[] }, combine and deduplicate by id
      const allGenres = [...(data.movie || []), ...(data.tv || [])];
      const uniqueGenres = Array.from(
        new Map(allGenres.map((genre) => [genre.id, genre])).values()
      );
      setGenres(Array.isArray(uniqueGenres) ? uniqueGenres : []);
    }).then((status) => {
      if (status === 'error') {
        setGenres([]);
      }
    });
  }, [run]);

  return {
    genres,
    isLoading,
    error,
    clearError,
  };
}
