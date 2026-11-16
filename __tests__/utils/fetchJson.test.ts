import { fetchJson } from '@/app/utils/fetchJson';
import { CLIENT_REQUEST_TIMEOUT_MS } from '@/app/config';

describe('fetchJson transport', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  const request = () => fetchJson('/api/test', new AbortController().signal);

  it.each([404, 429, 500, 502, 503])(
    'preserves HTTP %s even with a malformed body',
    async (status) => {
      const json = jest.fn().mockRejectedValue(new Error('secret server stack'));
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status,
        headers: new Headers({ 'Retry-After': '5' }),
        json,
      });
      await expect(request()).rejects.toMatchObject({ status, retryAt: expect.any(Number) });
      expect(json).not.toHaveBeenCalled();
    }
  );
  it.each([true, false])(
    'distinguishes network failure with navigator.onLine=%s',
    async (online) => {
      jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
      (fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(request()).rejects.toMatchObject({ kind: online ? 'network' : 'offline' });
    }
  );
  it('handles malformed successful JSON safely', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('secret');
      },
    });
    await expect(request()).rejects.toMatchObject({
      kind: 'server',
      status: 200,
      message: 'server',
    });
  });
  it.each(['headers', 'body'])('times out stalled %s even when abort is ignored', async (stage) => {
    jest.useFakeTimers();
    const stalled = new Promise(() => undefined);
    (fetch as jest.Mock).mockImplementation(() =>
      stage === 'headers' ? stalled : Promise.resolve({ ok: true, json: () => stalled })
    );
    const pending = expect(request()).rejects.toMatchObject({ kind: 'timeout' });
    await jest.advanceTimersByTimeAsync(CLIENT_REQUEST_TIMEOUT_MS);
    await pending;
    expect((fetch as jest.Mock).mock.calls[0][1].signal.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
  it.each([true, false])(
    'keeps parent abort silent (already aborted=%s)',
    async (alreadyAborted) => {
      const controller = new AbortController();
      (fetch as jest.Mock).mockImplementation(() => new Promise(() => undefined));
      if (alreadyAborted) controller.abort();
      const pending = fetchJson('/api/test', controller.signal);
      controller.abort();
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
      expect(fetch).toHaveBeenCalledTimes(alreadyAborted ? 0 : 1);
    }
  );
});
