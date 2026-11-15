import { act, render, renderHook, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import {
  useActiveCountry,
  useMyServices,
  usePinnedCountries,
  useSavedTitles,
  useStoredCountry,
} from '@/app/hooks/usePreferences';
import PreferenceWarning from '@/app/components/PreferenceWarning';
import {
  PREFERENCE_KEYS,
  hasPreference,
  hasUnsavedPreferences,
  isIdList,
  readPreference,
  writePreference,
} from '@/app/utils/preferences';

let mockSearch = '';
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

function useAllPreferences() {
  return {
    country: useStoredCountry(),
    pinned: usePinnedCountries(),
    services: useMyServices(),
    saved: useSavedTitles(),
    active: useActiveCountry(),
  };
}

// Restore persistence and discard every failed-write override between cases.
function clearSession() {
  jest.restoreAllMocks();
  writePreference(PREFERENCE_KEYS.country, 'DE');
  writePreference(PREFERENCE_KEYS.pinnedCountries, []);
  writePreference(PREFERENCE_KEYS.services, []);
  writePreference(PREFERENCE_KEYS.saved, []);
  localStorage.clear();
}

beforeEach(() => {
  clearSession();
  mockSearch = '';
  jest.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE');
  jest.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-DE']);
});
afterEach(clearSession);

function failWrites() {
  return jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  });
}

it.each([false, true])('retains all session preferences with pre-existing storage: %s', (seed) => {
  if (seed) {
    localStorage.setItem('wts.country', '"CA"');
    localStorage.setItem('wts.pinnedCountries', '["CA"]');
    localStorage.setItem('wts.services', '[337]');
    localStorage.setItem('wts.saved', '[]');
  }
  failWrites();
  const first = renderHook(useAllPreferences);
  const second = renderHook(useAllPreferences);
  const previousPinned = first.result.current.pinned.pinned;
  act(() => {
    first.result.current.country.setCountry('GB');
    first.result.current.pinned.togglePinned('FR');
    first.result.current.services.toggleService(8);
    first.result.current.saved.toggleSaved({ id: 550, type: 'movie', title: 'Fight Club' });
  });
  const expected = {
    country: 'GB',
    pinned: [...previousPinned, 'FR'],
    services: seed ? [337, 8] : [8],
    saved: [{ id: 550, type: 'movie', title: 'Fight Club', addedAt: expect.any(Number) }],
  };
  const check = (reader: ReturnType<typeof useAllPreferences>) => {
    expect(reader.country.country).toBe(expected.country);
    expect(reader.active.country).toBe(expected.country);
    expect(reader.pinned.pinned).toEqual(expected.pinned);
    expect(reader.services.services).toEqual(expected.services);
    expect(reader.saved.saved).toEqual(expected.saved);
  };
  check(first.result.current);
  check(second.result.current);
  expect(hasPreference(PREFERENCE_KEYS.country)).toBe(true);
  expect(localStorage.getItem('wts.country')).toBe(seed ? '"CA"' : null);

  first.unmount();
  const later = renderHook(useAllPreferences);
  check(later.result.current);
  act(() => {
    later.result.current.services.clearServices();
    later.result.current.pinned.togglePinned('FR');
    later.result.current.saved.toggleSaved({ id: 550, type: 'movie', title: 'Fight Club' });
    later.result.current.country.setCountry('US');
  });
  expect(second.result.current.services.services).toEqual([]);
  expect(second.result.current.pinned.pinned).toEqual(previousPinned);
  expect(second.result.current.saved.saved).toEqual([]);
  expect(second.result.current.country.country).toBe('US');
  const newest = renderHook(useAllPreferences);
  expect(newest.result.current.country.country).toBe('US');
  expect(newest.result.current.services.services).toEqual([]);
});

it('combines consecutive updates from different readers before React rerenders', () => {
  failWrites();
  const first = renderHook(useMyServices);
  const second = renderHook(useMyServices);
  act(() => {
    first.result.current.toggleService(8);
    second.result.current.toggleService(337);
  });
  expect(first.result.current.services).toEqual([8, 337]);
  expect(second.result.current.services).toEqual([8, 337]);
});

it('keeps URL country overrides ahead of failed stored-country changes', () => {
  failWrites();
  mockSearch = 'country=gb';
  const reader = renderHook(useActiveCountry);
  act(() => reader.result.current.setCountry('CA'));
  expect(reader.result.current.country).toBe('GB');
  mockSearch = '';
  reader.rerender();
  expect(reader.result.current.country).toBe('CA');
});

it('recovers each key independently and removes the warning only after all changes persist', () => {
  const writer = failWrites();
  render(<PreferenceWarning />);
  const reader = renderHook(useMyServices);
  act(() => {
    reader.result.current.toggleService(8);
    writePreference(PREFERENCE_KEYS.pinnedCountries, ['FR']);
  });
  expect(screen.getByRole('status')).toHaveTextContent('only for this session');
  expect(screen.getByRole('status')).toHaveTextContent('may be lost');
  expect(renderToString(<PreferenceWarning />)).not.toContain('only for this session');
  // An unrelated successful key does not clear another key's pending changes.
  writer.mockRestore();
  act(() => reader.result.current.toggleService(337));
  expect(localStorage.getItem('wts.services')).toBe('[8,337]');
  expect(screen.getByRole('status')).toHaveTextContent('only for this session');
  act(() => writePreference(PREFERENCE_KEYS.pinnedCountries, ['FR']));
  expect(screen.getByRole('status', { hidden: true })).toBeEmptyDOMElement();
  expect(hasUnsavedPreferences()).toBe(false);
  reader.unmount();
  expect(renderHook(useMyServices).result.current.services).toEqual([8, 337]);
});

it('shows the warning on a later mount and retains values when reads also fail', () => {
  failWrites();
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Access denied', 'SecurityError');
  });
  act(() => writePreference(PREFERENCE_KEYS.services, [8]));
  expect(readPreference(PREFERENCE_KEYS.services, [], isIdList)).toEqual([8]);
  expect(hasPreference(PREFERENCE_KEYS.services)).toBe(true);
  expect(renderHook(useMyServices).result.current.services).toEqual([8]);
  render(<PreferenceWarning />);
  expect(screen.getByRole('status')).toHaveTextContent('only for this session');
});

it('rejects invalid session values without replacing a valid preference', () => {
  failWrites();
  writePreference(PREFERENCE_KEYS.services, [8]);
  writePreference(PREFERENCE_KEYS.services, ['netflix']);
  expect(readPreference(PREFERENCE_KEYS.services, [], isIdList)).toEqual([8]);
  writePreference(PREFERENCE_KEYS.country, 'zz');
  expect(hasPreference(PREFERENCE_KEYS.country)).toBe(false);
});
