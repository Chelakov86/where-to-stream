import {
  PREFERENCE_KEYS,
  PREFERENCES_EVENT,
  detectBrowserCountry,
  hasPreference,
  isCountryCode,
  isIdList,
  isSavedTitleList,
  readPreference,
  toggleInList,
  toggleSavedTitle,
  writePreference,
} from '@/app/utils/preferences';

describe('preferences storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns the fallback when nothing is stored', () => {
    expect(readPreference(PREFERENCE_KEYS.services, [], isIdList)).toEqual([]);
    expect(hasPreference(PREFERENCE_KEYS.services)).toBe(false);
  });

  it('writes JSON and reads it back', () => {
    writePreference(PREFERENCE_KEYS.services, [8, 337]);
    expect(localStorage.getItem('wts.services')).toBe('[8,337]');
    expect(readPreference(PREFERENCE_KEYS.services, [], isIdList)).toEqual([8, 337]);
    expect(hasPreference(PREFERENCE_KEYS.services)).toBe(true);
  });

  it('falls back on unparseable or invalid stored values', () => {
    localStorage.setItem('wts.services', '{not json');
    expect(readPreference(PREFERENCE_KEYS.services, [1], isIdList)).toEqual([1]);
    localStorage.setItem('wts.services', '["netflix"]');
    expect(readPreference(PREFERENCE_KEYS.services, [1], isIdList)).toEqual([1]);
    localStorage.setItem('wts.saved', '[{"id":1}]');
    expect(readPreference(PREFERENCE_KEYS.saved, [], isSavedTitleList)).toEqual([]);
  });

  it('notifies listeners with the changed key', () => {
    const listener = jest.fn();
    window.addEventListener(PREFERENCES_EVENT, listener);
    writePreference(PREFERENCE_KEYS.country, 'DE');
    window.removeEventListener(PREFERENCES_EVENT, listener);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('wts.country');
  });
});

describe('isCountryCode', () => {
  it('accepts known codes only', () => {
    expect(isCountryCode('DE')).toBe(true);
    expect(isCountryCode('de')).toBe(false);
    expect(isCountryCode('XX')).toBe(false);
    expect(isCountryCode(undefined)).toBe(false);
  });
});

describe('detectBrowserCountry', () => {
  const setLanguages = (language: string, languages: string[]) => {
    jest.spyOn(navigator, 'language', 'get').mockReturnValue(language);
    jest.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
  };

  afterEach(() => jest.restoreAllMocks());

  it('uses the region of the first language that has one', () => {
    setLanguages('en', ['en', 'de-AT', 'en-US']);
    expect(detectBrowserCountry()).toBe('AT');
  });

  it('returns null when no language carries a known region', () => {
    setLanguages('en', ['en', 'fr']);
    expect(detectBrowserCountry()).toBeNull();
  });
});

describe('list updates', () => {
  it('toggles items in a list', () => {
    expect(toggleInList([1, 2], 3)).toEqual([1, 2, 3]);
    expect(toggleInList([1, 2, 3], 2)).toEqual([1, 3]);
  });

  it('saves titles newest first and removes them by id and type', () => {
    const dune = { id: 1, type: 'movie' as const, title: 'Dune' };
    const duneSeries = { id: 1, type: 'tv' as const, title: 'Dune: Prophecy' };
    const saved = toggleSavedTitle(toggleSavedTitle([], dune, 100), duneSeries, 200);
    expect(saved.map((t) => t.title)).toEqual(['Dune: Prophecy', 'Dune']);
    expect(saved[1].addedAt).toBe(100);
    expect(toggleSavedTitle(saved, dune)).toEqual([{ ...duneSeries, addedAt: 200 }]);
  });
});
