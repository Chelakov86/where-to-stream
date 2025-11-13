import {
  getSearchHistory,
  saveViewedTitleToHistory,
  clearSearchHistory,
  removeSearchFromHistory,
} from '../../app/utils/searchHistory';
import { SearchHistoryItem } from '../../app/types';

describe('searchHistory', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('getSearchHistory', () => {
    it('should return empty array when localStorage is empty', () => {
      const history = getSearchHistory();
      expect(history).toEqual([]);
    });

    it('should return empty array when localStorage has invalid data', () => {
      localStorage.setItem('where-to-stream-search-history', 'invalid json');
      const history = getSearchHistory();
      expect(history).toEqual([]);
    });

    it('should return empty array when localStorage has non-array data', () => {
      localStorage.setItem('where-to-stream-search-history', '{"not": "an array"}');
      const history = getSearchHistory();
      expect(history).toEqual([]);
    });

    it('should return empty array when localStorage has array with invalid items', () => {
      localStorage.setItem(
        'where-to-stream-search-history',
        JSON.stringify([{ invalid: 'item' }, { id: 1, type: 'movie', title: 'Test' }])
      );
      const history = getSearchHistory();
      // Should filter out invalid items
      expect(history).toEqual([]);
    });

    it('should retrieve valid history from localStorage', () => {
      const historyItem: SearchHistoryItem = {
        id: 123,
        type: 'movie',
        title: 'Test Movie',
        year: 2020,
        timestamp: Date.now(),
      };
      localStorage.setItem('where-to-stream-search-history', JSON.stringify([historyItem]));
      const history = getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(123);
      expect(history[0].title).toBe('Test Movie');
    });
  });

  describe('saveViewedTitleToHistory', () => {
    it('should save a viewed title to history', () => {
      saveViewedTitleToHistory(123, 'movie', 'Test Movie', 2020);
      const history = getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(123);
      expect(history[0].type).toBe('movie');
      expect(history[0].title).toBe('Test Movie');
      expect(history[0].year).toBe(2020);
      expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it('should add new titles to the top of history', () => {
      saveViewedTitleToHistory(1, 'movie', 'First Movie', 2020);
      saveViewedTitleToHistory(2, 'tv', 'Second Show', 2021);
      const history = getSearchHistory();
      expect(history).toHaveLength(2);
      expect(history[0].title).toBe('Second Show');
      expect(history[1].title).toBe('First Movie');
    });

    it('should move duplicate title to top instead of creating duplicate', () => {
      saveViewedTitleToHistory(123, 'movie', 'Duplicate Movie', 2020);
      // Wait a bit to ensure different timestamp
      const beforeSecondSave = Date.now();
      saveViewedTitleToHistory(123, 'movie', 'Duplicate Movie', 2020);
      const history = getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(123);
      expect(history[0].title).toBe('Duplicate Movie');
      expect(history[0].timestamp).toBeGreaterThanOrEqual(beforeSecondSave);
    });

    it('should limit history to MAX_HISTORY_ITEMS (25)', () => {
      // Save 30 titles
      for (let i = 0; i < 30; i++) {
        saveViewedTitleToHistory(i, 'movie', `Movie ${i}`, 2000 + i);
      }
      const history = getSearchHistory();
      expect(history).toHaveLength(25);
      // Most recent should be at the top
      expect(history[0].title).toBe('Movie 29');
      // Oldest should be removed
      expect(history[history.length - 1].title).toBe('Movie 5');
    });

    it('should handle titles with optional year', () => {
      saveViewedTitleToHistory(1, 'movie', 'Movie Without Year');
      saveViewedTitleToHistory(2, 'tv', 'Show With Year', 2020);
      const history = getSearchHistory();
      expect(history).toHaveLength(2);
      expect(history[0].year).toBe(2020);
      expect(history[1].year).toBeUndefined();
    });

    it('should treat same id but different type as different titles', () => {
      saveViewedTitleToHistory(123, 'movie', 'Same ID Movie', 2020);
      saveViewedTitleToHistory(123, 'tv', 'Same ID Show', 2020);
      const history = getSearchHistory();
      // Should be treated as different titles (different type)
      expect(history).toHaveLength(2);
    });
  });

  describe('clearSearchHistory', () => {
    it('should remove all history from localStorage', () => {
      saveViewedTitleToHistory(1, 'movie', 'Test 1', 2020);
      saveViewedTitleToHistory(2, 'tv', 'Test 2', 2021);
      expect(getSearchHistory()).toHaveLength(2);
      clearSearchHistory();
      expect(getSearchHistory()).toHaveLength(0);
    });

    it('should handle clearing empty history gracefully', () => {
      expect(() => clearSearchHistory()).not.toThrow();
      expect(getSearchHistory()).toHaveLength(0);
    });
  });

  describe('removeSearchFromHistory', () => {
    it('should remove item at specified index', () => {
      saveViewedTitleToHistory(1, 'movie', 'First', 2020);
      saveViewedTitleToHistory(2, 'tv', 'Second', 2021);
      saveViewedTitleToHistory(3, 'movie', 'Third', 2022);
      const historyBefore = getSearchHistory();
      expect(historyBefore).toHaveLength(3);
      removeSearchFromHistory(1);
      const historyAfter = getSearchHistory();
      expect(historyAfter).toHaveLength(2);
      expect(historyAfter[0].title).toBe('Third');
      expect(historyAfter[1].title).toBe('First');
    });

    it('should handle removing first item', () => {
      saveViewedTitleToHistory(1, 'movie', 'First', 2020);
      saveViewedTitleToHistory(2, 'tv', 'Second', 2021);
      removeSearchFromHistory(0);
      const history = getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe('First');
    });

    it('should handle removing last item', () => {
      saveViewedTitleToHistory(1, 'movie', 'First', 2020);
      saveViewedTitleToHistory(2, 'tv', 'Second', 2021);
      removeSearchFromHistory(1);
      const history = getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe('Second');
    });

    it('should not throw when removing invalid index', () => {
      saveViewedTitleToHistory(1, 'movie', 'Test', 2020);
      expect(() => removeSearchFromHistory(-1)).not.toThrow();
      expect(() => removeSearchFromHistory(10)).not.toThrow();
      expect(getSearchHistory()).toHaveLength(1);
    });

    it('should handle removing from empty history', () => {
      expect(() => removeSearchFromHistory(0)).not.toThrow();
    });
  });

  describe('localStorage unavailability', () => {
    let originalLocalStorage: Storage;

    beforeEach(() => {
      originalLocalStorage = global.localStorage;
      // Clear localStorage before test
      localStorage.clear();
    });

    afterEach(() => {
      global.localStorage = originalLocalStorage;
      localStorage.clear();
    });

    it('should handle localStorage errors gracefully without throwing', () => {
      // Clear localStorage first
      localStorage.clear();

      // Mock localStorage.setItem to throw errors after the availability check
      const originalSetItem = localStorage.setItem;
      let callCount = 0;

      // @ts-ignore
      localStorage.setItem = jest.fn((key, value) => {
        callCount++;
        // First call is for availability check - allow it
        if (callCount === 1 && key === '__localStorage_test__') {
          return originalSetItem.call(localStorage, key, value);
        }
        // Subsequent calls should fail to simulate quota/error
        if (key === 'where-to-stream-search-history') {
          throw new DOMException('Storage error');
        }
        return originalSetItem.call(localStorage, key, value);
      });

      // Functions should handle errors gracefully
      expect(() => {
        saveViewedTitleToHistory(1, 'movie', 'Test', 2020);
      }).not.toThrow();

      expect(() => {
        getSearchHistory();
      }).not.toThrow();

      // Restore
      localStorage.setItem = originalSetItem;
    });
  });

  describe('localStorage quota exceeded', () => {
    it('should handle quota exceeded error gracefully', () => {
      // Mock localStorage to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      let callCount = 0;
      localStorage.setItem = jest.fn((key, value) => {
        callCount++;
        if (callCount === 1) {
          // First call succeeds (saving history)
          originalSetItem.call(localStorage, key, value);
        } else {
          // Subsequent calls throw quota exceeded
          const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
          throw error;
        }
      });

      // Fill up history
      for (let i = 0; i < 25; i++) {
        saveViewedTitleToHistory(i, 'movie', `Movie ${i}`, 2000 + i);
      }

      // Try to save one more - should handle gracefully
      expect(() => {
        saveViewedTitleToHistory(999, 'movie', 'Overflow', 2020);
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });
});
