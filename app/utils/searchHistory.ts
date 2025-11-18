import { SearchHistoryItem } from '@/app/types';

const STORAGE_KEY = 'where-to-stream-search-history';
const MAX_HISTORY_ITEMS = 25;

/**
 * Checks if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compares two viewed titles for equality (by id and type)
 */
function areTitlesEqual(a: SearchHistoryItem, b: SearchHistoryItem): boolean {
  return a.id === b.id && a.type === b.type;
}

/**
 * Retrieves search history from localStorage
 * @returns Array of search history items, or empty array if unavailable
 */
export function getSearchHistory(): SearchHistoryItem[] {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate and filter out invalid items
    return parsed.filter(
      (item): item is SearchHistoryItem =>
        item &&
        typeof item === 'object' &&
        typeof item.timestamp === 'number' &&
        typeof item.id === 'number' &&
        (item.type === 'movie' || item.type === 'tv') &&
        typeof item.title === 'string'
    );
  } catch (error) {
    console.warn('Failed to read search history from localStorage:', error);
    return [];
  }
}

/**
 * Saves a viewed title to history
 * If the same title already exists, it will be moved to the top
 * @param id - The title ID
 * @param type - The title type ('movie' or 'tv')
 * @param title - The title name
 * @param year - Optional year
 */
export function saveViewedTitleToHistory(
  id: number,
  type: 'movie' | 'tv',
  title: string,
  year?: number
): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const history = getSearchHistory();
    const newItem: SearchHistoryItem = {
      id,
      type,
      title,
      year,
      timestamp: Date.now(),
    };

    // Remove duplicate if it exists (same id and type)
    const filteredHistory = history.filter((item) => !areTitlesEqual(item, newItem));

    // Add new item to the top
    const updatedHistory = [newItem, ...filteredHistory];

    // Limit to MAX_HISTORY_ITEMS
    const limitedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    // Handle quota exceeded or other storage errors
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded. Clearing oldest history items.');
      try {
        const history = getSearchHistory();
        // Keep only the most recent half of items
        const reducedHistory = history.slice(0, Math.floor(MAX_HISTORY_ITEMS / 2));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedHistory));
        // Try saving again
        saveViewedTitleToHistory(id, type, title, year);
      } catch (retryError) {
        console.warn('Failed to save search history after quota reduction:', retryError);
      }
    } else {
      console.warn('Failed to save search history:', error);
    }
  }
}

/**
 * Clears all search history
 */
export function clearSearchHistory(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear search history:', error);
  }
}

/**
 * Removes a specific item from search history by index
 * @param index - The index of the item to remove
 */
export function removeSearchFromHistory(index: number): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const history = getSearchHistory();
    if (index < 0 || index >= history.length) {
      return;
    }

    const updatedHistory = history.filter((_, i) => i !== index);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.warn('Failed to remove search history item:', error);
  }
}
