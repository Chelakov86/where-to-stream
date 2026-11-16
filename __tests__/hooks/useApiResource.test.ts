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

describe('request recovery and cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearApiResourceCache();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each(['5', 'Mon, 16 Nov 2026 12:00:05 GMT', 'bad', null])(
    'gates retry for Retry-After %s, including remounts and old callbacks',
    async (header) => {
      jest.useFakeTimers({ now: new Date('2026-11-16T12:00:00Z') });
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers(header ? { 'Retry-After': header } : {}),
        })
        .mockResolvedValue({ ok: true, json: async () => ({ recovered: true }) });
      const first = renderHook(() => useApiResource('/api/limited'));
      const retainedReload = first.result.current.reload;
      await act(async () => undefined);
      expect(first.result.current.failure?.kind).toBe('rate-limit');
      act(() => retainedReload());
      expect(fetch).toHaveBeenCalledTimes(1);
      first.unmount();
      const next = renderHook(() => useApiResource('/api/limited'));
      await act(async () => undefined);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(next.result.current.failure?.kind).toBe('rate-limit');
      await act(async () => {
        await jest.advanceTimersByTimeAsync(header && header !== 'bad' ? 5000 : 30000);
      });
      expect(fetch).toHaveBeenCalledTimes(1); // No automatic retry loop.
      act(() => next.result.current.reload());
      await act(async () => undefined);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(next.result.current.data).toEqual({ recovered: true });
      expect(next.result.current.failure).toBeNull();
    }
  );

  it('does not let an old URL resolve into the cache after switching to a cached URL', async () => {
    let resolveOld!: (value: unknown) => void;
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'cached' }) })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          })
      )
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'fresh' }) });
    const { result, rerender } = renderHook(({ url }) => useApiResource(url), {
      initialProps: { url: '/cached' },
    });
    await waitFor(() => expect(result.current.data).toEqual({ name: 'cached' }));
    rerender({ url: '/old' });
    rerender({ url: '/cached' });
    await act(async () => {
      resolveOld({ ok: true, json: async () => ({ name: 'stale' }) });
    });
    expect(result.current.data).toEqual({ name: 'cached' });
    rerender({ url: '/old' });
    await waitFor(() => expect(result.current.data).toEqual({ name: 'fresh' }));
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('cancels when URL becomes null and clears the old error on a new URL', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockImplementationOnce(() => new Promise(() => undefined));
    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useApiResource(url),
      { initialProps: { url: '/missing' as string | null } }
    );
    await waitFor(() => expect(result.current.failure?.kind).toBe('not-found'));
    rerender({ url: '/pending' });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);
    const signal = (fetch as jest.Mock).mock.calls[1][1].signal;
    rerender({ url: null });
    await act(async () => undefined);
    expect(signal.aborted).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
