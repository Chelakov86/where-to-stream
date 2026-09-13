import { renderHook, waitFor, act } from '@testing-library/react';
import { useApiResource, clearApiResourceCache } from '@/app/hooks/useApiResource';

global.fetch = jest.fn();

describe('useApiResource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearApiResourceCache();
  });

  it('fetches nothing when the URL is null', () => {
    const { result } = renderHook(() => useApiResource(null));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches and returns data for a URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: 42 }),
    });

    const { result } = renderHook(() => useApiResource<{ value: number }>('/api/thing'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.data).toEqual({ value: 42 });
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets an error message when the response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useApiResource('/api/thing'));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('reuses a cached response for the same URL without refetching', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ value: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ value: 2 }) });

    const { result, rerender } = renderHook(({ url }) => useApiResource<{ value: number }>(url), {
      initialProps: { url: '/api/thing' },
    });

    await waitFor(() => expect(result.current.data).toEqual({ value: 1 }));

    rerender({ url: '/api/other' });
    await waitFor(() => expect(result.current.data).toEqual({ value: 2 }));
    expect(global.fetch).toHaveBeenCalledTimes(2);

    rerender({ url: '/api/thing' });

    await waitFor(() => expect(result.current.data).toEqual({ value: 1 }));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('refetches when reload is called, bypassing the cache', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ value: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ value: 2 }) });

    const { result } = renderHook(() => useApiResource<{ value: number }>('/api/thing'));

    await waitFor(() => expect(result.current.data).toEqual({ value: 1 }));

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.data).toEqual({ value: 2 }));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
