/**
 * Display formatting helpers shared by the title pages.
 */

const languageNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'language' })
    : null;

/**
 * Returns the English name of an ISO 639-1 language code.
 *
 * @example
 * ```typescript
 * languageName('de') // 'German'
 * ```
 */
export function languageName(code: string | undefined): string | undefined {
  if (!code) return undefined;
  try {
    return languageNames?.of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/**
 * Formats a runtime in minutes as "2h 19m" / "45m".
 * @returns The label, or undefined for missing or non-positive runtimes
 */
export function runtimeLabel(minutes: number | null | undefined): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

/**
 * Returns "1 country" / "3 countries" style labels.
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
