import { httpFailure, parseRetryAfter } from '@/app/utils/clientErrors';

describe('client HTTP failure facts', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  afterEach(() => jest.restoreAllMocks());
  it.each([
    ['10', now + 10000],
    ['Mon, 16 Nov 2026 12:01:00 GMT', now + 60000],
    ['Mon, 16 Nov 2026 11:00:00 GMT', undefined],
    ['-1', undefined],
    ['0', undefined],
    ['garbage', undefined],
    ['1.5', undefined],
    ['', undefined],
    [null, undefined],
    ['Infinity', undefined],
  ])('parses Retry-After %s safely', (header, expected) => {
    expect(parseRetryAfter(header, now)).toBe(expected);
  });
  it('bounds extreme second values to a valid deadline', () => {
    expect(parseRetryAfter('9'.repeat(400), now)).toBe(8.64e15);
  });
  it.each([
    [404, 'not-found'],
    [429, 'rate-limit'],
    [408, 'timeout'],
    [504, 'timeout'],
    [500, 'server'],
    [502, 'server'],
    [503, 'server'],
    [400, 'invalid'],
    [403, 'unknown'],
  ])('preserves HTTP %s as %s', (status, kind) => {
    expect(httpFailure(status as number, null)).toMatchObject({ status, kind });
  });
  it('uses a conservative wait for rate limits without usable Retry-After', () => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
    expect(httpFailure(429, 'bad').retryAt).toBe(now + 30000);
  });
});
