import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CountriesView from '@/app/views/CountriesView';
import { clearApiResourceCache } from '@/app/hooks/useApiResource';
import { mockMovie } from '../mocks';

jest.mock('next/navigation', () => ({
  useSearchParams: () => null,
}));

const mockFetch = (reply: { ok: boolean; status?: number; body?: unknown }) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: reply.ok,
    status: reply.status ?? 200,
    json: async () => reply.body,
  }) as unknown as typeof fetch;
};

describe('CountriesView', () => {
  beforeEach(() => {
    clearApiResourceCache();
    localStorage.clear();
    localStorage.setItem('wts.country', '"US"');
    localStorage.setItem('wts.pinnedCountries', '["US"]');
  });

  it('shows a loading state before availability loads', () => {
    mockFetch({ ok: true, body: mockMovie });
    render(<CountriesView type="movie" id={550} />);
    expect(screen.getByRole('status', { name: 'Loading availability' })).toBeInTheDocument();
  });

  it('lists every country carrying the title, with the user country marked', async () => {
    mockFetch({ ok: true, body: mockMovie });
    render(<CountriesView type="movie" id={550} />);

    expect(
      await screen.findByRole('heading', { name: 'Fight Club: availability by country' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'United States' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'United Kingdom' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Germany' })).toBeInTheDocument();
    expect(screen.getByText('Your country')).toBeInTheDocument();
  });

  it('filters countries by name', async () => {
    mockFetch({ ok: true, body: mockMovie });
    render(<CountriesView type="movie" id={550} />);

    await screen.findByRole('heading', { name: 'United States' });
    await userEvent.type(screen.getByPlaceholderText('Filter countries…'), 'German');

    expect(screen.getByRole('heading', { name: 'Germany' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'United States' })).not.toBeInTheDocument();
  });

  it('shows an empty state when no country matches the filter', async () => {
    mockFetch({ ok: true, body: mockMovie });
    render(<CountriesView type="movie" id={550} />);

    await screen.findByRole('heading', { name: 'United States' });
    await userEvent.type(screen.getByPlaceholderText('Filter countries…'), 'Nowhereland');

    expect(screen.getByText('No countries match those filters.')).toBeInTheDocument();
  });

  it('toggles pinning a country', async () => {
    mockFetch({ ok: true, body: mockMovie });
    render(<CountriesView type="movie" id={550} />);

    await screen.findByRole('heading', { name: 'Germany' });
    const pinButton = screen.getByRole('button', { name: 'Pin Germany' });
    await userEvent.click(pinButton);

    expect(await screen.findByRole('button', { name: 'Unpin Germany' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('wts.pinnedCountries') ?? '[]')).toContain('DE');
  });

  it('links each country to its own TMDB watch options in a new tab', async () => {
    mockFetch({ ok: true, body: mockMovie });
    render(<CountriesView type="movie" id={550} />);

    await screen.findByRole('heading', { name: 'United States' });
    for (const code of ['US', 'DE']) {
      const entry = mockMovie.availability[code];
      const link = screen.getByRole('link', {
        name: `View watch options on TMDB for ${entry.countryName} (opens in a new tab)`,
      });
      expect(link).toHaveAttribute('href', entry.watchLink);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveTextContent('View watch options on TMDB');
    }

    await userEvent.click(screen.getByRole('button', { name: 'Pin Germany' }));
    expect(
      screen.getByRole('link', { name: /View watch options on TMDB for Germany/ })
    ).toHaveAttribute('href', mockMovie.availability.DE.watchLink);
    expect(localStorage.getItem('wts.country')).toBe('"US"');
  });

  it('keeps offers and pinning available when a country has no watch link', async () => {
    mockFetch({
      ok: true,
      body: {
        ...mockMovie,
        availability: {
          ...mockMovie.availability,
          DE: { ...mockMovie.availability.DE, watchLink: undefined },
        },
      },
    });
    render(<CountriesView type="movie" id={550} />);

    const heading = await screen.findByRole('heading', { name: 'Germany' });
    const card = within(heading.closest('li')!);
    expect(card.getByText('Watch options link unavailable for Germany.')).toBeInTheDocument();
    expect(card.queryByRole('link')).not.toBeInTheDocument();
    expect(card.getAllByText('Apple TV')).toHaveLength(2);
    await userEvent.click(card.getByRole('button', { name: 'Pin Germany' }));
    expect(card.getByRole('button', { name: 'Unpin Germany' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('shows an error state with a retry action when the fetch fails', async () => {
    mockFetch({ ok: false, status: 500 });
    render(<CountriesView type="movie" id={550} />);

    expect(await screen.findByText('Please try again later.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
