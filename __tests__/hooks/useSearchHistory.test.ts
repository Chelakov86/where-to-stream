import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearchHistory } from '../../app/hooks/useSearchHistory';
import { SearchHistoryItem } from '../../app/types';
import * as searchHistoryUtils from '../../app/utils/searchHistory';

// Mock the searchHistory utility functions
jest.mock('../../app/utils/searchHistory');

describe('useSearchHistory', () => {
  const mockGetSearchHistory = searchHistoryUtils.getSearchHistory as jest.MockedFunction<
    typeof searchHistoryUtils.getSearchHistory
  >;
  const mockSaveViewedTitleToHistory =
    searchHistoryUtils.saveViewedTitleToHistory as jest.MockedFunction<
      typeof searchHistoryUtils.saveViewedTitleToHistory
    >;
  const mockClearSearchHistory = searchHistoryUtils.clearSearchHistory as jest.MockedFunction<
    typeof searchHistoryUtils.clearSearchHistory
  >;
  const mockRemoveSearchFromHistory =
    searchHistoryUtils.removeSearchFromHistory as jest.MockedFunction<
      typeof searchHistoryUtils.removeSearchFromHistory
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage to avoid interference
    localStorage.clear();
    mockGetSearchHistory.mockReturnValue([]);
  });

  describe('initialization', () => {
    it('should load history from localStorage on mount', () => {
      const mockHistory: SearchHistoryItem[] = [
        {
          id: 123,
          type: 'movie',
          title: 'Test Movie',
          year: 2020,
          timestamp: Date.now(),
        },
      ];
      mockGetSearchHistory.mockReturnValue(mockHistory);

      const { result } = renderHook(() => useSearchHistory());

      expect(mockGetSearchHistory).toHaveBeenCalledTimes(1);
      expect(result.current.history).toEqual(mockHistory);
    });

    it('should initialize with empty array when no history exists', () => {
      mockGetSearchHistory.mockReturnValue([]);

      const { result } = renderHook(() => useSearchHistory());

      expect(result.current.history).toEqual([]);
    });
  });

  describe('addToHistory', () => {
    it('should save viewed title to history and update state', () => {
      const { result } = renderHook(() => useSearchHistory());
      const updatedHistory: SearchHistoryItem[] = [
        {
          id: 123,
          type: 'movie',
          title: 'New Movie',
          year: 2020,
          timestamp: Date.now(),
        },
      ];
      mockGetSearchHistory.mockReturnValue(updatedHistory);

      act(() => {
        result.current.addToHistory(123, 'movie', 'New Movie', 2020);
      });

      expect(mockSaveViewedTitleToHistory).toHaveBeenCalledTimes(1);
      expect(mockSaveViewedTitleToHistory).toHaveBeenCalledWith(123, 'movie', 'New Movie', 2020);
      expect(mockGetSearchHistory).toHaveBeenCalledTimes(2); // Once on mount, once after save
      expect(result.current.history).toEqual(updatedHistory);
    });

    it('should handle multiple additions correctly', () => {
      const { result } = renderHook(() => useSearchHistory());

      mockGetSearchHistory
        .mockReturnValueOnce([]) // Initial load
        .mockReturnValueOnce([
          {
            id: 1,
            type: 'movie' as const,
            title: 'First Movie',
            year: 2020,
            timestamp: Date.now(),
          },
        ])
        .mockReturnValueOnce([
          { id: 2, type: 'tv' as const, title: 'Second Show', year: 2021, timestamp: Date.now() },
          {
            id: 1,
            type: 'movie' as const,
            title: 'First Movie',
            year: 2020,
            timestamp: Date.now(),
          },
        ]);

      act(() => {
        result.current.addToHistory(1, 'movie', 'First Movie', 2020);
      });

      act(() => {
        result.current.addToHistory(2, 'tv', 'Second Show', 2021);
      });

      expect(mockSaveViewedTitleToHistory).toHaveBeenCalledTimes(2);
      expect(mockSaveViewedTitleToHistory).toHaveBeenNthCalledWith(
        1,
        1,
        'movie',
        'First Movie',
        2020
      );
      expect(mockSaveViewedTitleToHistory).toHaveBeenNthCalledWith(2, 2, 'tv', 'Second Show', 2021);
    });

    it('should handle titles without year', () => {
      const { result } = renderHook(() => useSearchHistory());
      const updatedHistory: SearchHistoryItem[] = [
        {
          id: 123,
          type: 'movie',
          title: 'Movie Without Year',
          timestamp: Date.now(),
        },
      ];
      mockGetSearchHistory.mockReturnValue(updatedHistory);

      act(() => {
        result.current.addToHistory(123, 'movie', 'Movie Without Year');
      });

      expect(mockSaveViewedTitleToHistory).toHaveBeenCalledTimes(1);
      expect(mockSaveViewedTitleToHistory).toHaveBeenCalledWith(
        123,
        'movie',
        'Movie Without Year',
        undefined
      );
    });
  });

  describe('clearHistory', () => {
    it('should clear all history and update state', () => {
      const initialHistory: SearchHistoryItem[] = [
        { id: 123, type: 'movie', title: 'Test Movie', year: 2020, timestamp: Date.now() },
      ];

      // Reset mocks to ensure clean state
      mockGetSearchHistory.mockReset();
      mockGetSearchHistory
        .mockReturnValueOnce(initialHistory) // Initial load
        .mockReturnValueOnce([]); // After clear

      const { result } = renderHook(() => useSearchHistory());

      expect(result.current.history).toEqual(initialHistory);

      act(() => {
        result.current.clearHistory();
      });

      expect(mockClearSearchHistory).toHaveBeenCalledTimes(1);
      expect(result.current.history).toEqual([]);
    });

    it('should handle clearing empty history', () => {
      mockGetSearchHistory.mockReturnValue([]);
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.clearHistory();
      });

      expect(mockClearSearchHistory).toHaveBeenCalledTimes(1);
      expect(result.current.history).toEqual([]);
    });
  });

  describe('removeFromHistory', () => {
    it('should remove item at specified index and update state', () => {
      const initialHistory: SearchHistoryItem[] = [
        { id: 1, type: 'movie', title: 'First Movie', year: 2020, timestamp: Date.now() },
        { id: 2, type: 'tv', title: 'Second Show', year: 2021, timestamp: Date.now() },
        { id: 3, type: 'movie', title: 'Third Movie', year: 2022, timestamp: Date.now() },
      ];
      mockGetSearchHistory.mockReturnValue(initialHistory);

      const { result } = renderHook(() => useSearchHistory());

      const updatedHistory: SearchHistoryItem[] = [
        { id: 1, type: 'movie', title: 'First Movie', year: 2020, timestamp: Date.now() },
        { id: 3, type: 'movie', title: 'Third Movie', year: 2022, timestamp: Date.now() },
      ];
      mockGetSearchHistory.mockReturnValue(updatedHistory);

      act(() => {
        result.current.removeFromHistory(1);
      });

      expect(mockRemoveSearchFromHistory).toHaveBeenCalledTimes(1);
      expect(mockRemoveSearchFromHistory).toHaveBeenCalledWith(1);
      expect(result.current.history).toEqual(updatedHistory);
    });

    it('should handle removing first item', () => {
      const initialHistory: SearchHistoryItem[] = [
        { id: 1, type: 'movie', title: 'First Movie', year: 2020, timestamp: Date.now() },
        { id: 2, type: 'tv', title: 'Second Show', year: 2021, timestamp: Date.now() },
      ];
      mockGetSearchHistory.mockReturnValue(initialHistory);

      const { result } = renderHook(() => useSearchHistory());

      const updatedHistory: SearchHistoryItem[] = [
        { id: 2, type: 'tv', title: 'Second Show', year: 2021, timestamp: Date.now() },
      ];
      mockGetSearchHistory.mockReturnValue(updatedHistory);

      act(() => {
        result.current.removeFromHistory(0);
      });

      expect(mockRemoveSearchFromHistory).toHaveBeenCalledWith(0);
      expect(result.current.history).toEqual(updatedHistory);
    });

    it('should handle removing last item', () => {
      const initialHistory: SearchHistoryItem[] = [
        { id: 1, type: 'movie', title: 'First Movie', year: 2020, timestamp: Date.now() },
        { id: 2, type: 'tv', title: 'Second Show', year: 2021, timestamp: Date.now() },
      ];
      mockGetSearchHistory.mockReturnValue(initialHistory);

      const { result } = renderHook(() => useSearchHistory());

      const updatedHistory: SearchHistoryItem[] = [
        { id: 1, type: 'movie', title: 'First Movie', year: 2020, timestamp: Date.now() },
      ];
      mockGetSearchHistory.mockReturnValue(updatedHistory);

      act(() => {
        result.current.removeFromHistory(1);
      });

      expect(mockRemoveSearchFromHistory).toHaveBeenCalledWith(1);
      expect(result.current.history).toEqual(updatedHistory);
    });
  });

  describe('state updates', () => {
    it('should maintain referential stability of functions', () => {
      const { result, rerender } = renderHook(() => useSearchHistory());

      const initialAddToHistory = result.current.addToHistory;
      const initialClearHistory = result.current.clearHistory;
      const initialRemoveFromHistory = result.current.removeFromHistory;

      rerender();

      expect(result.current.addToHistory).toBe(initialAddToHistory);
      expect(result.current.clearHistory).toBe(initialClearHistory);
      expect(result.current.removeFromHistory).toBe(initialRemoveFromHistory);
    });

    it('should update history state when localStorage changes externally', () => {
      const { result } = renderHook(() => useSearchHistory());

      // Simulate external change to localStorage
      const newHistory: SearchHistoryItem[] = [
        { id: 999, type: 'movie', title: 'External Movie', year: 2020, timestamp: Date.now() },
      ];
      mockGetSearchHistory.mockReturnValue(newHistory);

      // Trigger a state update by calling a function
      act(() => {
        result.current.addToHistory(123, 'movie', 'Trigger Movie', 2020);
      });

      // History should reflect the latest state from localStorage
      expect(result.current.history).toEqual(newHistory);
    });
  });
});
