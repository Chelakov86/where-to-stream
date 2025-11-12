import { useState, useCallback } from 'react';
import { SearchParams, TMDBResult } from '@/app/types';

const GLOBAL_ERROR_MESSAGE =
  "We're having trouble fetching data right now. Please try again later.";

/**
 * Custom hook for managing search state and operations.
 * Handles search execution, pagination, and result management.
 *
 * @param onError - Optional callback to handle errors
 * @returns Object containing search state and handler functions
 */
export function useSearch(onError?: (message: string | null) => void) {
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState<SearchParams | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const clearError = useCallback(() => {
    if (onError) {
      onError(null);
    }
  }, [onError]);

  const showError = useCallback(
    (message: string) => {
      if (onError) {
        onError(message);
      }
    },
    [onError]
  );

  const handleSearch = useCallback(
    async (params: SearchParams, newPage = 1) => {
      setSearchQuery(params);
      setPage(newPage);
      setIsSearching(true);

      const queryParams = new URLSearchParams({
        mode: 'full',
        ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
        page: String(newPage),
      });

      try {
        const response = await fetch(`/api/search?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch search results');
        }
        const data = await response.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        setTotalPages(typeof data.total_pages === 'number' ? data.total_pages : 1);
        clearError();
      } catch (err) {
        setResults([]);
        setTotalPages(1);
        showError(GLOBAL_ERROR_MESSAGE);
      } finally {
        setIsSearching(false);
      }
    },
    [clearError, showError]
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (searchQuery) {
        handleSearch(searchQuery, nextPage);
      }
    },
    [searchQuery, handleSearch]
  );

  return {
    results,
    page,
    totalPages,
    searchQuery,
    isSearching,
    handleSearch,
    handlePageChange,
  };
}
