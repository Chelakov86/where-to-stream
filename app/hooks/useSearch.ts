import { useState, useCallback, useRef, useEffect } from 'react';
import { SearchParams, TMDBResult } from '@/app/types';

const GLOBAL_ERROR_MESSAGE =
  "We're having trouble fetching data right now. Please try again later.";

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
  const [isSearching, setIsSearching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      // Cancel previous search if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setSearchQuery(params);
      setPage(newPage);
      setIsSearching(true);

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

      try {
        const response = await fetch(`/api/search?${queryParams.toString()}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch search results');
        }

        const data = await response.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        setTotalPages(
          typeof data.totalPages === 'number'
            ? data.totalPages
            : typeof data.total_pages === 'number'
              ? data.total_pages
              : 1
        );
        clearError();
      } catch (err) {
        // Don't show error for aborted requests
        if ((err as Error).name !== 'AbortError') {
          setResults([]);
          setTotalPages(1);
          showError(GLOBAL_ERROR_MESSAGE);
        }
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

  const clearResults = useCallback(() => {
    setResults([]);
    setSearchQuery(null);
    setPage(1);
    setTotalPages(1);
    clearError();
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [clearError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
