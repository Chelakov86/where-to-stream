'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import SearchForm from './components/SearchForm';
import { AutocompleteList } from './components/AutocompleteList';
import { ResultsList } from './components/ResultsList';
import ResultDetails from './components/ResultDetails';
import ErrorBanner from './components/ErrorBanner';
import { Genre, SearchParams, TMDBResult } from './types';

const GLOBAL_ERROR_MESSAGE =
  'We’re having trouble fetching data right now. Please try again later.';

export default function Home() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isGenresLoading, setIsGenresLoading] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<TMDBResult[]>([]);
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTitle, setSelectedTitle] = useState<{ id: number; type: 'movie' | 'tv' } | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<SearchParams | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const resultDetailsRef = useRef<HTMLDivElement | null>(null);

  const clearError = useCallback(() => setErrorMessage(null), []);
  const showError = useCallback((message: string) => setErrorMessage(message), []);

  useEffect(() => {
    const fetchGenres = async () => {
      setIsGenresLoading(true);
      try {
        const response = await fetch('/api/genres');
        if (!response.ok) {
          throw new Error('Failed to fetch genres');
        }
        const data = await response.json();
        setGenres(data);
        clearError();
      } catch (err) {
        showError(GLOBAL_ERROR_MESSAGE);
      } finally {
        setIsGenresLoading(false);
      }
    };
    fetchGenres();
  }, [clearError, showError]);

  const handleAutocompleteRequest = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setAutocompleteSuggestions([]);
        return;
      }
      try {
        const response = await fetch(
          `/api/search?mode=autocomplete&query=${encodeURIComponent(query)}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch autocomplete suggestions');
        }
        const data = await response.json();
        setAutocompleteSuggestions(data.results);
      } catch (err) {
        setAutocompleteSuggestions([]);
        showError(GLOBAL_ERROR_MESSAGE);
      }
    },
    [showError]
  );

  const handleSearch = useCallback(
    async (params: SearchParams, newPage = 1) => {
      setAutocompleteSuggestions([]);
      setSelectedTitle(null);
      setSearchQuery(params);
      setPage(newPage);
      setIsSearching(true);

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
        setResults(Array.isArray(data.results) ? data.results : []);
        setTotalPages(typeof data.total_pages === 'number' ? data.total_pages : 1);
        clearError();
      } catch (err) {
        setResults([]);
        setTotalPages(1);
        showError(GLOBAL_ERROR_MESSAGE);
      } finally {
        setIsSearching(false);
      }
    },
    [clearError, showError]
  );

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

  const handleDismissError = () => {
    clearError();
  };

  const handleDetailsError = useCallback(
    (message: string | null) => {
      if (message) {
        showError(GLOBAL_ERROR_MESSAGE);
      } else {
        clearError();
      }
    },
    [clearError, showError]
  );

  const shouldShowInitialPrompt = !searchQuery && !isSearching && !errorMessage;
  const shouldShowNoResults = searchQuery && !isSearching && results.length === 0 && !errorMessage;

  useEffect(() => {
    if (!selectedTitle) {
      return;
    }
    const node = resultDetailsRef.current;
    if (!node) {
      return;
    }
    const scroll = () => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(scroll);
    } else {
      scroll();
    }
  }, [selectedTitle]);

  return (
    <main className="min-h-screen p-8">
      {errorMessage && <ErrorBanner message={errorMessage} onDismiss={handleDismissError} />}
      <h1 className="text-4xl font-bold text-accent-primary">WhereToStream</h1>
      <p className="mt-4 text-text-secondary">
        Find where your favorite movies and TV shows are streaming
      </p>
      <SearchForm
        genres={genres}
        isGenresLoading={isGenresLoading}
        onAutocompleteRequest={handleAutocompleteRequest}
        onSearch={handleSearch}
      />
      {autocompleteSuggestions.length > 0 && (
        <AutocompleteList
          items={autocompleteSuggestions}
          isOpen={true}
          onSelect={handleSelectSuggestion}
          onClose={() => setAutocompleteSuggestions([])}
        />
      )}
      <div className="mt-8 space-y-8">
        <div ref={resultDetailsRef}>
          {selectedTitle && <ResultDetails title={selectedTitle} onError={handleDetailsError} />}
        </div>
        <section className="relative min-h-[3rem]">
          {isSearching && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-gray-900/80 text-lg font-semibold text-white">
              Searching...
            </div>
          )}
          {results.length > 0 ? (
            <ResultsList
              results={results}
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onSelectResult={handleSelectResult}
            />
          ) : shouldShowNoResults ? (
            <p className="mt-4 text-gray-300">
              No titles found. Please check the spelling or try a different title.
            </p>
          ) : shouldShowInitialPrompt ? (
            <p className="mt-4 text-gray-300">
              Search for a movie or series to see where it’s streaming.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
