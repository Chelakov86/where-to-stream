import { languageName, pluralize, runtimeLabel } from '@/app/utils/format';
import { parseTitleRouteParams } from '@/app/utils/titleRoute';

describe('languageName', () => {
  it('returns English language names', () => {
    expect(languageName('de')).toBe('German');
    expect(languageName(undefined)).toBeUndefined();
  });
});

describe('runtimeLabel', () => {
  it('formats hours and minutes', () => {
    expect(runtimeLabel(139)).toBe('2h 19m');
    expect(runtimeLabel(45)).toBe('45m');
    expect(runtimeLabel(0)).toBeUndefined();
    expect(runtimeLabel(null)).toBeUndefined();
  });
});

describe('pluralize', () => {
  it('picks singular or plural', () => {
    expect(pluralize(1, 'country', 'countries')).toBe('1 country');
    expect(pluralize(3, 'country', 'countries')).toBe('3 countries');
    expect(pluralize(2, 'season')).toBe('2 seasons');
  });
});

describe('parseTitleRouteParams', () => {
  it('accepts movie and tv with positive integer ids', () => {
    expect(parseTitleRouteParams({ type: 'movie', id: '550' })).toEqual({ type: 'movie', id: 550 });
    expect(parseTitleRouteParams({ type: 'tv', id: '1399' })).toEqual({ type: 'tv', id: 1399 });
  });

  it('rejects other types and malformed ids', () => {
    expect(parseTitleRouteParams({ type: 'person', id: '1' })).toBeNull();
    expect(parseTitleRouteParams({ type: 'movie', id: '0' })).toBeNull();
    expect(parseTitleRouteParams({ type: 'movie', id: '12abc' })).toBeNull();
  });
});
