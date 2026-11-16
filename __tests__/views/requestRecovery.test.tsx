import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchView from '@/app/views/SearchView';
import TitleView from '@/app/views/TitleView';
import CountriesView from '@/app/views/CountriesView';
import { clearApiResourceCache } from '@/app/hooks/useApiResource';
import { CLIENT_REQUEST_TIMEOUT_MS } from '@/app/config';
import { mockMovie } from '../mocks';

const mockParams = new URLSearchParams({ returnTo: '/?q=dune&page=3&country=DE' });
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockParams,
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

describe.each(['search', 'title', 'countries'])('%s actionable recovery', (surface) => {
  const mount = () =>
    render(
      surface === 'search' ? (
        <SearchView />
      ) : surface === 'title' ? (
        <TitleView type="movie" id={550} />
      ) : (
        <CountriesView type="movie" id={550} />
      )
    );
  let reply: () => Promise<unknown>;
  let requests: number;
  beforeEach(() => {
    clearApiResourceCache();
    localStorage.clear();
    requests = 0;
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/genres'))
        return { ok: true, json: async () => ({ movie: [], tv: [] }) };
      requests++;
      return reply();
    }) as jest.Mock;
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  const success = () => ({
    ok: true,
    json: async () =>
      surface === 'search' ? { results: [], totalPages: 1, page: 1, totalResults: 0 } : mockMovie,
  });

  it.each([
    [404, 'Not found'],
    [429, 'Too many requests'],
    [500, 'The service is temporarily unavailable'],
    [502, 'The service is temporarily unavailable'],
    [503, 'The service is temporarily unavailable'],
  ])('shows safe HTTP %s guidance and appropriate actions', async (status, title) => {
    reply = async () => ({
      ok: false,
      status,
      headers: new Headers(),
      json: async () => ({ error: 'secret stack' }),
    });
    mount();
    expect(await screen.findByRole('heading', { name: title as string })).toBeInTheDocument();
    expect(screen.queryByText(/secret stack/)).not.toBeInTheDocument();
    if (status === 404) {
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to search' })).toHaveAttribute(
        'href',
        surface === 'search' ? '/' : '/?q=dune&page=3&country=DE'
      );
    } else if (status === 429) {
      expect(screen.getByRole('button', { name: 'Please wait' })).toBeDisabled();
    } else {
      reply = async () => success();
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(requests).toBe(2);
    }
  });

  it.each([true, false])(
    'distinguishes offline from network rejection (online=%s)',
    async (online) => {
      jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
      reply = async () => {
        throw new TypeError('private network error');
      };
      mount();
      expect(
        await screen.findByRole('heading', {
          name: online ? 'Unable to connect' : 'You appear to be offline',
        })
      ).toBeInTheDocument();
      reply = async () => success();
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    }
  );

  it('waits for Retry-After without sending requests, then permits explicit recovery', async () => {
    jest.useFakeTimers();
    reply = async () => ({ ok: false, status: 429, headers: new Headers({ 'Retry-After': '3' }) });
    mount();
    await act(async () => undefined);
    expect(screen.getByRole('button', { name: 'Please wait' })).toBeDisabled();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2999);
    });
    expect(requests).toBe(1);
    reply = async () => success();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1001);
    });
    expect(requests).toBe(1);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(requests).toBe(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a deadline timeout and recovers without a page reload', async () => {
    jest.useFakeTimers();
    reply = () => new Promise(() => undefined);
    mount();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(CLIENT_REQUEST_TIMEOUT_MS);
    });
    expect(screen.getByRole('heading', { name: 'The request took too long' })).toBeInTheDocument();
    reply = async () => success();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(requests).toBe(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
