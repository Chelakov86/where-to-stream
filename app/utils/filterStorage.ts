/**
 * Utility functions for persisting filter state to localStorage.
 * Handles saving and loading user filter preferences across sessions.
 */

const FILTER_STORAGE_KEY = 'whereToStream:filterState';

export interface FilterState {
  selectedType: 'movie' | 'tv' | 'all';
  yearFrom: string;
  yearTo: string;
  selectedLanguage: string;
  selectedGenres: number[];
  selectedProviders: number[];
  watchRegion: string;
}

/**
 * Loads filter state from localStorage.
 * Returns null if no saved state exists or if parsing fails.
 */
export function loadFilterState(): FilterState | null {
  if (typeof window === 'undefined') {
    return null; // Server-side rendering
  }

  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved) as FilterState;

    // Validate the structure
    if (
      typeof parsed.selectedType !== 'string' ||
      typeof parsed.yearFrom !== 'string' ||
      typeof parsed.yearTo !== 'string' ||
      typeof parsed.selectedLanguage !== 'string' ||
      !Array.isArray(parsed.selectedGenres) ||
      !Array.isArray(parsed.selectedProviders) ||
      typeof parsed.watchRegion !== 'string'
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('Failed to load filter state from localStorage:', error);
    return null;
  }
}

/**
 * Saves filter state to localStorage.
 * Silently fails if localStorage is unavailable.
 */
export function saveFilterState(state: FilterState): void {
  if (typeof window === 'undefined') {
    return; // Server-side rendering
  }

  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save filter state to localStorage:', error);
  }
}

/**
 * Clears saved filter state from localStorage.
 */
export function clearFilterState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(FILTER_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear filter state from localStorage:', error);
  }
}
