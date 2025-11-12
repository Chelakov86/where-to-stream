'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SearchForm from './components/SearchForm';
import { ResultsList } from './components/ResultsList';
import ResultDetails from './components/ResultDetails';
import ErrorBanner from './components/ErrorBanner';
import { TMDBResult } from './types';
import { useGenres } from './hooks/useGenres';
import { useAutocomplete } from './hooks/useAutocomplete';
import { useSearch } from './hooks/useSearch';

const AUTOCOMPLETE_LIST_ID = 'search-autocomplete-list';

export default function Home() {
  const [selectedTitle, setSelectedTitle] = useState<{ id: number; type: 'movie' | 'tv' } | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resultDetailsRef = useRef<HTMLDivElement | null>(null);

  const showError = useCallback((message: string | null) => setErrorMessage(message), []);
  const clearError = useCallback(() => setErrorMessage(null), []);

  const { genres, isLoading: isGenresLoading, error: genresError } = useGenres();
  const { autocompleteSuggestions, handleAutocompleteRequest, clearAutocomplete } =
    useAutocomplete(showError);
  const { results, page, totalPages, searchQuery, isSearching, handleSearch, handlePageChange } =
    useSearch(showError);

  // Show genres error if present
  useEffect(() => {
    if (genresError) {
      showError(genresError);
    }
  }, [genresError, showError]);

  const handleSearchWithClear = useCallback(
    async (params: Parameters<typeof handleSearch>[0], newPage?: number) => {
      clearAutocomplete();
      setSelectedTitle(null);
      await handleSearch(params, newPage);
    },
    [handleSearch, clearAutocomplete]
  );

  const handleSelectSuggestion = (item: TMDBResult) => {
    clearAutocomplete();
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
        showError(message);
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
        onSearch={handleSearchWithClear}
        autocompleteListId={AUTOCOMPLETE_LIST_ID}
        autocompleteItems={autocompleteSuggestions}
        onAutocompleteSelect={handleSelectSuggestion}
        onAutocompleteClose={clearAutocomplete}
      />
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
