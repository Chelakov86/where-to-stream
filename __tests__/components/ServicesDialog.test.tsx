import { act, render, screen, waitFor } from '@testing-library/react';
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
    render(<ServicesDialog country="US" onCountryChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'My services (1 selected)' })).toBeInTheDocument();
  });

  it('fetches and lists providers only after the dialog opens', async () => {
    mockFetch([netflix, disney]);
    render(<ServicesDialog country="US" onCountryChange={jest.fn()} />);

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
    render(<ServicesDialog country="US" onCountryChange={jest.fn()} />);

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
    render(<ServicesDialog country="US" onCountryChange={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /My services/ }));

    expect(
      await screen.findByText("Couldn't load providers. Close the dialog and try again.")
    ).toBeInTheDocument();
  });

  it('shows loading until an empty response completes, including after reopening', async () => {
    let resolve!: (response: unknown) => void;
    global.fetch = jest.fn(
      () =>
        new Promise<unknown>((done) => {
          resolve = done;
        })
    ) as unknown as typeof fetch;
    render(<ServicesDialog country="US" onCountryChange={jest.fn()} />);

    const trigger = screen.getByRole('button', { name: /My services/ });
    await userEvent.click(trigger);
    expect(screen.getByRole('status', { name: 'Loading providers' })).toBeInTheDocument();
    expect(screen.queryByText(/No streaming services are listed/)).not.toBeInTheDocument();

    await act(async () => resolve({ ok: true, json: async () => ({ providers: [] }) }));
    expect(
      await screen.findByText(/No streaming services are listed in United States/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading providers' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Change country/ })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.click(trigger);
    expect(screen.getByRole('status', { name: 'Loading providers' })).toBeInTheDocument();
    expect(screen.queryByText(/No streaming services are listed/)).not.toBeInTheDocument();
    await act(async () => resolve({ ok: true, json: async () => ({ providers: [] }) }));
    expect(
      await screen.findByText(/No streaming services are listed in United States/)
    ).toBeInTheDocument();
  });

  it('offers country selection and keeps saved services when the new country has providers', async () => {
    localStorage.setItem('wts.services', JSON.stringify([8]));
    mockFetch([]);
    const onCountryChange = jest.fn();
    const { rerender } = render(<ServicesDialog country="US" onCountryChange={onCountryChange} />);
    await userEvent.click(screen.getByRole('button', { name: /My services/ }));
    expect(
      await screen.findByText(/No streaming services are listed in United States/)
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: /Change country/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Germany' }));
    expect(onCountryChange).toHaveBeenCalledWith('DE');

    mockFetch([netflix]);
    rerender(<ServicesDialog country="DE" onCountryChange={onCountryChange} />);
    expect(await screen.findByRole('button', { name: 'Netflix' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.queryByText(/No streaming services are listed/)).not.toBeInTheDocument();
    expect(localStorage.getItem('wts.services')).toBe('[8]');
  });
  it('searches all providers and keeps the 61st selected outside the search results', async () => {
    const providers = Array.from({ length: 61 }, (_, index) => ({
      id: index + 1000,
      name: `Service ${index + 1}`,
      priority: index,
    }));
    mockFetch(providers);
    render(<ServicesDialog country="US" onCountryChange={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /My services/ }));
    expect(await screen.findByRole('button', { name: 'Service 61' })).toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: 'Search services' });
    await userEvent.type(search, '  SERVICE 61 ');
    expect(screen.getByRole('button', { name: 'Service 61' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Service 1' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Service 61' }));
    await userEvent.clear(search);
    expect(screen.getByRole('button', { name: 'Service 61' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await userEvent.type(search, 'no such service');
    expect(
      screen.getByText('No services match your search. Try another name.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/No streaming services are listed/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Service 61' }));
    expect(localStorage.getItem('wts.services')).toBe('[]');
    expect(search).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('retains selected names and logos in an empty country and after reopening', async () => {
    localStorage.setItem('wts.services', '[8]');
    mockFetch([netflix]);
    const { rerender } = render(<ServicesDialog country="US" onCountryChange={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /My services/ }));
    expect(await screen.findByRole('button', { name: 'Remove Netflix' })).toBeInTheDocument();
    mockFetch([]);
    rerender(<ServicesDialog country="DE" onCountryChange={jest.fn()} />);
    expect(
      await screen.findByText(/No streaming services are listed in Germany/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove Netflix' }).querySelector('img')
    ).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: /My services/ }));
    expect(
      await screen.findByText(/No streaming services are listed in Germany/)
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Netflix' }));
    expect(localStorage.getItem('wts.services')).toBe('[]');
  });

  it('allows ID-only selections to be removed or cleared even when providers fail', async () => {
    localStorage.setItem('wts.services', '[9001,9002]');
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    render(<ServicesDialog country="US" onCountryChange={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /My services/ }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Unavailable service (ID 9001)' })
    );
    expect(localStorage.getItem('wts.services')).toBe('[9002]');
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(localStorage.getItem('wts.services')).toBe('[]');
    expect(screen.queryByRole('button', { name: /Remove Unavailable/ })).not.toBeInTheDocument();
  });
});
