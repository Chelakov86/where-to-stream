import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CountriesView from '@/app/views/CountriesView';
import { clearApiResourceCache } from '@/app/hooks/useApiResource';
import { mockMovie } from '../../test/mocks';

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

  it('shows an error state with a retry action when the fetch fails', async () => {
    mockFetch({ ok: false, status: 500 });
    render(<CountriesView type="movie" id={550} />);

    expect(await screen.findByText("Couldn't load availability.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
