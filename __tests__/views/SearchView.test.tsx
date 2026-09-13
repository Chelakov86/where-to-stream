import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SearchView from '@/app/views/SearchView';
import { clearApiResourceCache } from '@/app/hooks/useApiResource';
import { mockGenres } from '../../test/mocks';

const replace = jest.fn();
const push = jest.fn();
let mockSearch = '';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const results = [
  { id: 1, type: 'movie', title: 'Dune: Part Two', year: 2024, rating: 8.2 },
  { id: 2, type: 'tv', title: 'Reacher', year: 2022, rating: 8.1 },
];

type Reply = { ok: boolean; status?: number; body?: unknown };

const mockFetch = (searchReply: Reply) => {
  const fetchMock = jest.fn(async (url: string) => {
    if (url.startsWith('/api/genres')) {
      return { ok: true, json: async () => ({ movie: mockGenres, tv: [] }) };
    }
    return {
      ok: searchReply.ok,
      status: searchReply.status ?? 200,
      json: async () => searchReply.body,
    };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

const searchUrl = (fetchMock: jest.Mock) => {
  const call = fetchMock.mock.calls.find(([url]) => String(url).startsWith('/api/search'));
  return new URLSearchParams(String(call?.[0]).split('?')[1]);
};

describe('SearchView', () => {
  beforeEach(() => {
    clearApiResourceCache();
    localStorage.clear();
    localStorage.setItem('wts.country', '"DE"');
    mockSearch = '';
    replace.mockClear();
    push.mockClear();
  });

  it('browses what is popular in the user country', async () => {
    const fetchMock = mockFetch({
      ok: true,
      body: { page: 1, totalPages: 1, totalResults: 2, results },
    });
    render(<SearchView />);

    expect(
      await screen.findByRole('heading', { name: 'Where can I stream it in Germany?' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Popular in Germany' })).toBeInTheDocument();
    const grid = await screen.findByRole('list');
    expect(within(grid).getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Reacher/ })).toHaveAttribute(
      'href',
      '/title/tv/2?country=DE'
    );

    const params = searchUrl(fetchMock);
    expect(params.get('query')).toBe('');
    expect(params.get('watchRegion')).toBe('DE');
    expect(params.get('sort')).toBe('popularity');
  });

  it('searches with the query and filters from the URL', async () => {
    mockSearch = 'q=dune&type=movie&genre=28&page=2';
    const fetchMock = mockFetch({
      ok: true,
      body: { page: 2, totalPages: 3, totalResults: 50, results },
    });
    render(<SearchView />);

    expect(await screen.findByRole('heading', { name: 'Results for “dune”' })).toBeInTheDocument();
    await screen.findByText('Page 2 of 3');

    const params = searchUrl(fetchMock);
    expect(params.get('query')).toBe('dune');
    expect(params.get('type')).toBe('movie');
    expect(params.get('genreIds')).toBe('28');
    expect(params.get('page')).toBe('2');
    expect(params.get('sort')).toBe('relevance');

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(push).toHaveBeenCalledWith('/?q=dune&type=movie&genre=28&page=3');
  });

  it('writes filter changes to the URL and resets the page', async () => {
    mockSearch = 'page=4';
    mockFetch({ ok: true, body: { page: 4, totalPages: 9, totalResults: 180, results } });
    render(<SearchView />);
    await screen.findByRole('link', { name: /Reacher/ });

    await userEvent.click(screen.getByRole('button', { name: 'Movies' }));
    expect(replace).toHaveBeenCalledWith('/?type=movie', { scroll: false });
  });

  it('keeps a country override in the URL', async () => {
    mockSearch = 'country=GB';
    mockFetch({ ok: true, body: { page: 1, totalPages: 1, totalResults: 2, results } });
    render(<SearchView />);

    expect(
      await screen.findByRole('heading', { name: 'Popular in United Kingdom' })
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Series' }));
    expect(replace).toHaveBeenCalledWith('/?type=tv&country=GB', { scroll: false });
  });

  it('offers a filter reset when nothing matches', async () => {
    mockSearch = 'type=tv&rating=8';
    mockFetch({ ok: true, body: { page: 1, totalPages: 1, totalResults: 0, results: [] } });
    render(<SearchView />);

    expect(await screen.findByText('Nothing matched those filters')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(replace).toHaveBeenCalledWith('/', { scroll: false });
  });

  it('shows an error with a retry', async () => {
    const fetchMock = mockFetch({ ok: false, status: 503, body: { error: 'down' } });
    render(<SearchView />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't reach the catalogue.");

    const searchCalls = () =>
      fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/api/search')).length;
    const before = searchCalls();
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(searchCalls()).toBe(before + 1));
  });
});
