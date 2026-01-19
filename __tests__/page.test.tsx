import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../app/page';
import { mockGenres } from '../test/mocks';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return {
    promise,
    resolve,
  };
};

const buildOkResponse = (data: unknown) => ({
  ok: true,
  json: async () => data,
});

const globalErrorMessage = "We're having trouble fetching data right now. Please try again later.";

const scrollIntoViewMock = jest.fn();

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoViewMock,
  });
});

// Mock fetch
global.fetch = jest.fn();

// Mock components with lightweight shells so we can assert behaviour from Home.
jest.mock(
  '../app/components/SearchForm',
  () =>
    ({
      isGenresLoading,
      onAutocompleteRequest,
      onSearch,
      autocompleteItems = [],
    }: {
      isGenresLoading?: boolean;
      onAutocompleteRequest?: (query: string) => void;
      onSearch: (params: any) => void;
      autocompleteItems?: { id: number; title: string; type: 'movie' | 'tv' }[];
    }) => (
      <div data-testid="search-form">
        {isGenresLoading && <span>Loading filters...</span>}
        <button onClick={() => onAutocompleteRequest?.('test')}>Autocomplete</button>
        <button onClick={() => onSearch({ query: 'test' })}>Search</button>
        {autocompleteItems.length > 0 && (
          <div data-testid="autocomplete-list">
            {autocompleteItems.map((item) => (
              <span key={item.id}>{item.title}</span>
            ))}
          </div>
        )}
      </div>
    )
);

jest.mock('../app/components/AutocompleteList', () => ({
  AutocompleteList: ({
    items,
  }: {
    items: { id: number; title: string; type: 'movie' | 'tv' }[];
  }) => (
    <div data-testid="autocomplete-list">
      {items.map((item) => (
        <span key={item.id}>{item.title}</span>
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
    onSelectResult: (result: any) => void;
  }) => (
    <div data-testid="results-list">
      <div>
        {results.map((result) => (
          <button key={result.id} onClick={() => onSelectResult(result)}>
            {result.title}
          </button>
        ))}
      </div>
      <button onClick={() => onPageChange(2)}>Next Page</button>
    </div>
  ),
}));

jest.mock('../app/components/ResultDetails', () => ({
  __esModule: true,
  default: ({
    title,
    onError,
  }: {
    title: { id: number; type: 'movie' | 'tv' } | null;
    onError?: (message: string) => void;
  }) => (
    <div data-testid="result-details">
      {title ? `Details for ${title.type} ${title.id}` : null}
      <button
        type="button"
        onClick={() => onError?.(globalErrorMessage)}
        data-testid="details-error-trigger"
      >
        Simulate details error
      </button>
    </div>
  ),
}));

describe('Home Page', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
    scrollIntoViewMock.mockClear();
  });

  it('shows a loading state while genres are fetching', async () => {
    const deferred = createDeferred<any>();
    (global.fetch as jest.Mock).mockReturnValueOnce(deferred.promise);

    render(<Home />);

    expect(screen.getByText('Loading filters...')).toBeInTheDocument();

    deferred.resolve(buildOkResponse(mockGenres));

    await waitFor(() => {
      expect(screen.queryByText('Loading filters...')).not.toBeInTheDocument();
    });
  });

  it('displays and dismisses a global error when the genres request fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    render(<Home />);

    const banner = await screen.findByText(globalErrorMessage);
    expect(banner).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss error/i }));

    await waitFor(() => {
      expect(screen.queryByText(globalErrorMessage)).not.toBeInTheDocument();
    });
  });

  it('handles autocomplete requests and renders suggestions', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(buildOkResponse(mockGenres))
      .mockResolvedValueOnce(
        buildOkResponse({
          results: [{ id: 1, title: 'Test Movie', type: 'movie' }],
        })
      );

    render(<Home />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres', expect.objectContaining({ signal: expect.any(Object) })));

    fireEvent.click(screen.getByText('Autocomplete'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/search?mode=autocomplete&query=test', expect.objectContaining({ signal: expect.any(Object) }));
      expect(screen.getByTestId('autocomplete-list')).toBeInTheDocument();
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });
  });

  it('shows a searching overlay while a search request is in flight', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(buildOkResponse(mockGenres));

    const searchDeferred = createDeferred<any>();
    (global.fetch as jest.Mock).mockReturnValueOnce(searchDeferred.promise);

    render(<Home />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres', expect.objectContaining({ signal: expect.any(Object) })));

    fireEvent.click(screen.getByText('Search'));

    expect(await screen.findByText('Searching...')).toBeInTheDocument();

    searchDeferred.resolve(
      buildOkResponse({
        results: [{ id: 1, title: 'Loaded Movie', type: 'movie' }],
        total_pages: 1,
      })
    );

    await waitFor(() => {
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('results-list')).toBeInTheDocument();
  });

  it('displays a global error when the search request fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(buildOkResponse(mockGenres))
      .mockResolvedValueOnce({ ok: false });

    render(<Home />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres', expect.objectContaining({ signal: expect.any(Object) })));

    fireEvent.click(screen.getByText('Search'));

    expect(await screen.findByText(globalErrorMessage)).toBeInTheDocument();
  });

  it('shows the no results message when the search completes without titles', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(buildOkResponse(mockGenres))
      .mockResolvedValueOnce(
        buildOkResponse({
          results: [],
          total_pages: 1,
        })
      );

    render(<Home />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres', expect.objectContaining({ signal: expect.any(Object) })));

    fireEvent.click(screen.getByText('Search'));

    expect(
      await screen.findByText(
        'No titles found. Please check the spelling or try a different title.'
      )
    ).toBeInTheDocument();
  });

  it('surfaces a global error when details fetching fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(buildOkResponse(mockGenres))
      .mockResolvedValueOnce(
        buildOkResponse({
          results: [{ id: 42, title: 'Mystery Movie', type: 'movie' }],
          total_pages: 1,
        })
      );

    render(<Home />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres', expect.objectContaining({ signal: expect.any(Object) })));

    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => expect(screen.getByTestId('results-list')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Mystery Movie'));

    fireEvent.click(screen.getByTestId('details-error-trigger'));

    expect(await screen.findByText(globalErrorMessage)).toBeInTheDocument();
  });

  it('scrolls to the details section after selecting a result', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(buildOkResponse(mockGenres))
      .mockResolvedValueOnce(
        buildOkResponse({
          results: [{ id: 42, title: 'Mystery Movie', type: 'movie' }],
          total_pages: 1,
        })
      );

    render(<Home />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/genres', expect.objectContaining({ signal: expect.any(Object) })));

    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => expect(screen.getByTestId('results-list')).toBeInTheDocument());

    scrollIntoViewMock.mockClear();

    fireEvent.click(screen.getByText('Mystery Movie'));

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });
});
