'use client';

import { useState, useEffect, useCallback } from 'react';
import SearchForm from './components/SearchForm';
import { ResultsList } from './components/ResultsList';
import DetailsSidebar from './components/DetailsSidebar';
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
  const [isSearchFormCollapsed, setIsSearchFormCollapsed] = useState(false);

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
      setIsSearchFormCollapsed(true);
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

  const handleCloseDetails = useCallback(() => {
    setSelectedTitle(null);
  }, []);

  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-8">
      {errorMessage && <ErrorBanner message={errorMessage} onDismiss={handleDismissError} />}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-accent-primary">
        WhereToStream
      </h1>
      <p className="mt-3 sm:mt-4 text-sm sm:text-base text-text-secondary">
        Find where your favorite movies and TV shows are streaming
      </p>
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
        isCollapsed={isSearchFormCollapsed}
        onToggleCollapse={() => setIsSearchFormCollapsed(false)}
        lastSearchQuery={searchQuery?.query ?? ''}
      />
      <SearchHistory
        history={history}
        onSelectTitle={handleSelectHistoryItem}
        onRemoveItem={removeFromHistory}
        onClearHistory={clearHistory}
      />

      {/* Split-panel layout: left = results, right = details (desktop only) */}
      <div className="mt-8 lg:flex lg:gap-6 lg:items-start">
        {/* Left: results list */}
        <div className="lg:flex-1 lg:min-w-0">
          <section className="relative min-h-[3rem]">
            {isSearching && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-midnight-plum-end/80 backdrop-blur-sm text-lg font-semibold text-white">
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
                selectedTitle={selectedTitle}
              />
            ) : shouldShowNoResults ? (
              <p className="mt-4 text-cream-text/70">
                No titles found. Please check the spelling or try a different title.
              </p>
            ) : shouldShowInitialPrompt ? (
              <p className="mt-4 text-cream-text/70">
                Search for a movie or series to see where it&apos;s streaming.
              </p>
            ) : null}
          </section>
        </div>

        {/* Right: inline details panel — desktop only */}
        <div className="hidden lg:block lg:w-[44%] lg:flex-shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          {selectedTitle ? (
            <ResultDetails title={selectedTitle} onError={handleDetailsError} />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 glass-panel rounded-xl text-cream-text/40 text-center p-8">
              <span className="text-4xl mb-3">🎬</span>
              <p className="text-base">Select a title to see where it streams</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile/tablet overlay — hidden on lg+ */}
      <div className="lg:hidden">
        <DetailsSidebar
          selectedTitle={selectedTitle}
          onClose={handleCloseDetails}
          onError={handleDetailsError}
        />
      </div>
    </main>
  );
}
