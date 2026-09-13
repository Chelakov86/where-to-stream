/**
 * Availability verdict module.
 *
 * Pure, client-safe functions that answer "can I watch this here?" for a title's
 * availability data, the user's country, and the services they subscribe to.
 */

import { AvailabilityByCountry, CountryAvailability, ProviderRef } from '@/app/types';

export type VerdictStatus = 'mine' | 'free' | 'stream' | 'paid' | 'unavailable' | 'nodata';

export interface Verdict {
  status: VerdictStatus;
  label: string;
  detail: string;
  matched: ProviderRef[];
  entry: CountryAvailability | null;
}

const names = (providers: ProviderRef[]) => providers.map((p) => p.name).join(', ');

/**
 * Returns the providers in an entry that stream the title on one of the user's services.
 */
export function providersOnMyServices(
  entry: CountryAvailability,
  serviceIds: number[]
): ProviderRef[] {
  return [...entry.flatrate, ...entry.free].filter((p) => serviceIds.includes(p.id));
}

/**
 * Decides the headline availability verdict for a title in one country.
 * Priority: on my services → free → subscription → rent/buy → elsewhere only → no data.
 *
 * @param availability - Availability keyed by country code
 * @param country - The user's country code
 * @param serviceIds - Provider IDs the user subscribes to
 */
export function verdictFor(
  availability: AvailabilityByCountry,
  country: string,
  serviceIds: number[]
): Verdict {
  const total = Object.keys(availability).length;
  const entry = availability[country.toUpperCase()] ?? null;

  if (!entry) {
    if (total === 0) {
      return {
        status: 'nodata',
        label: 'No streaming data',
        detail: 'We have no provider information for this title yet.',
        matched: [],
        entry: null,
      };
    }
    return {
      status: 'unavailable',
      label: 'Not available here',
      detail: `Nothing to stream, rent or buy in this country — available in ${total} other ${
        total === 1 ? 'country' : 'countries'
      }.`,
      matched: [],
      entry: null,
    };
  }

  const mine = providersOnMyServices(entry, serviceIds);
  if (mine.length > 0) {
    return {
      status: 'mine',
      label: 'Included in your services',
      detail: `Watch now on ${names(mine)}.`,
      matched: mine,
      entry,
    };
  }
  if (entry.free.length > 0) {
    return {
      status: 'free',
      label: 'Free to watch',
      detail: `Free (with ads) on ${names(entry.free)}.`,
      matched: entry.free,
      entry,
    };
  }
  if (entry.flatrate.length > 0) {
    return {
      status: 'stream',
      label: 'On subscription',
      detail: `Included with ${names(entry.flatrate)}.`,
      matched: entry.flatrate,
      entry,
    };
  }
  return {
    status: 'paid',
    label: 'Rent or buy only',
    detail: `Available to ${entry.rent.length > 0 ? 'rent' : 'buy'} from ${names(
      [...entry.rent, ...entry.buy].slice(0, 3)
    )}.`,
    matched: [],
    entry,
  };
}

/**
 * Orders country codes for the comparison view: the current country first, then
 * pinned countries in pin order, then everything else alphabetically by name.
 */
export function rankCountries(
  availability: AvailabilityByCountry,
  pinned: string[],
  current: string
): string[] {
  const home = current.toUpperCase();
  const score = (code: string) => {
    if (code === home) return -1;
    const pinIndex = pinned.indexOf(code);
    return pinIndex === -1 ? Number.MAX_SAFE_INTEGER : pinIndex;
  };
  return Object.keys(availability).sort(
    (a, b) =>
      score(a) - score(b) || availability[a].countryName.localeCompare(availability[b].countryName)
  );
}
