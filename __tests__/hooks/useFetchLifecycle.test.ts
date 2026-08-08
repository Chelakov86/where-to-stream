import { renderHook, waitFor, act } from '@testing-library/react';
import { useFetchLifecycle } from '@/app/hooks/useFetchLifecycle';

const GENERIC_ERROR_MESSAGE =
  "We're having trouble fetching data right now. Please try again later.";

describe('useFetchLifecycle', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets isLoading true while running and false after completion', async () => {
    let resolveTask: (value: void) => void;
    const task = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveTask = resolve;
        })
    );

    const { result } = renderHook(() => useFetchLifecycle());

    let runPromise: Promise<unknown>;
    act(() => {
      runPromise = result.current.run(task as (signal: AbortSignal) => Promise<void>);
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveTask();
      await runPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('passes an AbortSignal to the task', async () => {
    const task = jest.fn(async (_signal: AbortSignal) => undefined);

    const { result } = renderHook(() => useFetchLifecycle());

    await act(async () => {
      await result.current.run(task);
    });

    expect(task).toHaveBeenCalledTimes(1);
    const signal = task.mock.calls[0][0];
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });

  it('aborts the previous run when run is called again', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    const task = jest.fn(async () => undefined);

    const { result } = renderHook(() => useFetchLifecycle());

    await act(async () => {
      await result.current.run(task);
    });

    abortSpy.mockClear();
    await act(async () => {
      await result.current.run(task);
    });

    expect(abortSpy).toHaveBeenCalledTimes(1);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('calls onError with null after a successful run', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useFetchLifecycle(onError));

    await act(async () => {
      await result.current.run(async () => undefined);
    });

    expect(onError).toHaveBeenCalledWith(null);
  });

  it('calls onError with the generic message on failure', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useFetchLifecycle(onError));

    await act(async () => {
      await result.current.run(async () => {
        throw new Error('boom');
      });
    });

    expect(onError).toHaveBeenCalledWith(GENERIC_ERROR_MESSAGE);
  });

  it('falls back to internal error state when no onError is provided', async () => {
    const { result } = renderHook(() => useFetchLifecycle());

    await act(async () => {
      await result.current.run(async () => {
        throw new Error('boom');
      });
    });

    expect(result.current.error).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('does not report an error for aborted requests', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useFetchLifecycle(onError));

    await act(async () => {
      await result.current.run(async () => {
        throw Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
      });
    });

    expect(onError).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('aborts the current request on unmount', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    const task = jest.fn(
      () =>
        new Promise<void>(() => {
          // never resolves
        })
    );

    const { result, unmount } = renderHook(() => useFetchLifecycle());

    act(() => {
      result.current.run(task as (signal: AbortSignal) => Promise<void>);
    });

    unmount();
    expect(abortSpy).toHaveBeenCalled();
  });

  it('ignores errors from superseded runs', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useFetchLifecycle(onError));

    const staleRun = result.current.run(async () => {
      throw new Error('stale failure');
    });

    // Second run supersedes the first
    await act(async () => {
      await result.current.run(async () => undefined);
    });

    await act(async () => {
      await staleRun;
    });

    // Only the latest run's outcome is reported
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(null);
  });

  it('reports cancelled when a resolved task belongs to a superseded run', async () => {
    const { result } = renderHook(() => useFetchLifecycle());

    let staleStatus: string | undefined;
    await act(async () => {
      const staleRun = result.current.run(async () => {
        // Resolves after the second run has already started
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      const currentRun = result.current.run(async () => undefined);
      staleStatus = await staleRun;
      await currentRun;
    });

    expect(staleStatus).toBe('cancelled');
  });

  it('exposes clearError which clears internal state and notifies onError', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useFetchLifecycle(onError));

    await act(async () => {
      await result.current.run(async () => {
        throw new Error('boom');
      });
    });

    // With onError provided, the message goes to the callback
    expect(onError).toHaveBeenCalledWith(GENERIC_ERROR_MESSAGE);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(onError).toHaveBeenCalledWith(null);
  });

  it('clearError clears internal error state when no onError is provided', async () => {
    const { result } = renderHook(() => useFetchLifecycle());

    await act(async () => {
      await result.current.run(async () => {
        throw new Error('boom');
      });
    });

    expect(result.current.error).toBe(GENERIC_ERROR_MESSAGE);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('returns cancelled for aborted runs and error for failed runs', async () => {
    const { result } = renderHook(() => useFetchLifecycle());

    let cancelledStatus: string | undefined;
    await act(async () => {
      const running = result.current.run(async (signal) => {
        return new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        });
      });
      result.current.cancel();
      cancelledStatus = await running;
    });

    expect(cancelledStatus).toBe('cancelled');

    let errorStatus: string | undefined;
    await act(async () => {
      errorStatus = await result.current.run(async () => {
        throw new Error('boom');
      });
    });

    expect(errorStatus).toBe('error');

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
