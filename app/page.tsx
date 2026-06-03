'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SearchForm from './components/SearchForm';
import { ResultsList } from './components/ResultsList';
import ResultDetails from './components/ResultDetails';
import ErrorBanner from './components/ErrorBanner';
import SearchHistory from './components/SearchHistory';
import { TMDBResult, SearchParams } from './types';
import { useGenres } from './hooks/useGenres';
import { useProviders } from './hooks/useProviders';
import { useAutocomplete } from './hooks/useAutocomplete';
import { useSearch } from './hooks/useSearch';
import { useSearchHistory } from './hooks/useSearchHistory';

const AUTOCOMPLETE_LIST_ID = 'search-autocomplete-list';

export default function Home() {
  const [selectedTitle, setSelectedTitle] = useState<{ id: number; type: 'movie' | 'tv' } | null>(
    null
  );
  const [watchRegion, setWatchRegion] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resultDetailsRef = useRef<HTMLDivElement | null>(null);

  const showError = useCallback((message: string | null) => setErrorMessage(message), []);
  const clearError = useCallback(() => setErrorMessage(null), []);

  const { genres, isLoading: isGenresLoading, error: genresError } = useGenres();
  const {
    providers,
    isLoading: isProvidersLoading,
    error: providersError,
  } = useProviders(watchRegion);
  const { autocompleteSuggestions, handleAutocompleteRequest, clearAutocomplete } =
    useAutocomplete(showError);
  const { history, addToHistory, clearHistory, removeFromHistory } = useSearchHistory();
  const { results, page, totalPages, searchQuery, isSearching, handleSearch, handlePageChange } =
    useSearch(showError);

  const genreNamesById = useMemo(
    () =>
      genres.reduce<Record<number, string>>((acc, genre) => {
        acc[genre.id] = genre.name;
        return acc;
      }, {}),
    [genres]
  );

  // Show genres or providers error if present
  useEffect(() => {
    if (genresError) {
      showError(genresError);
    } else if (providersError) {
      showError(providersError);
    }
  }, [genresError, providersError, showError]);

  const handleSearchWithClear = useCallback(
    async (params: Parameters<typeof handleSearch>[0], newPage?: number) => {
      clearAutocomplete();
      setSelectedTitle(null);
      await handleSearch(params, newPage);
    },
    [handleSearch, clearAutocomplete]
  );

  const handleSelectHistoryItem = useCallback(
    (id: number, type: 'movie' | 'tv') => {
      // Find the history item to get title and year
      const historyItem = history.find((item) => item.id === id && item.type === type);
      if (historyItem) {
        // Add to history again (will move to top)
        addToHistory(historyItem.id, historyItem.type, historyItem.title, historyItem.year);
      }
      setSelectedTitle({ id, type });
    },
    [history, addToHistory]
  );

  const handleSelectSuggestion = (item: TMDBResult) => {
    clearAutocomplete();
    setSelectedTitle({ id: item.id, type: item.type });
    // Add to history when selecting a suggestion
    addToHistory(item.id, item.type, item.title, item.year);
  };

  const handleSelectResult = (result: TMDBResult) => {
    setSelectedTitle({ id: result.id, type: result.type });
    // Add to history when selecting a result
    addToHistory(result.id, result.type, result.title, result.year);
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
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {errorMessage && <ErrorBanner message={errorMessage} onDismiss={handleDismissError} />}
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <div>
            <div className="max-w-3xl">
              <h1 className="text-balance text-4xl font-black tracking-normal text-text sm:text-5xl md:text-6xl">
                WhereToStream
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
                Find where your favorite movies and TV shows are streaming before the trailer ends.
              </p>
            </div>
            <div className="mt-7">
              <SearchForm
                genres={genres}
                providers={providers}
                isGenresLoading={isGenresLoading}
                isProvidersLoading={isProvidersLoading}
                onAutocompleteRequest={handleAutocompleteRequest}
                onSearch={handleSearchWithClear}
                watchRegion={watchRegion}
                onWatchRegionChange={setWatchRegion}
                autocompleteListId={AUTOCOMPLETE_LIST_ID}
                autocompleteItems={autocompleteSuggestions}
                onAutocompleteSelect={handleSelectSuggestion}
                onAutocompleteClose={clearAutocomplete}
              />
            </div>
          </div>
          <SearchHistory
            history={history}
            onSelectTitle={handleSelectHistoryItem}
            onRemoveItem={removeFromHistory}
            onClearHistory={clearHistory}
          />
        </section>

        <div className="mt-10 space-y-10">
          <div ref={resultDetailsRef}>
            {selectedTitle && <ResultDetails title={selectedTitle} onError={handleDetailsError} />}
          </div>
          <section className="relative min-h-[8rem]">
            {isSearching && (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-xl border border-accent-primary/20 bg-background/[0.85] text-sm font-black uppercase tracking-[0.18em] text-accent-primary shadow-2xl shadow-black/40 backdrop-blur-md">
                Searching...
              </div>
            )}
            {isSearching || results.length > 0 ? (
              <ResultsList
                results={results}
                page={page}
                totalPages={totalPages}
                isLoading={isSearching}
                onPageChange={handlePageChange}
                onSelectResult={handleSelectResult}
                genreNamesById={genreNamesById}
              />
            ) : shouldShowNoResults ? (
              <div className="max-w-xl border-l border-accent-primary/40 py-2 pl-5">
                <p className="text-lg font-bold text-text">
                  No titles found. Please check the spelling or try a different title.
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Shorter queries usually work better for older films, foreign-language releases,
                  and alternate titles.
                </p>
              </div>
            ) : shouldShowInitialPrompt ? (
              <div className="max-w-xl border-l border-white/15 py-2 pl-5">
                <p className="text-lg font-bold text-text">
                  Search for a movie or series to see where it&apos;s streaming.
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Start with the title, then refine by country, service, year, or format only if the
                  first answer is noisy.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
