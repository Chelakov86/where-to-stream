// Year extraction must not depend on the runtime timezone: new Date('2021-01-01')
// parses as UTC midnight, which is the previous year west of UTC. Run with
// TZ=America/Los_Angeles to see the difference.

import { getYear, buildTmdbImageUrl } from '@/app/utils/tmdb';

describe('getYear', () => {
  it('extracts the year from an ISO date string', () => {
    expect(getYear('2020-01-15')).toBe(2020);
    expect(getYear('1999-12-31')).toBe(1999);
  });

  it('returns the correct year for January 1st dates regardless of timezone', () => {
    // new Date('2021-01-01') parses as UTC midnight; west of UTC that is 2020
    expect(getYear('2021-01-01')).toBe(2021);
    expect(getYear('2000-01-01')).toBe(2000);
  });

  it('handles year-only strings', () => {
    expect(getYear('2021')).toBe(2021);
  });

  it('returns undefined for invalid or missing dates', () => {
    expect(getYear(undefined)).toBeUndefined();
    expect(getYear('')).toBeUndefined();
    expect(getYear('abc')).toBeUndefined();
    expect(getYear('12')).toBeUndefined();
  });
});

describe('buildTmdbImageUrl', () => {
  it('builds a full image URL with the requested size', () => {
    expect(buildTmdbImageUrl('/abc123.jpg', 'w500')).toBe(
      'https://image.tmdb.org/t/p/w500/abc123.jpg'
    );
  });

  it('defaults to w500', () => {
    expect(buildTmdbImageUrl('/abc123.jpg')).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
  });

  it('returns undefined when the poster path is missing', () => {
    expect(buildTmdbImageUrl(null)).toBeUndefined();
    expect(buildTmdbImageUrl(undefined)).toBeUndefined();
    expect(buildTmdbImageUrl('')).toBeUndefined();
  });
});
