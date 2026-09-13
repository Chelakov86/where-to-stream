import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SavedView from '@/app/views/SavedView';

describe('SavedView', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('wts.country', '"US"');
  });

  it('shows an empty state with a link back to search when nothing is saved', async () => {
    render(<SavedView />);

    expect(await screen.findByText('Nothing saved yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start searching' })).toHaveAttribute('href', '/');
  });

  it('lists saved titles', async () => {
    localStorage.setItem(
      'wts.saved',
      JSON.stringify([
        { id: 550, type: 'movie', title: 'Fight Club', year: 1999, addedAt: Date.now() },
        { id: 1399, type: 'tv', title: 'Game of Thrones', year: 2011, addedAt: Date.now() },
      ])
    );

    render(<SavedView />);

    expect(await screen.findByText('Fight Club')).toBeInTheDocument();
    expect(screen.getByText('Game of Thrones')).toBeInTheDocument();
    expect(screen.queryByText('Nothing saved yet')).not.toBeInTheDocument();
  });

  it('removes a title when its remove button is clicked', async () => {
    localStorage.setItem(
      'wts.saved',
      JSON.stringify([
        { id: 550, type: 'movie', title: 'Fight Club', year: 1999, addedAt: Date.now() },
      ])
    );

    render(<SavedView />);

    await screen.findByText('Fight Club');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Fight Club from saved' }));

    expect(await screen.findByText('Nothing saved yet')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('wts.saved') ?? '[]')).toEqual([]);
  });
});
