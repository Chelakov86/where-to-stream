/**
 * On-device preferences module.
 *
 * Reads and writes the user's preferences (country, pinned countries, streaming
 * services, saved titles) in localStorage. Every write broadcasts a
 * `wts:preferences` event so all mounted hooks reading the same key stay in sync.
 */

import { MediaType, SavedTitle } from '@/app/types';
import { COUNTRY_NAMES } from '@/app/utils/countries';

export const PREFERENCE_KEYS = Object.freeze({
  country: 'wts.country',
  pinnedCountries: 'wts.pinnedCountries',
  services: 'wts.services',
  saved: 'wts.saved',
} as const);

export type PreferenceKey = (typeof PREFERENCE_KEYS)[keyof typeof PREFERENCE_KEYS];

export const PREFERENCES_EVENT = 'wts:preferences';

/**
 * Whether a value is a known ISO 3166-1 alpha-2 country code.
 */
export function isCountryCode(value: unknown): value is string {
  return typeof value === 'string' && value in COUNTRY_NAMES;
}

/**
 * Reads a preference, returning the fallback when it is missing, unreadable, or invalid.
 *
 * @param key - Preference key
 * @param fallback - Value used when nothing valid is stored
 * @param isValid - Type guard the parsed value must pass
 */
export function readPreference<T>(
  key: PreferenceKey,
  fallback: T,
  isValid: (value: unknown) => value is T
): T {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Whether a preference has been stored at all.
 */
export function hasPreference(key: PreferenceKey): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Writes a preference and notifies every listener of the change.
 */
export function writePreference(key: PreferenceKey, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota): keep the in-memory value only
  }
  window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT, { detail: key }));
}

/**
 * Guesses the user's country from the browser's language settings (e.g. "de-DE" → "DE").
 * @returns A known country code, or null when none of the languages carry a region
 */
export function detectBrowserCountry(): string | null {
  if (typeof navigator === 'undefined') {
    return null;
  }
  const languages = [navigator.language, ...(navigator.languages ?? [])];
  for (const language of languages) {
    const region = language?.split('-')[1]?.toUpperCase();
    if (isCountryCode(region)) {
      return region;
    }
  }
  return null;
}

// --- Validators ---

export const isCountryList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isCountryCode);

export const isIdList = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'number' && Number.isInteger(v));

const isSavedTitle = (value: unknown): value is SavedTitle => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'number' &&
    (item.type === 'movie' || item.type === 'tv') &&
    typeof item.title === 'string' &&
    typeof item.addedAt === 'number'
  );
};

export const isSavedTitleList = (value: unknown): value is SavedTitle[] =>
  Array.isArray(value) && value.every(isSavedTitle);

// --- Pure list updates ---

/**
 * Adds the item when absent, removes it when present.
 */
export function toggleInList<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

/**
 * Saves a title (newest first) or removes it when it is already saved.
 */
export function toggleSavedTitle(
  saved: SavedTitle[],
  title: Omit<SavedTitle, 'addedAt'>,
  now: number = Date.now()
): SavedTitle[] {
  const matches = (entry: { id: number; type: MediaType }) =>
    entry.id === title.id && entry.type === title.type;
  return saved.some(matches)
    ? saved.filter((entry) => !matches(entry))
    : [{ ...title, addedAt: now }, ...saved];
}
