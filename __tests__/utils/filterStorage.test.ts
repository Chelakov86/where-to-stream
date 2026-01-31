import {
  loadFilterState,
  saveFilterState,
  clearFilterState,
  FilterState,
} from '@/app/utils/filterStorage';

describe('filterStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('saveFilterState', () => {
    it('saves filter state to localStorage', () => {
      const state: FilterState = {
        selectedType: 'movie',
        yearFrom: '2020',
        yearTo: '2024',
        selectedLanguage: 'en',
        selectedGenres: [28, 12],
        selectedProviders: [8, 9],
        watchRegion: 'US',
      };

      saveFilterState(state);

      const saved = localStorage.getItem('whereToStream:filterState');
      expect(saved).toBeTruthy();
      expect(JSON.parse(saved!)).toEqual(state);
    });

    it('overwrites existing filter state', () => {
      const state1: FilterState = {
        selectedType: 'movie',
        yearFrom: '2020',
        yearTo: '2024',
        selectedLanguage: 'en',
        selectedGenres: [28],
        selectedProviders: [8],
        watchRegion: 'US',
      };

      const state2: FilterState = {
        selectedType: 'tv',
        yearFrom: '2015',
        yearTo: '2020',
        selectedLanguage: 'de',
        selectedGenres: [16],
        selectedProviders: [9],
        watchRegion: 'DE',
      };

      saveFilterState(state1);
      saveFilterState(state2);

      const saved = localStorage.getItem('whereToStream:filterState');
      expect(JSON.parse(saved!)).toEqual(state2);
    });
  });

  describe('loadFilterState', () => {
    it('loads filter state from localStorage', () => {
      const state: FilterState = {
        selectedType: 'movie',
        yearFrom: '2020',
        yearTo: '2024',
        selectedLanguage: 'en',
        selectedGenres: [28, 12],
        selectedProviders: [8, 9],
        watchRegion: 'US',
      };

      localStorage.setItem('whereToStream:filterState', JSON.stringify(state));

      const loaded = loadFilterState();
      expect(loaded).toEqual(state);
    });

    it('returns null when no saved state exists', () => {
      const loaded = loadFilterState();
      expect(loaded).toBeNull();
    });

    it('returns null when saved state is invalid JSON', () => {
      localStorage.setItem('whereToStream:filterState', 'invalid json');

      const loaded = loadFilterState();
      expect(loaded).toBeNull();
    });

    it('returns null when saved state has invalid structure', () => {
      const invalidState = {
        selectedType: 123, // Should be string
        yearFrom: '2020',
      };

      localStorage.setItem('whereToStream:filterState', JSON.stringify(invalidState));

      const loaded = loadFilterState();
      expect(loaded).toBeNull();
    });

    it('returns null when selectedGenres is not an array', () => {
      const invalidState = {
        selectedType: 'movie',
        yearFrom: '2020',
        yearTo: '2024',
        selectedLanguage: 'en',
        selectedGenres: 'not-an-array',
        selectedProviders: [8],
        watchRegion: 'US',
      };

      localStorage.setItem('whereToStream:filterState', JSON.stringify(invalidState));

      const loaded = loadFilterState();
      expect(loaded).toBeNull();
    });
  });

  describe('clearFilterState', () => {
    it('removes filter state from localStorage', () => {
      const state: FilterState = {
        selectedType: 'movie',
        yearFrom: '2020',
        yearTo: '2024',
        selectedLanguage: 'en',
        selectedGenres: [28],
        selectedProviders: [8],
        watchRegion: 'US',
      };

      localStorage.setItem('whereToStream:filterState', JSON.stringify(state));
      expect(localStorage.getItem('whereToStream:filterState')).toBeTruthy();

      clearFilterState();
      expect(localStorage.getItem('whereToStream:filterState')).toBeNull();
    });

    it('does nothing when no saved state exists', () => {
      expect(() => clearFilterState()).not.toThrow();
    });
  });
});
