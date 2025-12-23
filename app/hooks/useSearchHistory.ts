import { useState, useEffect, useCallback } from 'react';
import { SearchHistoryItem } from '@/app/types';
import {
  getSearchHistory,
  saveViewedTitleToHistory,
  clearSearchHistory,
  removeSearchFromHistory,
} from '@/app/utils/searchHistory';

/**
 * Custom hook for managing viewed titles history state
 * Provides history state and functions to manipulate it
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  /**
   * Add a viewed title to history
   */
  const addToHistory = useCallback(
    (id: number, type: 'movie' | 'tv', title: string, year?: number) => {
      saveViewedTitleToHistory(id, type, title, year);
      setHistory(getSearchHistory());
    },
    []
  );

  /**
   * Clear all search history
   */
  const clearHistory = useCallback(() => {
    clearSearchHistory();
    setHistory([]);
  }, []);

  /**
   * Remove a specific item from history
   */
  const removeFromHistory = useCallback((index: number) => {
    removeSearchFromHistory(index);
    setHistory(getSearchHistory());
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
}
