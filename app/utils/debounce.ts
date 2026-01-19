/**
 * Debounce utility to delay function execution until after a wait period
 * Useful for reducing API calls on rapid user input (e.g., autocomplete)
 */

/**
 * Creates a debounced function that delays invoking func until after waitMs milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param waitMs - The number of milliseconds to delay
 * @returns A debounced version of the function
 *
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   fetchSearchResults(query);
 * }, 300);
 *
 * // Rapid calls
 * debouncedSearch('a');
 * debouncedSearch('ab');
 * debouncedSearch('abc'); // Only this call executes after 300ms
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}

/**
 * Creates a debounced function with cleanup capability
 * Returns both the debounced function and a cancel function
 *
 * @param func - The function to debounce
 * @param waitMs - The number of milliseconds to delay
 * @returns Object with debounced function and cancel function
 *
 * @example
 * const { debounced, cancel } = debounceWithCancel((query: string) => {
 *   fetchSearchResults(query);
 * }, 300);
 *
 * debounced('test');
 * cancel(); // Cancels pending execution
 */
export function debounceWithCancel<T extends (...args: unknown[]) => unknown>(
  func: T,
  waitMs: number
): {
  debounced: (...args: Parameters<T>) => void;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, waitMs);
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { debounced, cancel };
}
