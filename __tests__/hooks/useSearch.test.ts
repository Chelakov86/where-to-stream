import { renderHook, waitFor, act } from '@testing-library/react';
import { useSearch } from '@/app/hooks/useSearch';

global.fetch = jest.fn();

const GENERIC_ERROR_MESSAGE =
  "We're having trouble fetching data right now. Please try again later.";

const mockSearchResponse = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  json: async () => ({
    page: 1,
    totalPages: 3,
    totalResults: 30,
    results: [
      {
        id: 550,
        type: 'movie',
        title: 'Fight Club',
        year: 1999,
        popularity: 50.5,
      },
    ],
    ...overrides,
  }),
});

describe('useSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches results and exposes pagination state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockSearchResponse());

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.handleSearch({ query: 'Fight Club' });
    });

    expect(result.current.isSearching).toBe(true);

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].title).toBe('Fight Club');
    expect(result.current.totalPages).toBe(3);
    expect(result.current.page).toBe(1);
  });

  it('serializes array filters as comma-joined query params', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockSearchResponse());

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.handleSearch({ query: 'Fight', genreIds: [28, 18], minRating: 7 });
    });

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain('genreIds=28%2C18');
    expect(calledUrl).toContain('minRating=7');
    expect(calledUrl).toContain('mode=full');
  });

  it('calls onError and clears results on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    const onError = jest.fn();

    const { result } = renderHook(() => useSearch(onError));

    await act(async () => {
      await result.current.handleSearch({ query: 'Fight Club' });
    });

    expect(onError).toHaveBeenCalledWith(GENERIC_ERROR_MESSAGE);
    expect(result.current.results).toEqual([]);
    expect(result.current.totalPages).toBe(1);
  });

  it('does not report errors for aborted requests', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    );
    const onError = jest.fn();

    const { result } = renderHook(() => useSearch(onError));

    await act(async () => {
      await result.current.handleSearch({ query: 'Fight Club' });
    });

    expect(onError).not.toHaveBeenCalled();
  });

  it('aborts the previous request when a new search starts', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.handleSearch({ query: 'Fight Club' });
    });
    act(() => {
      result.current.handleSearch({ query: 'Inception' });
    });

    expect(abortSpy).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('re-searches with the current query when the page changes', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockSearchResponse());
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockSearchResponse({ page: 2, totalPages: 3 })
    );

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.handleSearch({ query: 'Fight Club' });
    });

    await act(async () => {
      await result.current.handlePageChange(2);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const pageParam = (global.fetch as jest.Mock).mock.calls[1][0] as string;
    expect(pageParam).toContain('page=2');
    expect(result.current.page).toBe(2);
  });

  it('clearResults resets state, cancels in-flight requests, and clears the error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockSearchResponse());
    const onError = jest.fn();

    const { result } = renderHook(() => useSearch(onError));

    await act(async () => {
      await result.current.handleSearch({ query: 'Fight Club' });
    });

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.searchQuery).toBeNull();
    expect(result.current.page).toBe(1);
    expect(onError).toHaveBeenCalledWith(null);
  });
});
