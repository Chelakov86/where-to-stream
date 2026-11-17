import { act, renderHook, waitFor } from '@testing-library/react';
import { useGenres } from '@/app/hooks/useGenres';

const response = (movie = [{ id: 28, name: 'Action' }], tv = [{ id: 28, name: 'Action' }]) => ({
  ok: true,
  json: async () => ({ movie, tv }),
});

beforeEach(() => {
  global.fetch = jest.fn();
});

it('retries a failure with a stable reload action and deduplicates movie/TV genres', async () => {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockResolvedValueOnce({ ok: false });
  const { result, rerender } = renderHook(() => useGenres());
  expect(result.current.isLoading).toBe(true);
  await waitFor(() => expect(result.current.error).toBeTruthy());
  const reload = result.current.reload;
  rerender();
  expect(result.current.reload).toBe(reload);

  let finish!: (value: unknown) => void;
  fetchMock.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
  let pending!: ReturnType<typeof reload>;
  act(() => {
    pending = reload();
  });
  expect(result.current.isLoading).toBe(true);
  expect(result.current.error).toBeNull();
  await act(async () => {
    finish(
      response(
        [{ id: 28, name: 'Action' }],
        [
          { id: 28, name: 'Action' },
          { id: 18, name: 'Drama' },
        ]
      )
    );
    await pending;
  });
  expect(result.current.genres).toEqual([
    { id: 28, name: 'Action' },
    { id: 18, name: 'Drama' },
  ]);
  expect(result.current.isLoading).toBe(false);
  expect(result.current.error).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls.every(([url]) => url === '/api/genres')).toBe(true);
});

it('distinguishes a successful empty response from failure', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce(response([], []));
  const { result } = renderHook(() => useGenres());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.genres).toEqual([]);
  expect(result.current.error).toBeNull();
});

it.each(['resolve', 'reject'])('ignores a superseded request that later %ss', async (outcome) => {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: Error) => void;
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      })
  );
  const { result } = renderHook(() => useGenres());
  const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
  fetchMock.mockResolvedValueOnce(response([], [{ id: 18, name: 'Drama' }]));
  await act(async () => {
    await result.current.reload();
  });
  expect(signal.aborted).toBe(true);
  await act(async () => {
    if (outcome === 'resolve') resolve(response());
    else reject(new Error('late failure'));
  });
  expect(result.current.genres).toEqual([{ id: 18, name: 'Drama' }]);
  expect(result.current.error).toBeNull();
  expect(result.current.isLoading).toBe(false);
});

it('aborts on unmount and ignores a late response body', async () => {
  let finish!: (value: unknown) => void;
  const json = jest.fn(async () => ({ movie: [{ id: 28, name: 'Action' }], tv: [] }));
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const { result, unmount } = renderHook(() => useGenres());
  await waitFor(() => expect(finish).toBeDefined());
  const signal = (global.fetch as jest.Mock).mock.calls[0][1].signal as AbortSignal;
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => finish(await json()));
  expect(result.current.genres).toEqual([]);
});
