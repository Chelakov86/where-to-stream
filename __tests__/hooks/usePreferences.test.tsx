import { act, renderHook, waitFor } from '@testing-library/react';
import {
  useActiveCountry,
  useMyServices,
  useSavedTitles,
  useStoredCountry,
} from '@/app/hooks/usePreferences';

let mockSearch = '';
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

describe('usePreferences hooks', () => {
  beforeEach(() => {
    localStorage.clear();
    mockSearch = '';
    jest.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE');
    jest.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-DE']);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('useStoredCountry', () => {
    it('detects and stores the browser country on first visit', async () => {
      const { result } = renderHook(() => useStoredCountry());
      await waitFor(() => expect(result.current.country).toBe('DE'));
      expect(result.current.ready).toBe(true);
      expect(localStorage.getItem('wts.country')).toBe('"DE"');
    });

    it('keeps a stored country', async () => {
      localStorage.setItem('wts.country', '"CA"');
      const { result } = renderHook(() => useStoredCountry());
      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.country).toBe('CA');
    });
  });

  describe('useActiveCountry', () => {
    it('lets a valid URL country override the stored one', async () => {
      localStorage.setItem('wts.country', '"CA"');
      mockSearch = 'country=gb';
      const { result } = renderHook(() => useActiveCountry());
      expect(result.current).toMatchObject({ country: 'GB', ready: true });
    });

    it('ignores an unknown URL country', async () => {
      localStorage.setItem('wts.country', '"CA"');
      mockSearch = 'country=zz';
      const { result } = renderHook(() => useActiveCountry());
      await waitFor(() => expect(result.current.country).toBe('CA'));
    });
  });

  describe('useMyServices', () => {
    it('toggles and clears services, keeping every hook instance in sync', async () => {
      const first = renderHook(() => useMyServices());
      const second = renderHook(() => useMyServices());
      await waitFor(() => expect(first.result.current.ready).toBe(true));

      act(() => first.result.current.toggleService(8));
      await waitFor(() => expect(second.result.current.services).toEqual([8]));

      act(() => second.result.current.clearServices());
      await waitFor(() => expect(first.result.current.services).toEqual([]));
    });
  });

  describe('useSavedTitles', () => {
    it('saves and unsaves titles', async () => {
      const { result } = renderHook(() => useSavedTitles());
      await waitFor(() => expect(result.current.ready).toBe(true));

      act(() => result.current.toggleSaved({ id: 550, type: 'movie', title: 'Fight Club' }));
      expect(result.current.isSaved('movie', 550)).toBe(true);
      expect(result.current.isSaved('tv', 550)).toBe(false);
      expect(JSON.parse(localStorage.getItem('wts.saved')!)).toHaveLength(1);

      act(() => result.current.toggleSaved({ id: 550, type: 'movie', title: 'Fight Club' }));
      expect(result.current.saved).toEqual([]);
    });
  });
});
