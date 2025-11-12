'use client';

import { useState, useEffect, useCallback } from 'react';
import SearchForm from './components/SearchForm';
import { AutocompleteList } from './components/AutocompleteList';
import { ResultsList } from './components/ResultsList';
import ResultDetails from './components/ResultDetails';
import { Genre, SearchParams, TMDBResult } from './types';

export default function Home() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<TMDBResult[]>([]);
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTitle, setSelectedTitle] = useState<{ id: number; type: 'movie' | 'tv' } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<SearchParams | null>(null);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch('/api/genres');
        if (!response.ok) {
          throw new Error('Failed to fetch genres');
        }
        const data = await response.json();
        setGenres(data);
      } catch (err) {
        setError('We’re having trouble fetching data right now. Please try again later.');
      }
    };
    fetchGenres();
  }, []);

  const handleAutocompleteRequest = useCallback(async (query: string) => {
    if (query.length < 2) {
      setAutocompleteSuggestions([]);
      return;
    }
    try {
      const response = await fetch(`/api/search?mode=autocomplete&query=${query}`);
      if (!response.ok) {
        throw new Error('Failed to fetch autocomplete suggestions');
      }
      const data = await response.json();
      setAutocompleteSuggestions(data.results);
    } catch (err) {
      setError('We’re having trouble fetching data right now. Please try again later.');
    }
  }, []);

  const handleSearch = useCallback(async (params: SearchParams, newPage = 1) => {
    setAutocompleteSuggestions([]);
    setSelectedTitle(null);
    setSearchQuery(params);
    setPage(newPage);

    const queryParams = new URLSearchParams({
      mode: 'full',
      ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
      page: String(newPage),
    });

    try {
      const response = await fetch(`/api/search?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      const data = await response.json();
      setResults(data.results);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError('We’re having trouble fetching data right now. Please try again later.');
    }
  }, []);

  const handlePageChange = (nextPage: number) => {
    if (searchQuery) {
      handleSearch(searchQuery, nextPage);
    }
  };

  const handleSelectSuggestion = (item: TMDBResult) => {
    setAutocompleteSuggestions([]);
    setSelectedTitle({ id: item.id, type: item.type });
  };

  const handleSelectResult = (result: TMDBResult) => {
    setSelectedTitle({ id: result.id, type: result.type });
  };

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold text-accent-primary">WhereToStream</h1>
      <p className="mt-4 text-text-secondary">
        Find where your favorite movies and TV shows are streaming
      </p>
      <SearchForm
        genres={genres}
        onAutocompleteRequest={handleAutocompleteRequest}
        onSearch={handleSearch}
      />
      {error && <p className="mt-4 text-red-500">{error}</p>}
      {autocompleteSuggestions.length > 0 && (
        <AutocompleteList
          items={autocompleteSuggestions}
          isOpen={true}
          onSelect={handleSelectSuggestion}
          onClose={() => setAutocompleteSuggestions([])}
        />
      )}
      {selectedTitle && <ResultDetails title={selectedTitle} />}
      {results.length > 0 ? (
        <ResultsList
          results={results}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onSelectResult={handleSelectResult}
        />
      ) : searchQuery && !error ? (
        <p className="mt-4">No titles found. Please check the spelling or try a different title.</p>
      ) : (
        !searchQuery &&
        !error && <p className="mt-4">Search for a movie or series to see where it’s streaming.</p>
      )}
    </main>
  );
}
