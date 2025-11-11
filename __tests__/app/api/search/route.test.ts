import { GET } from '@/app/api/search/route';
import { NextResponse } from 'next/server';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => {
      return new Response(JSON.stringify(data), {
        status: options?.status || 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  },
}));

const createRequest = (searchParams: Record<string, string>) => {
  const url = new URL('http://localhost/api/search');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return {
    nextUrl: {
      searchParams: url.searchParams,
    },
  } as any;
};

describe('GET /api/search', () => {
  it('should return 400 if query is missing', async () => {
    const req = createRequest({});
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Query parameter is required' });
  });

  it('should return 400 if query is empty', async () => {
    const req = createRequest({ query: '' });
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Query parameter is required' });
  });

  it('should return 400 if query is only whitespace', async () => {
    const req = createRequest({ query: '  ' });
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Query parameter is required' });
  });

  it('should return 200 with minimal valid query', async () => {
    const req = createRequest({ query: 'test' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      params: {
        query: 'test',
        type: 'all',
        page: 1,
        mode: 'full',
      },
    });
  });

  it('should use default values for type, page, and mode', async () => {
    const req = createRequest({ query: 'test' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.params.type).toBe('all');
    expect(data.params.page).toBe(1);
    expect(data.params.mode).toBe('full');
  });

  it('should parse genreIds into an array of numbers', async () => {
    const req = createRequest({ query: 'test', genreIds: '1,2,3' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.params.genreIds).toEqual([1, 2, 3]);
  });

  it('should handle invalid type by defaulting to "all"', async () => {
    const req = createRequest({ query: 'test', type: 'invalid' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.params.type).toBe('all');
  });

  it('should handle invalid mode by defaulting to "full"', async () => {
    const req = createRequest({ query: 'test', mode: 'invalid' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.params.mode).toBe('full');
  });

  it('should parse all parameters correctly', async () => {
    const req = createRequest({
      query: 'test',
      type: 'movie',
      yearFrom: '2020',
      yearTo: '2022',
      language: 'en-US',
      genreIds: '1,2',
      minRating: '7.5',
      page: '2',
      mode: 'autocomplete',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      params: {
        query: 'test',
        type: 'movie',
        yearFrom: 2020,
        yearTo: 2022,
        language: 'en-US',
        genreIds: [1, 2],
        minRating: 7.5,
        page: 2,
        mode: 'autocomplete',
      },
    });
  });

  it('should handle empty genreIds', async () => {
    const req = createRequest({ query: 'test', genreIds: '' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.params.genreIds).toBeUndefined();
  });
});
