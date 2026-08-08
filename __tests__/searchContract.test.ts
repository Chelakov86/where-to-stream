import { SearchParams, serializeSearchRequest, parseSearchRequest } from '@/app/searchContract';

describe('search contract', () => {
  describe('serializeSearchRequest', () => {
    it('includes mode and page with defaults', () => {
      const qs = serializeSearchRequest({ query: 'Fight Club' });

      expect(qs).toContain('mode=full');
      expect(qs).toContain('page=1');
      expect(qs).toContain('query=Fight+Club');
    });

    it('applies the requested mode and page', () => {
      const qs = serializeSearchRequest({ query: 'Fight' }, { mode: 'autocomplete', page: 3 });

      expect(qs).toContain('mode=autocomplete');
      expect(qs).toContain('page=3');
    });

    it('encodes arrays as comma-joined values and skips undefined', () => {
      const qs = serializeSearchRequest({
        query: 'Fight',
        genreIds: [28, 18],
        providerIds: [8],
        yearFrom: undefined,
        minRating: 7.5,
      });

      expect(qs).toContain('genreIds=28%2C18');
      expect(qs).toContain('providerIds=8');
      expect(qs).toContain('minRating=7.5');
      expect(qs).not.toContain('yearFrom');
    });
  });

  describe('parseSearchRequest', () => {
    it('parses a full request with all filters', () => {
      const params = new URLSearchParams(
        'query=Fight+Club&type=movie&yearFrom=1990&yearTo=2000&language=en&genreIds=28%2C18&providerIds=8&watchRegion=us&minRating=7.5&page=3&mode=autocomplete'
      );

      expect(parseSearchRequest(params)).toEqual({
        query: 'Fight Club',
        type: 'movie',
        yearFrom: 1990,
        yearTo: 2000,
        language: 'en',
        genreIds: [28, 18],
        providerIds: [8],
        watchRegion: 'US',
        minRating: 7.5,
        page: 3,
        mode: 'autocomplete',
      });
    });

    it('defaults missing values', () => {
      const parsed = parseSearchRequest(new URLSearchParams('query=test'));

      expect(parsed.query).toBe('test');
      expect(parsed.type).toBe('all');
      expect(parsed.mode).toBe('full');
      expect(parsed.page).toBe(1);
    });

    it('normalizes invalid values to defaults', () => {
      const parsed = parseSearchRequest(
        new URLSearchParams('query=test&type=bogus&mode=weird&page=abc&yearFrom=-5')
      );

      expect(parsed.type).toBe('all');
      expect(parsed.mode).toBe('full');
      expect(parsed.page).toBe(1);
      expect(parsed.yearFrom).toBeUndefined();
    });

    it('round-trips a serialized request back to an identical object', () => {
      const params: SearchParams = {
        query: 'Fight Club',
        type: 'movie',
        yearFrom: 1990,
        yearTo: 2000,
        language: 'en',
        genreIds: [28, 18],
        providerIds: [8],
        watchRegion: 'US',
        minRating: 7.5,
      };

      const qs = serializeSearchRequest(params, { page: 2, mode: 'full' });
      const parsed = parseSearchRequest(new URLSearchParams(qs));

      expect(parsed).toEqual({ ...params, page: 2, mode: 'full' });
    });

    it('round-trips an autocomplete request', () => {
      const qs = serializeSearchRequest({ query: 'Fight' }, { mode: 'autocomplete' });
      const parsed = parseSearchRequest(new URLSearchParams(qs));

      expect(parsed).toEqual({ query: 'Fight', type: 'all', page: 1, mode: 'autocomplete' });
    });
  });
});
