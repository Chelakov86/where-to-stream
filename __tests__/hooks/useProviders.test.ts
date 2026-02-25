import { renderHook, waitFor, act } from '@testing-library/react';
import { useProviders } from '@/app/hooks/useProviders';

// Mock fetch
global.fetch = jest.fn();

describe('useProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches providers on mount when watchRegion is provided', async () => {
    const mockProviders = [
      { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
      {
        provider_id: 9,
        provider_name: 'Amazon Prime Video',
        logo_path: '/prime.jpg',
        display_priority: 2,
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockProviders }),
    });

    // Hook requires watchRegion to trigger a fetch
    const { result } = renderHook(() => useProviders('US'));

    // Initially loading (fetch triggered immediately)
    expect(result.current.isLoading).toBe(true);
    expect(result.current.providers).toEqual([]);
    expect(result.current.error).toBeNull();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.providers).toEqual(mockProviders);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/providers'),
      expect.any(Object),
    );
  });

  it('does not fetch when no watchRegion is provided', () => {
    const { result } = renderHook(() => useProviders());

    // No fetch should happen and loading stays false
    expect(result.current.isLoading).toBe(false);
    expect(result.current.providers).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles fetch errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useProviders('US'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.providers).toEqual([]);
    expect(result.current.error).toBe(
      "We're having trouble fetching data right now. Please try again later.",
    );
  });

  it('handles network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useProviders('US'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.providers).toEqual([]);
    expect(result.current.error).toBe(
      "We're having trouble fetching data right now. Please try again later.",
    );
  });

  it('provides clearError function', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useProviders('US'));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('cancels fetch on unmount', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, json: async () => ({ providers: [] }) }), 1000),
        ),
    );

    const { unmount } = renderHook(() => useProviders('US'));

    // Unmount before fetch completes
    unmount();

    await waitFor(() => {
      expect(abortSpy).toHaveBeenCalled();
    });
  });

  it('does not set error for aborted requests', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }),
    );

    const { result } = renderHook(() => useProviders('US'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not set error for aborted requests
    expect(result.current.error).toBeNull();
  });

  it('handles non-array providers response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: null }), // Invalid response
    });

    const { result } = renderHook(() => useProviders('US'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.providers).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
