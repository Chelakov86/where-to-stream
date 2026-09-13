import { providersOnMyServices, rankCountries, verdictFor } from '@/app/utils/availability';
import { AvailabilityByCountry, CountryAvailability } from '@/app/types';

const netflix = { id: 8, name: 'Netflix' };
const disney = { id: 337, name: 'Disney Plus' };
const tubi = { id: 73, name: 'Tubi' };
const appleTv = { id: 2, name: 'Apple TV' };
const googlePlay = { id: 3, name: 'Google Play' };

const entry = (
  countryCode: string,
  offers: Partial<Pick<CountryAvailability, 'flatrate' | 'free' | 'rent' | 'buy'>>,
  countryName = countryCode
): CountryAvailability => ({
  countryCode,
  countryName,
  flatrate: [],
  free: [],
  rent: [],
  buy: [],
  ...offers,
});

describe('verdictFor', () => {
  it('reports no data when the title has no availability anywhere', () => {
    const verdict = verdictFor({}, 'DE', []);
    expect(verdict.status).toBe('nodata');
    expect(verdict.entry).toBeNull();
  });

  it('reports unavailable with the number of other countries', () => {
    const availability = { US: entry('US', { flatrate: [netflix] }) };
    const verdict = verdictFor(availability, 'DE', []);
    expect(verdict.status).toBe('unavailable');
    expect(verdict.detail).toContain('1 other country');
  });

  it('prefers the user services over free and subscription offers', () => {
    const availability = { DE: entry('DE', { flatrate: [netflix, disney], free: [tubi] }) };
    const verdict = verdictFor(availability, 'de', [337]);
    expect(verdict.status).toBe('mine');
    expect(verdict.matched).toEqual([disney]);
    expect(verdict.detail).toBe('Watch now on Disney Plus.');
  });

  it('counts free providers the user selected as their services', () => {
    const availability = { DE: entry('DE', { free: [tubi] }) };
    expect(verdictFor(availability, 'DE', [73]).status).toBe('mine');
  });

  it('reports free when free offers exist but none are the user services', () => {
    const availability = { DE: entry('DE', { flatrate: [netflix], free: [tubi] }) };
    const verdict = verdictFor(availability, 'DE', [999]);
    expect(verdict.status).toBe('free');
    expect(verdict.matched).toEqual([tubi]);
  });

  it('reports subscription streaming', () => {
    const availability = { DE: entry('DE', { flatrate: [netflix] }) };
    expect(verdictFor(availability, 'DE', []).status).toBe('stream');
  });

  it('reports rent or buy only, naming rental first', () => {
    const availability = { DE: entry('DE', { rent: [appleTv], buy: [googlePlay] }) };
    const verdict = verdictFor(availability, 'DE', []);
    expect(verdict.status).toBe('paid');
    expect(verdict.detail).toBe('Available to rent from Apple TV, Google Play.');
  });

  it('names buy when there is nothing to rent', () => {
    const availability = { DE: entry('DE', { buy: [googlePlay] }) };
    expect(verdictFor(availability, 'DE', []).detail).toBe('Available to buy from Google Play.');
  });

  it('reports unavailable when the country entry has no offers in any tier', () => {
    const availability = { DE: entry('DE', {}) };
    const verdict = verdictFor(availability, 'DE', []);
    expect(verdict.status).toBe('unavailable');
    expect(verdict.detail).not.toContain('undefined');
  });
});

describe('providersOnMyServices', () => {
  it('matches subscription and free providers but not rentals', () => {
    const country = entry('US', { flatrate: [netflix], free: [tubi], rent: [appleTv] });
    expect(providersOnMyServices(country, [8, 73, 2])).toEqual([netflix, tubi]);
  });
});

describe('rankCountries', () => {
  const availability: AvailabilityByCountry = {
    AT: entry('AT', { flatrate: [netflix] }, 'Austria'),
    BR: entry('BR', { flatrate: [netflix] }, 'Brazil'),
    CA: entry('CA', { flatrate: [netflix] }, 'Canada'),
    DE: entry('DE', { flatrate: [netflix] }, 'Germany'),
    GB: entry('GB', { flatrate: [netflix] }, 'United Kingdom'),
  };

  it('puts the current country first, then pinned in pin order, then the rest by name', () => {
    expect(rankCountries(availability, ['GB', 'CA'], 'de')).toEqual(['DE', 'GB', 'CA', 'AT', 'BR']);
  });

  it('ignores pinned countries that have no availability', () => {
    expect(rankCountries(availability, ['FR'], 'US')).toEqual(['AT', 'BR', 'CA', 'DE', 'GB']);
  });
});
