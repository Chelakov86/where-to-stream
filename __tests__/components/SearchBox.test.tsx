import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SearchBox from '@/app/components/SearchBox';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));

const suggestions = [
  { id: 603, type: 'movie', title: 'The Matrix', year: 1999 },
  { id: 604, type: 'movie', title: 'The Matrix Reloaded', year: 2003 },
];

describe('SearchBox', () => {
  beforeEach(() => {
    push.mockClear();
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: suggestions }),
    }) as unknown as typeof fetch;
  });

  it('commits the trimmed query after typing pauses', async () => {
    const onChange = jest.fn();
    render(<SearchBox value="" onChange={onChange} country="DE" />);

    await userEvent.type(
      screen.getByRole('combobox', { name: 'Search movies and TV shows' }),
      ' matrix '
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('matrix'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('opens a suggestion with the keyboard', async () => {
    render(<SearchBox value="" onChange={jest.fn()} country="DE" />);
    const input = screen.getByRole('combobox');

    await userEvent.type(input, 'matr');
    expect(await screen.findByRole('option', { name: /The Matrix Reloaded/ })).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('option', { name: /The Matrix Reloaded/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await userEvent.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/title/movie/604?country=DE');
  });

  it.each(['keyboard', 'click'])(
    'cancels the pending query commit on %s selection',
    async (method) => {
      jest.useFakeTimers();
      try {
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        const onChange = jest.fn();
        render(<SearchBox value="" onChange={onChange} country="US" />);
        await user.type(screen.getByRole('combobox'), 'matr');
        await act(async () => {
          jest.advanceTimersByTime(300);
        });

        if (method === 'keyboard') {
          await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
        } else {
          await user.click(screen.getByRole('option', { name: /The Matrix Reloaded/ }));
        }
        expect(push).toHaveBeenCalledWith('/title/movie/604?country=US');
        await act(async () => {
          jest.advanceTimersByTime(400);
        });
        expect(onChange).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    }
  );

  it('opens a suggestion on click with its search context', async () => {
    const onOpen = jest.fn();
    render(
      <SearchBox
        value=""
        onChange={jest.fn()}
        country="US"
        returnTo="/?q=matrix&page=2&country=US"
        onOpen={onOpen}
      />
    );
    await userEvent.type(screen.getByRole('combobox'), 'matr');
    await userEvent.click(await screen.findByRole('option', { name: /^The Matrix Film/ }));
    expect(push).toHaveBeenCalledWith(
      '/title/movie/603?country=US&returnTo=%2F%3Fq%3Dmatrix%26page%3D2%26country%3DUS'
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('offers recently viewed titles when empty', async () => {
    localStorage.setItem(
      'where-to-stream-search-history',
      JSON.stringify([{ id: 1399, type: 'tv', title: 'Game of Thrones', year: 2011, timestamp: 1 }])
    );
    render(<SearchBox value="" onChange={jest.fn()} country="DE" />);

    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox', { name: 'Recently viewed titles' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: /Game of Thrones/ }));
    expect(push).toHaveBeenCalledWith('/title/tv/1399?country=DE');
  });

  it('clears the query', async () => {
    const onChange = jest.fn();
    render(<SearchBox value="dune" onChange={onChange} country="DE" />);

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('follows query changes from the URL', () => {
    const { rerender } = render(<SearchBox value="dune" onChange={jest.fn()} country="DE" />);
    rerender(<SearchBox value="alien" onChange={jest.fn()} country="DE" />);
    expect(screen.getByRole('combobox')).toHaveValue('alien');
  });
});
