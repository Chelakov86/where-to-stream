import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsList } from '../../app/components/ResultsList';
import { NormalizedSearchResult } from '../../app/types';

const mockResults: NormalizedSearchResult[] = [
  { id: 1, type: 'movie', title: 'Movie 1', year: 2021 },
  { id: 2, type: 'tv', title: 'Series 2', year: 2022 },
  { id: 3, type: 'movie', title: 'Movie 3', year: 2023 },
];

describe('ResultsList', () => {
  it('renders a list of ResultItem components', () => {
    const onPageChange = jest.fn();
    const onSelectResult = jest.fn();
    render(
      <ResultsList
        results={mockResults}
        page={1}
        totalPages={3}
        onPageChange={onPageChange}
        onSelectResult={onSelectResult}
      />
    );

    expect(screen.getByText('Movie 1 (2021)')).toBeInTheDocument();
    expect(screen.getByText('Series 2 (2022)')).toBeInTheDocument();
    expect(screen.getByText('Movie 3 (2023)')).toBeInTheDocument();
  });

  it('calls onPageChange with the next page number when "Next" is clicked', () => {
    const onPageChange = jest.fn();
    const onSelectResult = jest.fn();
    render(
      <ResultsList
        results={mockResults}
        page={1}
        totalPages={3}
        onPageChange={onPageChange}
        onSelectResult={onSelectResult}
      />
    );

    fireEvent.click(screen.getByText('Next'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with the previous page number when "Previous" is clicked', () => {
    const onPageChange = jest.fn();
    const onSelectResult = jest.fn();
    render(
      <ResultsList
        results={mockResults}
        page={2}
        totalPages={3}
        onPageChange={onPageChange}
        onSelectResult={onSelectResult}
      />
    );

    fireEvent.click(screen.getByText('Previous'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('disables the "Previous" button on the first page', () => {
    const onPageChange = jest.fn();
    const onSelectResult = jest.fn();
    render(
      <ResultsList
        results={mockResults}
        page={1}
        totalPages={3}
        onPageChange={onPageChange}
        onSelectResult={onSelectResult}
      />
    );

    expect(screen.getByText('Previous')).toBeDisabled();
  });

  it('disables the "Next" button on the last page', () => {
    const onPageChange = jest.fn();
    const onSelectResult = jest.fn();
    render(
      <ResultsList
        results={mockResults}
        page={3}
        totalPages={3}
        onPageChange={onPageChange}
        onSelectResult={onSelectResult}
      />
    );

    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('renders a message when there are no results', () => {
    const onPageChange = jest.fn();
    const onSelectResult = jest.fn();
    render(
      <ResultsList
        results={[]}
        page={1}
        totalPages={1}
        onPageChange={onPageChange}
        onSelectResult={onSelectResult}
      />
    );

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('calls onSelectResult when a result item is clicked', () => {
    const onPageChange = jest.fn();
    const onSelectResult = jest.fn();
    render(
      <ResultsList
        results={mockResults}
        page={1}
        totalPages={3}
        onPageChange={onPageChange}
        onSelectResult={onSelectResult}
      />
    );

    fireEvent.click(screen.getAllByText('Details')[0]);
    expect(onSelectResult).toHaveBeenCalledWith(mockResults[0]);
  });
});
