import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ServicesDialog from '@/app/components/ServicesDialog';

const netflix = {
  id: 8,
  name: 'Netflix',
  logoUrl: 'https://image.tmdb.org/t/p/w92/netflix.jpg',
  priority: 1,
};
const disney = { id: 337, name: 'Disney Plus', logoUrl: undefined, priority: 2 };

const mockFetch = (providers: unknown[]) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ providers }),
  }) as unknown as typeof fetch;
};

describe('ServicesDialog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the selected services count on the trigger', () => {
    localStorage.setItem('wts.services', JSON.stringify([8]));
    render(<ServicesDialog country="US" />);
    expect(screen.getByRole('button', { name: 'My services (1 selected)' })).toBeInTheDocument();
  });

  it('fetches and lists providers only after the dialog opens', async () => {
    mockFetch([netflix, disney]);
    render(<ServicesDialog country="US" />);

    expect(global.fetch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /My services/ }));

    expect(await screen.findByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Disney Plus')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('watchRegion=US'),
      expect.any(Object)
    );
  });

  it('toggles a service and marks it active', async () => {
    mockFetch([netflix]);
    render(<ServicesDialog country="US" />);

    await userEvent.click(screen.getByRole('button', { name: /My services/ }));
    const netflixButton = await screen.findByRole('button', { name: 'Netflix' });
    expect(netflixButton).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(netflixButton);

    await waitFor(() => expect(netflixButton).toHaveAttribute('aria-pressed', 'true'));
    expect(JSON.parse(localStorage.getItem('wts.services') ?? '[]')).toEqual([8]);
  });

  it('shows an error message when providers fail to load', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    render(<ServicesDialog country="US" />);

    await userEvent.click(screen.getByRole('button', { name: /My services/ }));

    expect(
      await screen.findByText("Couldn't load providers. Close the dialog and try again.")
    ).toBeInTheDocument();
  });
});
