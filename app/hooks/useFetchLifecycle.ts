/**
 * Fetch lifecycle module.
 *
 * Owns the request lifecycle shared by every client-side fetch:
 * cancel-previous, loading transitions, error selection, and cleanup.
 * Consumers supply a task that receives the AbortSignal; the module
 * decides what the user sees for loading and errors.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ERROR_MESSAGES, shouldDisplayError } from '@/app/utils/errorMessages';

export type FetchRunStatus = 'success' | 'error' | 'cancelled';

interface UseFetchLifecycleResult {
  /**
   * Runs the task, aborting any previous run first.
   * Resolves with 'success', 'error', or 'cancelled' (aborted or superseded).
   */
  run: (task: (signal: AbortSignal) => Promise<void>) => Promise<FetchRunStatus>;
  /** Aborts the current run, if any. */
  cancel: () => void;
  isLoading: boolean;
  /** Internal error state, used only when no onError callback is provided. */
  error: string | null;
  /** Clears the error (internal state and onError callback). */
  clearError: () => void;
}

/**
 * Manages the shared fetch lifecycle: abort-previous, loading state,
 * and user-facing error selection.
 *
 * @param onError - Optional callback receiving error messages (null on success).
 *   When omitted, errors are kept in internal state.
 */
export function useFetchLifecycle(
  onError?: (message: string | null) => void
): UseFetchLifecycleResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const notifyError = useCallback((message: string | null) => {
    if (onErrorRef.current) {
      onErrorRef.current(message);
    } else {
      setError(message);
    }
  }, []);

  const run = useCallback(
    async (task: (signal: AbortSignal) => Promise<void>): Promise<FetchRunStatus> => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        await task(controller.signal);
        if (abortRef.current === controller) {
          notifyError(null);
        }
        return 'success';
      } catch (err) {
        // Superseded runs must not report their outcome
        if (abortRef.current !== controller || !shouldDisplayError(err)) {
          return 'cancelled';
        }
        notifyError(ERROR_MESSAGES.GENERIC_ERROR);
        return 'error';
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [notifyError]
  );

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const clearError = useCallback(() => notifyError(null), [notifyError]);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return { run, cancel, isLoading, error, clearError };
}
