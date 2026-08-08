import { useState, useCallback } from 'react';
import { SearchParams, TMDBResult } from '@/app/types';
import { useFetchLifecycle } from '@/app/hooks/useFetchLifecycle';

/**
 * Custom hook for managing search state and operations with request cancellation.
 * Handles search execution, pagination, and result management.
 * Cancels in-flight requests when new searches start to prevent race conditions.
 *
 * @param onError - Optional callback to handle errors
 * @returns Object containing search state and handler functions
 */
export function useSearch(onError?: (message: string | null) => void) {
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState<SearchParams | null>(null);
  const { run, cancel, clearError, isLoading: isSearching } = useFetchLifecycle(onError);

  const handleSearch = useCallback(
    async (params: SearchParams, newPage = 1) => {
      setSearchQuery(params);
      setPage(newPage);

      const queryParams = new URLSearchParams({
        mode: 'full',
        page: String(newPage),
      });

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Handle arrays (genreIds, providerIds)
          if (Array.isArray(value)) {
            if (value.length > 0) {
              queryParams.append(key, value.join(','));
            }
          } else {
            queryParams.append(key, String(value));
          }
        }
      });

      const status = await run(async (signal) => {
        const response = await fetch(`/api/search?${queryParams.toString()}`, { signal });

        if (!response.ok) {
          throw new Error('Failed to fetch search results');
        }

        const data = await response.json();
        if (signal.aborted) {
          return;
        }
        setResults(Array.isArray(data.results) ? data.results : []);
        setTotalPages(
          typeof data.totalPages === 'number'
            ? data.totalPages
            : typeof data.total_pages === 'number'
              ? data.total_pages
              : 1
        );
      });

      if (status === 'error') {
        setResults([]);
        setTotalPages(1);
      }
    },
    [run]
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (searchQuery) {
        handleSearch(searchQuery, nextPage);
      }
    },
    [searchQuery, handleSearch]
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setSearchQuery(null);
    setPage(1);
    setTotalPages(1);
    cancel();
    clearError();
  }, [cancel, clearError]);

  return {
    results,
    page,
    totalPages,
    searchQuery,
    isSearching,
    handleSearch,
    handlePageChange,
    clearResults,
  };
}
