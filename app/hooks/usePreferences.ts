'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DEFAULT_COUNTRY, PREFERRED_COUNTRIES } from '@/app/config';
import { MediaType, SavedTitle } from '@/app/types';
import {
  PREFERENCE_KEYS,
  PREFERENCES_EVENT,
  PreferenceKey,
  detectBrowserCountry,
  hasPreference,
  isCountryCode,
  isCountryList,
  isIdList,
  isSavedTitleList,
  readPreference,
  toggleInList,
  toggleSavedTitle,
  writePreference,
} from '@/app/utils/preferences';

/**
 * Hydration-safe persisted state: renders `fallback` on the server and first paint,
 * then the stored value. `ready` turns true once storage has been read.
 */
function usePersistedPreference<T>(
  key: PreferenceKey,
  fallback: T,
  isValid: (value: unknown) => value is T
) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setValue(readPreference(key, fallback, isValid));
    sync();
    setReady(true);
    const onChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) {
        sync();
      }
    };
    window.addEventListener(PREFERENCES_EVENT, onChange);
    return () => window.removeEventListener(PREFERENCES_EVENT, onChange);
    // fallback and isValid are stable module-level values for every caller
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      writePreference(key, next);
    },
    [key]
  );

  return { value, setValue: update, ready } as const;
}

const PINNED_DEFAULT: string[] = [...PREFERRED_COUNTRIES];
const EMPTY_IDS: number[] = [];
const EMPTY_SAVED: SavedTitle[] = [];

/**
 * The user's stored country. On first visit, it is detected from the browser language.
 */
export function useStoredCountry() {
  const { value, setValue, ready } = usePersistedPreference<string>(
    PREFERENCE_KEYS.country,
    DEFAULT_COUNTRY,
    isCountryCode
  );

  useEffect(() => {
    if (ready && !hasPreference(PREFERENCE_KEYS.country)) {
      const detected = detectBrowserCountry();
      if (detected) {
        setValue(detected);
      }
    }
  }, [ready, setValue]);

  return { country: value, setCountry: setValue, ready } as const;
}

/**
 * The country in effect for the current page: a valid `?country=` URL parameter
 * wins (so shared links keep their country), otherwise the stored country.
 */
export function useActiveCountry() {
  const searchParams = useSearchParams();
  const { country: stored, setCountry, ready } = useStoredCountry();
  const override = searchParams?.get('country')?.toUpperCase();
  const hasOverride = isCountryCode(override);

  return {
    country: hasOverride ? override : stored,
    setCountry,
    ready: ready || hasOverride,
  } as const;
}

/**
 * Countries the user pinned; shown first in the picker and comparison view.
 */
export function usePinnedCountries() {
  const { value, setValue, ready } = usePersistedPreference(
    PREFERENCE_KEYS.pinnedCountries,
    PINNED_DEFAULT,
    isCountryList
  );
  const togglePinned = useCallback(
    (code: string) => setValue(toggleInList(value, code)),
    [value, setValue]
  );
  return { pinned: value, togglePinned, ready } as const;
}

/**
 * Provider IDs of the streaming services the user subscribes to.
 */
export function useMyServices() {
  const { value, setValue, ready } = usePersistedPreference(
    PREFERENCE_KEYS.services,
    EMPTY_IDS,
    isIdList
  );
  const toggleService = useCallback(
    (id: number) => setValue(toggleInList(value, id)),
    [value, setValue]
  );
  const clearServices = useCallback(() => setValue([]), [setValue]);
  return { services: value, toggleService, clearServices, ready } as const;
}

/**
 * The user's watchlist of saved titles, newest first.
 */
export function useSavedTitles() {
  const { value, setValue, ready } = usePersistedPreference(
    PREFERENCE_KEYS.saved,
    EMPTY_SAVED,
    isSavedTitleList
  );
  const isSaved = useCallback(
    (type: MediaType, id: number) => value.some((t) => t.id === id && t.type === type),
    [value]
  );
  const toggleSaved = useCallback(
    (title: Omit<SavedTitle, 'addedAt'>) => setValue(toggleSavedTitle(value, title)),
    [value, setValue]
  );
  return { saved: value, isSaved, toggleSaved, ready } as const;
}
