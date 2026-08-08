import { renderHook, waitFor, act } from '@testing-library/react';
import { useAutocomplete } from '@/app/hooks/useAutocomplete';

global.fetch = jest.fn();

const GENERIC_ERROR_MESSAGE =
  "We're having trouble fetching data right now. Please try again later.";

const mockAutocompleteResponse = () => ({
  ok: true,
  json: async () => ({
    results: [{ id: 550, type: 'movie', title: 'Fight Club', year: 1999, popularity: 50.5 }],
  }),
});

describe('useAutocomplete', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const flushDebounce = async () => {
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
  };

  it('fetches suggestions after the debounce window', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockAutocompleteResponse());

    const { result } = renderHook(() => useAutocomplete());

    act(() => {
      result.current.handleAutocompleteRequest('Fight');
    });

    expect(global.fetch).not.toHaveBeenCalled();

    await flushDebounce();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.autocompleteSuggestions).toHaveLength(1);
    expect(result.current.autocompleteSuggestions[0].title).toBe('Fight Club');
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('does not fetch for queries shorter than 2 characters', async () => {
    const { result } = renderHook(() => useAutocomplete());

    act(() => {
      result.current.handleAutocompleteRequest('F');
    });

    await flushDebounce();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.autocompleteSuggestions).toEqual([]);
  });

  it('only fetches for the latest query after rapid input', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockAutocompleteResponse());

    const { result } = renderHook(() => useAutocomplete());

    act(() => {
      result.current.handleAutocompleteRequest('Fi');
    });
    act(() => {
      result.current.handleAutocompleteRequest('Fig');
    });
    act(() => {
      result.current.handleAutocompleteRequest('Fight');
    });

    await flushDebounce();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain(encodeURIComponent('Fight'));
  });

  it('reports errors through onError', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    const onError = jest.fn();

    const { result } = renderHook(() => useAutocomplete(onError));

    act(() => {
      result.current.handleAutocompleteRequest('Fight');
    });

    await flushDebounce();

    expect(onError).toHaveBeenCalledWith(GENERIC_ERROR_MESSAGE);
  });

  it('clearAutocomplete resets suggestions and cancels pending fetches', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockAutocompleteResponse());

    const { result } = renderHook(() => useAutocomplete());

    act(() => {
      result.current.handleAutocompleteRequest('Fight');
    });

    await flushDebounce();

    expect(result.current.autocompleteSuggestions).toHaveLength(1);

    act(() => {
      result.current.clearAutocomplete();
    });

    expect(result.current.autocompleteSuggestions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(abortSpy).toHaveBeenCalled();
  });

  it('clearAutocomplete cancels a debounce that has not started fetching', async () => {
    const { result } = renderHook(() => useAutocomplete());

    act(() => {
      result.current.handleAutocompleteRequest('Fight');
      result.current.clearAutocomplete();
    });

    await flushDebounce();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
