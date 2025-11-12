import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../app/page';
import { mockGenres } from '../test/mocks';

// Mock fetch
global.fetch = jest.fn();

// Mock components
jest.mock(
  '../app/components/SearchForm',
  () =>
    (props: {
      onAutocompleteRequest: (query: string) => void;
      onSearch: (params: any) => void;
    }) => (
      <div data-testid="search-form">
        <button onClick={() => props.onAutocompleteRequest('test')}>Autocomplete</button>
        <button onClick={() => props.onSearch({ query: 'test' })}>Search</button>
      </div>
    )
);
jest.mock('../app/components/AutocompleteList', () => ({
  AutocompleteList: ({
    items,
    onSelect,
  }: {
    items: { id: number; name: string; media_type: 'movie' | 'tv' }[];
    onSelect: (id: number, type: 'movie' | 'tv') => void;
  }) => (
    <div data-testid="autocomplete-list">
      {items.map((s) => (
        <div key={s.id} onClick={() => onSelect(s.id, s.media_type)}>
          {s.name}
        </div>
      ))}
    </div>
  ),
}));
jest.mock('../app/components/ResultsList', () => ({
  ResultsList: ({
    results,
    onPageChange,
    onSelectResult,
  }: {
    results: { id: number; title: string; type: 'movie' | 'tv' }[];
    onPageChange: (page: number) => void;
    onSelectResult: (result: TMDBResult) => void;
  }) => (
    <div data-testid="results-list">
      {results.map((r) => (
        <div key={r.id} onClick={() => onSelectResult(r)} data-testid="result-item">
          {r.name}
        </div>
      ))}
      <button onClick={() => onPageChange(2)}>Next Page</button>
    </div>
  ),
}));
jest.mock(
  '../app/components/ResultDetails',
  () =>
    ({ title }: { title: { id: number; type: 'movie' | 'tv' } | null }) => (
      <div data-testid="result-details">
        {title ? `Details for ${title.type} ${title.id}` : null}
      </div>
    )
);

describe('Home Page', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render the initial state and fetch genres', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenres,
    });

    render(<Home />);

    expect(
      screen.getByText('Search for a movie or series to see where it’s streaming.')
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/genres');
    await waitFor(() => expect(screen.getByTestId('search-form')).toBeInTheDocument());
  });

  it('should handle autocomplete', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenres,
    });
    const autocompleteSuggestions = [{ id: 1, name: 'Test Movie', media_type: 'movie' }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: autocompleteSuggestions }),
    });

    render(<Home />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres'));

    fireEvent.click(screen.getByText('Autocomplete'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/search?mode=autocomplete&query=test');
      expect(screen.getByTestId('autocomplete-list')).toBeInTheDocument();
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });
  });

  it('should handle full search', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenres,
    });
    const searchResults = {
      results: [{ id: 1, name: 'Test Movie', media_type: 'movie' }],
      page: 1,
      total_pages: 1,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => searchResults,
    });

    render(<Home />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres'));

    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/search?mode=full&query=test&page=1');
      expect(screen.getByTestId('results-list')).toBeInTheDocument();
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });
  });

  it('should handle pagination', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenres,
    });
    const searchResults = {
      results: [{ id: 1, name: 'Test Movie', media_type: 'movie' }],
      page: 1,
      total_pages: 2,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => searchResults,
    });

    render(<Home />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres'));

    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => expect(screen.getByTestId('results-list')).toBeInTheDocument());

    const nextResults = {
      results: [{ id: 2, name: 'Test Movie 2', media_type: 'movie' }],
      page: 2,
      total_pages: 2,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => nextResults,
    });

    fireEvent.click(screen.getByText('Next Page'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/search?mode=full&query=test&page=2');
      expect(screen.getByText('Test Movie 2')).toBeInTheDocument();
    });
  });

  it('should show details for a selected result', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenres,
    });
    const searchResults = {
      results: [{ id: 1, title: 'Test Movie', type: 'movie' }],
      page: 1,
      total_pages: 1,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => searchResults,
    });

    render(<Home />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres'));

    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => expect(screen.getByTestId('results-list')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('result-item'));

    await waitFor(() => {
      expect(screen.getByTestId('result-details')).toHaveTextContent('Details for movie 1');
    });
  });

  it('should show an error message on API failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenres,
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<Home />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres'));

    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(
        screen.getByText('We’re having trouble fetching data right now. Please try again later.')
      ).toBeInTheDocument();
    });
  });

  it('should show a "no results" message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGenres,
    });
    const searchResults = {
      results: [],
      page: 1,
      total_pages: 1,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => searchResults,
    });

    render(<Home />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres'));

    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(
        screen.getByText('No titles found. Please check the spelling or try a different title.')
      ).toBeInTheDocument();
    });
  });
});
