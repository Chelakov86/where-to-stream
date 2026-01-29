import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Home from '../app/page';
import { mockGenres } from '../test/mocks';

const buildOkResponse = (data: unknown) => ({
  ok: true,
  json: async () => data,
});

let fetchMock: jest.Mock;

describe('Home Page Accessibility', () => {
  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('exposes accessible landmarks and autocomplete semantics', async () => {
    const user = userEvent.setup();
    const autocompleteResponse = {
      results: [{ id: 1, title: 'Matrix', type: 'movie', year: 1999 }],
    };
    const searchResponse = {
      results: [
        { id: 42, title: 'Matrix Reloaded', type: 'movie', year: 2003 },
        { id: 84, title: 'Matrix Revolutions', type: 'movie', year: 2003 },
      ],
      total_pages: 1,
    };

    fetchMock
      .mockResolvedValueOnce(buildOkResponse(mockGenres))
      .mockResolvedValueOnce(buildOkResponse(autocompleteResponse))
      .mockResolvedValueOnce(buildOkResponse(searchResponse));

    render(<Home />);

    const main = await screen.findByRole('main');
    expect(main).toBeInTheDocument();

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/genres',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    );

    const queryInput = screen.getByRole('textbox', { name: /search query/i });
    expect(queryInput).toHaveAttribute('aria-autocomplete', 'list');
    expect(queryInput).toHaveAttribute('aria-haspopup', 'listbox');
    expect(queryInput).toHaveAttribute('aria-expanded', 'false');

    await user.type(queryInput, 'Ma');

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/search?mode=autocomplete&query=Ma',
        expect.objectContaining({ signal: expect.any(Object) })
      )
    );

    const listbox = await screen.findByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(queryInput).toHaveAttribute('aria-expanded', 'true');
    expect(within(listbox).getAllByRole('option')).toHaveLength(
      autocompleteResponse.results.length
    );

    await user.type(queryInput, '{enter}');

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('mode=full'),
        expect.objectContaining({ signal: expect.any(Object) })
      )
    );

    await waitFor(() => expect(queryInput).toHaveAttribute('aria-expanded', 'false'));

    const resultsList = await screen.findByRole('list');
    expect(resultsList.querySelectorAll('li')).toHaveLength(searchResponse.results.length);
  });
});
