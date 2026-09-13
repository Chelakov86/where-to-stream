import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AppHeader from '@/app/components/AppHeader';

const replace = jest.fn();
let mockPathname = '/';
let mockSearch = '';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => mockPathname,
  useSearchParams: () => (mockSearch ? new URLSearchParams(mockSearch) : null),
}));

describe('AppHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('wts.country', '"DE"');
    replace.mockClear();
    mockPathname = '/';
    mockSearch = '';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ providers: [] }),
    }) as unknown as typeof fetch;
  });

  it('links the logo back to the search page', () => {
    render(<AppHeader />);
    expect(screen.getByRole('link', { name: 'Where To Stream' })).toHaveAttribute('href', '/');
  });

  it('links to the saved titles page with the active country', () => {
    render(<AppHeader />);
    expect(screen.getByRole('link', { name: 'Saved titles' })).toHaveAttribute(
      'href',
      '/saved?country=DE'
    );
  });

  it('marks the saved link as the current page when already on /saved', () => {
    mockPathname = '/saved';
    render(<AppHeader />);
    expect(screen.getByRole('link', { name: 'Saved titles' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('renders the country picker showing the active country', () => {
    render(<AppHeader />);
    expect(
      screen.getByRole('combobox', { name: 'Country: Germany. Change country' })
    ).toBeInTheDocument();
  });

  it('replaces the URL country param when changing country while one is present', async () => {
    mockSearch = 'country=DE';
    render(<AppHeader />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getAllByText('United States')[0]);

    expect(replace).toHaveBeenCalledWith('/?country=US', { scroll: false });
  });
});
