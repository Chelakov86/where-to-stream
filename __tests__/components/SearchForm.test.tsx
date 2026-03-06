import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SearchForm from '../../app/components/SearchForm';
import { saveFilterState, clearFilterState } from '../../app/utils/filterStorage';

const mockGenres = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
];

const mockProviders = [
  { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 0 },
  { provider_id: 9, provider_name: 'Amazon Prime Video', logo_path: '/prime.jpg', display_priority: 1 },
  { provider_id: 337, provider_name: 'Disney Plus', logo_path: '/disney.jpg', display_priority: 2 },
];

describe('SearchForm', () => {
  it('renders all form fields', () => {
    const handleSearch = jest.fn();
    render(
      <SearchForm
        genres={mockGenres}
        providers={mockProviders}
        onSearch={handleSearch}
        watchRegion="US"
      />
    );

    expect(screen.getByPlaceholderText('Search for a movie or series')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show search filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();

    // Filters are hidden by default, so click to show them
    fireEvent.click(screen.getByRole('button', { name: /Show search filters/i }));

    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('From Year')).toBeInTheDocument();
    expect(screen.getByLabelText('To Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Adventure' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Animation' })).toBeInTheDocument();
    expect(screen.getByTitle('Netflix')).toBeInTheDocument();
    expect(screen.getByLabelText(/Streaming Availability by Country/i)).toBeInTheDocument();
  });

  it('associates the query input with its accessible label', () => {
    const handleSearch = jest.fn();
    render(<SearchForm genres={mockGenres} providers={mockProviders} onSearch={handleSearch} />);

    expect(screen.getByRole('textbox', { name: /search query/i })).toBeInTheDocument();
  });

  it('calls onSearch with all form values on submit', () => {
    const handleSearch = jest.fn();
    const handleWatchRegionChange = jest.fn();
    render(
      <SearchForm
        genres={mockGenres}
        providers={mockProviders}
        onSearch={handleSearch}
        watchRegion="US"
        onWatchRegionChange={handleWatchRegionChange}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search for a movie or series'), {
      target: { value: 'Inception' },
    });

    // Show filters first
    fireEvent.click(screen.getByRole('button', { name: /Show search filters/i }));

    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'movie' },
    });
    fireEvent.change(screen.getByLabelText('From Year'), {
      target: { value: '2010' },
    });
    fireEvent.change(screen.getByLabelText('To Year'), {
      target: { value: '2011' },
    });
    fireEvent.change(screen.getByLabelText('Language'), {
      target: { value: 'en' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Action' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Adventure' }));
    fireEvent.click(screen.getByTitle('Netflix'));

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(handleSearch).toHaveBeenCalledWith({
      query: 'Inception',
      type: 'movie',
      yearFrom: 2010,
      yearTo: 2011,
      language: 'en',
      genreIds: [28, 12],
      providerIds: [8],
      watchRegion: 'US',
    });
  });

  it('submits the search when pressing Enter on the query input', async () => {
    const handleSearch = jest.fn();
    const user = userEvent.setup();
    render(<SearchForm genres={mockGenres} providers={mockProviders} onSearch={handleSearch} />);

    const queryInput = screen.getByRole('textbox', { name: /search query/i });
    await user.type(queryInput, 'Inception{enter}');

    expect(handleSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'Inception',
      })
    );
  });

  it('does not call onSearch if query is empty and shows an error', () => {
    const handleSearch = jest.fn();
    render(<SearchForm genres={mockGenres} providers={mockProviders} onSearch={handleSearch} />);

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(handleSearch).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter a search query.')).toBeInTheDocument();
  });

  it('calls onAutocompleteRequest when query changes', () => {
    const handleAutocomplete = jest.fn();
    render(
      <SearchForm
        genres={mockGenres}
        providers={mockProviders}
        onSearch={jest.fn()}
        onAutocompleteRequest={handleAutocomplete}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search for a movie or series'), {
      target: { value: 'Matrix' },
    });

    expect(handleAutocomplete).toHaveBeenCalledWith('Matrix');
  });

  it('shows a loading state for filters when genres are loading', () => {
    render(<SearchForm genres={[]} providers={[]} onSearch={jest.fn()} isGenresLoading />);

    // Show filters first
    fireEvent.click(screen.getByRole('button', { name: /Show search filters/i }));

    expect(screen.getByText('Loading filters...')).toBeInTheDocument();
  });

  it('exposes autocomplete aria attributes when autocomplete props are provided', () => {
    const handleSearch = jest.fn();
    const mockItems = [{ id: 1, type: 'movie' as const, title: 'Test Movie', year: 2020 }];
    render(
      <SearchForm
        genres={mockGenres}
        providers={mockProviders}
        onSearch={handleSearch}
        autocompleteListId="test-list"
        autocompleteItems={mockItems}
        onAutocompleteSelect={jest.fn()}
        onAutocompleteClose={jest.fn()}
      />
    );

    const queryInput = screen.getByRole('textbox', { name: /search query/i });
    expect(queryInput).toHaveAttribute('aria-controls', 'test-list');
    expect(queryInput).toHaveAttribute('aria-expanded', 'true');
    expect(queryInput).toHaveAttribute('aria-haspopup', 'listbox');
    expect(queryInput).toHaveAttribute('aria-autocomplete', 'list');
  });

  describe('Persistent Filter State', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('loads saved filter state from localStorage on mount', async () => {
      const handleWatchRegionChange = jest.fn();

      // Save filter state to localStorage
      saveFilterState({
        selectedType: 'movie',
        yearFrom: '2020',
        yearTo: '2024',
        selectedLanguage: 'en',
        selectedGenres: [28],
        selectedProviders: [8],
        watchRegion: 'US',
      });

      render(
        <SearchForm
          genres={mockGenres}
          providers={mockProviders}
          onSearch={jest.fn()}
          onWatchRegionChange={handleWatchRegionChange}
          watchRegion="US"
        />
      );

      // Show filters
      fireEvent.click(screen.getByRole('button', { name: /Show search filters/i }));

      // Verify filters were loaded
      await waitFor(() => {
        expect(screen.getByLabelText('Type')).toHaveValue('movie');
        expect(screen.getByLabelText('From Year')).toHaveValue(2020);
        expect(screen.getByLabelText('To Year')).toHaveValue(2024);
        expect(screen.getByLabelText('Language')).toHaveValue('en');
        expect(screen.getByRole('checkbox', { name: 'Action' })).toBeChecked();
        expect(screen.getByTitle('Netflix')).toHaveAttribute('aria-pressed', 'true');
      });

      // Verify parent was notified of watch region
      expect(handleWatchRegionChange).toHaveBeenCalledWith('US');
    });

    it('saves filter state to localStorage when filters change', async () => {
      render(
        <SearchForm
          genres={mockGenres}
          providers={mockProviders}
          onSearch={jest.fn()}
          watchRegion="US"
        />
      );

      // Show filters
      fireEvent.click(screen.getByRole('button', { name: /Show search filters/i }));

      // Change some filters
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'tv' } });
      fireEvent.change(screen.getByLabelText('From Year'), { target: { value: '2015' } });
      fireEvent.click(screen.getByRole('checkbox', { name: 'Action' }));

      // Verify state was saved to localStorage
      await waitFor(() => {
        const saved = localStorage.getItem('whereToStream:filterState');
        expect(saved).toBeTruthy();
        const parsed = JSON.parse(saved!);
        expect(parsed.selectedType).toBe('tv');
        expect(parsed.yearFrom).toBe('2015');
        expect(parsed.selectedGenres).toContain(28);
      });
    });

    it('clears localStorage when "Clear all filters" is clicked', async () => {
      const handleWatchRegionChange = jest.fn();

      // Pre-populate some filter state
      saveFilterState({
        selectedType: 'movie',
        yearFrom: '2020',
        yearTo: '2024',
        selectedLanguage: 'en',
        selectedGenres: [28],
        selectedProviders: [8],
        watchRegion: 'US',
      });

      render(
        <SearchForm
          genres={mockGenres}
          providers={mockProviders}
          onSearch={jest.fn()}
          onWatchRegionChange={handleWatchRegionChange}
          watchRegion="US"
        />
      );

      // Show filters
      fireEvent.click(screen.getByRole('button', { name: /Show search filters/i }));

      // Wait for filters to load
      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: 'Action' })).toBeChecked();
      });

      // Click "Clear all filters" button
      const clearButton = screen.getByRole('button', { name: /Clear all filters/i });
      fireEvent.click(clearButton);

      // Verify filters are cleared
      await waitFor(() => {
        expect(screen.getByLabelText('Type')).toHaveValue('all');
        expect(screen.getByLabelText('From Year')).toHaveValue(null);
        expect(screen.getByLabelText('To Year')).toHaveValue(null);
        expect(screen.getByLabelText('Language')).toHaveValue('');
        expect(screen.getByRole('checkbox', { name: 'Action' })).not.toBeChecked();
      });

      // Verify localStorage was cleared to default state
      const saved = localStorage.getItem('whereToStream:filterState');
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved!);
      expect(parsed.selectedType).toBe('all');
      expect(parsed.yearFrom).toBe('');
      expect(parsed.selectedGenres).toEqual([]);
    });

    it('does not load filter state if localStorage is empty', () => {
      const handleWatchRegionChange = jest.fn();

      render(
        <SearchForm
          genres={mockGenres}
          providers={mockProviders}
          onSearch={jest.fn()}
          onWatchRegionChange={handleWatchRegionChange}
        />
      );

      // Show filters
      fireEvent.click(screen.getByRole('button', { name: /Show search filters/i }));

      // Verify default values
      expect(screen.getByLabelText('Type')).toHaveValue('all');
      expect(screen.getByLabelText('From Year')).toHaveValue(null);
      expect(screen.getByLabelText('Language')).toHaveValue('');
    });
  });
});
