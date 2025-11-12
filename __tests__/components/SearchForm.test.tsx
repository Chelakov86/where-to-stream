import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchForm from '../../app/components/SearchForm';

const mockGenres = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
];

describe('SearchForm', () => {
  it('renders all form fields', () => {
    const handleSearch = jest.fn();
    render(<SearchForm genres={mockGenres} onSearch={handleSearch} />);

    expect(screen.getByPlaceholderText('Search for a movie or series')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('From Year')).toBeInTheDocument();
    expect(screen.getByLabelText('To Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Adventure' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Animation' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Minimum Rating/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('calls onSearch with all form values on submit', () => {
    const handleSearch = jest.fn();
    render(<SearchForm genres={mockGenres} onSearch={handleSearch} />);

    fireEvent.change(screen.getByPlaceholderText('Search for a movie or series'), {
      target: { value: 'Inception' },
    });
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
    fireEvent.change(screen.getByLabelText(/Minimum Rating/), {
      target: { value: '8' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(handleSearch).toHaveBeenCalledWith({
      query: 'Inception',
      type: 'movie',
      yearFrom: 2010,
      yearTo: 2011,
      language: 'en',
      genreIds: [28, 12],
      minRating: 8,
    });
  });

  it('does not call onSearch if query is empty and shows an error', () => {
    const handleSearch = jest.fn();
    render(<SearchForm genres={mockGenres} onSearch={handleSearch} />);

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(handleSearch).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter a search query.')).toBeInTheDocument();
  });

  it('calls onAutocompleteRequest when query changes', () => {
    const handleAutocomplete = jest.fn();
    render(
      <SearchForm
        genres={mockGenres}
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
    render(<SearchForm genres={[]} onSearch={jest.fn()} isGenresLoading />);

    expect(screen.getByText('Loading filters...')).toBeInTheDocument();
  });
});
