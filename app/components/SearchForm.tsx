import React, { useState, useEffect, useRef } from 'react';
import { AutocompleteList, AutocompleteItem } from './AutocompleteList';
import { COUNTRY_NAMES } from '@/app/utils/countries';
import { buildTmdbImageUrl } from '@/app/utils/tmdb';
import { loadFilterState, saveFilterState } from '@/app/utils/filterStorage';

interface SearchFormProps {
  genres: { id: number; name: string }[];
  providers: { provider_id: number; provider_name: string; logo_path: string }[];
  onSearch: (params: {
    query: string;
    type: 'movie' | 'tv' | 'all';
    yearFrom?: number;
    yearTo?: number;
    language?: string;
    genreIds?: number[];
    providerIds?: number[];
    watchRegion?: string;
  }) => void;
  onAutocompleteRequest?: (query: string) => void;
  isGenresLoading?: boolean;
  isProvidersLoading?: boolean;
  watchRegion?: string;
  onWatchRegionChange?: (region: string) => void;
  autocompleteListId?: string;
  autocompleteItems?: AutocompleteItem[];
  onAutocompleteSelect?: (item: AutocompleteItem) => void;
  onAutocompleteClose?: () => void;
}

const SearchForm: React.FC<SearchFormProps> = ({
  genres,
  providers,
  onSearch,
  onAutocompleteRequest,
  isGenresLoading = false,
  isProvidersLoading = false,
  watchRegion = '',
  onWatchRegionChange,
  autocompleteListId,
  autocompleteItems = [],
  onAutocompleteSelect,
  onAutocompleteClose,
}) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<number[]>([]);
  const [selectedType, setSelectedType] = useState<'movie' | 'tv' | 'all'>('all');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const previousWatchRegion = useRef<string>(watchRegion);
  const errorMessageId = 'search-form-query-error';

  // Calculate active filter count
  const activeFilterCount =
    (selectedType !== 'all' ? 1 : 0) +
    (yearFrom ? 1 : 0) +
    (yearTo ? 1 : 0) +
    (selectedLanguage ? 1 : 0) +
    selectedGenres.length +
    selectedProviders.length +
    (watchRegion ? 1 : 0);

  // Load saved filter state on mount
  useEffect(() => {
    const savedState = loadFilterState();
    if (savedState) {
      setSelectedType(savedState.selectedType);
      setYearFrom(savedState.yearFrom);
      setYearTo(savedState.yearTo);
      setSelectedLanguage(savedState.selectedLanguage);
      setSelectedGenres(savedState.selectedGenres);
      setSelectedProviders(savedState.selectedProviders);
      // Notify parent of saved watch region
      if (savedState.watchRegion && onWatchRegionChange) {
        previousWatchRegion.current = savedState.watchRegion;
        onWatchRegionChange(savedState.watchRegion);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Save filter state to localStorage whenever it changes
  useEffect(() => {
    const filterState = {
      selectedType,
      yearFrom,
      yearTo,
      selectedLanguage,
      selectedGenres,
      selectedProviders,
      watchRegion,
    };
    saveFilterState(filterState);
  }, [
    selectedType,
    yearFrom,
    yearTo,
    selectedLanguage,
    selectedGenres,
    selectedProviders,
    watchRegion,
  ]);

  useEffect(() => {
    if (autocompleteItems.length === 0) {
      setHighlightedIndex(-1);
    }
  }, [autocompleteItems.length]);

  // Clear selected providers when watch region changes
  useEffect(() => {
    if (previousWatchRegion.current !== watchRegion) {
      setSelectedProviders([]);
      previousWatchRegion.current = watchRegion;
    }
  }, [watchRegion]);

  // Handle click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        onAutocompleteClose
      ) {
        onAutocompleteClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onAutocompleteClose]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      setError('Please enter a search query.');
      return;
    }
    setError(null);

    const formData = new FormData(event.currentTarget);
    const selectedGenreIds = formData.getAll('genre').map((id) => parseInt(id as string, 10));
    const selectedProviderIds = formData.getAll('provider').map((id) => parseInt(id as string, 10));

    onSearch({
      query: formData.get('query') as string,
      type: formData.get('type') as 'movie' | 'tv' | 'all',
      yearFrom: Number(formData.get('yearFrom')) || undefined,
      yearTo: Number(formData.get('yearTo')) || undefined,
      language: formData.get('language') as string,
      genreIds: selectedGenreIds.length > 0 ? selectedGenreIds : undefined,
      providerIds: selectedProviderIds.length > 0 ? selectedProviderIds : undefined,
      watchRegion: watchRegion || undefined,
    });
  };

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setQuery(newQuery);
    setHighlightedIndex(-1);
    if (onAutocompleteRequest) {
      onAutocompleteRequest(newQuery);
    }
    if (error && newQuery.trim()) {
      setError(null);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (autocompleteItems.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prevIndex) =>
          prevIndex < autocompleteItems.length - 1 ? prevIndex + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : autocompleteItems.length - 1
        );
        break;
      case 'Enter':
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < autocompleteItems.length &&
          onAutocompleteSelect
        ) {
          event.preventDefault();
          onAutocompleteSelect(autocompleteItems[highlightedIndex]);
        }
        break;
      case 'Escape':
        if (onAutocompleteClose) {
          event.preventDefault();
          onAutocompleteClose();
        }
        break;
    }
  };

  const handleClearFilters = () => {
    setSelectedType('all');
    setYearFrom('');
    setYearTo('');
    setSelectedLanguage('');
    setSelectedGenres([]);
    setSelectedProviders([]);
    if (onWatchRegionChange) {
      onWatchRegionChange('');
    }
    // Clear persisted state as well
    saveFilterState({
      selectedType: 'all',
      yearFrom: '',
      yearTo: '',
      selectedLanguage: '',
      selectedGenres: [],
      selectedProviders: [],
      watchRegion: '',
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-3 sm:p-4 bg-gray-800 text-white rounded-lg"
    >
      <div ref={wrapperRef} className="relative">
        <label htmlFor="query" className="sr-only">
          Search for a movie or series
        </label>
        <input
          ref={inputRef}
          id="query"
          name="query"
          type="text"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleInputKeyDown}
          placeholder="Search for a movie or series"
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded placeholder-gray-300"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={autocompleteListId}
          aria-expanded={autocompleteItems.length > 0}
          aria-describedby={error ? errorMessageId : undefined}
          autoComplete="off"
          aria-label="Search query"
        />
        {error && (
          <p id={errorMessageId} className="text-red-500 text-sm mt-1" role="alert">
            {error}
          </p>
        )}
        {autocompleteItems.length > 0 && onAutocompleteSelect && onAutocompleteClose && (
          <div className="mt-1 border border-gray-600 rounded bg-gray-800">
            <AutocompleteList
              id={autocompleteListId}
              items={autocompleteItems}
              isOpen={true}
              onSelect={onAutocompleteSelect}
              onClose={onAutocompleteClose}
              highlightedIndex={highlightedIndex}
              onHighlightChange={setHighlightedIndex}
            />
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded font-medium text-sm flex items-center justify-between"
          aria-expanded={showFilters}
          aria-controls="filter-section"
          aria-label={showFilters ? 'Hide search filters' : 'Show search filters'}
        >
          <span className="flex items-center gap-2">
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </span>
          <span className="text-lg">{showFilters ? '−' : '+'}</span>
        </button>
      </div>

      <div id="filter-section" className={`space-y-5 ${showFilters ? '' : 'hidden'}`}>
        {/* Basic Filters */}
        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Basic Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium">
                Type
              </label>
              <select
                id="type"
                name="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'movie' | 'tv' | 'all')}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
                aria-label="Filter by content type"
              >
                <option value="all">All</option>
                <option value="movie">Movies only</option>
                <option value="tv">Series only</option>
              </select>
            </div>

            <div>
              <label htmlFor="yearFrom" className="block text-sm font-medium">
                From Year
              </label>
              <input
                id="yearFrom"
                name="yearFrom"
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder="2000"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded placeholder-gray-300"
                aria-label="Filter by start year"
              />
            </div>

            <div>
              <label htmlFor="yearTo" className="block text-sm font-medium">
                To Year
              </label>
              <input
                id="yearTo"
                name="yearTo"
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder="2024"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded placeholder-gray-300"
                aria-label="Filter by end year"
              />
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium">
                Language
              </label>
              <select
                id="language"
                name="language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
                aria-label="Filter by language"
              >
                <option value="">Any</option>
                <option value="en">EN</option>
                <option value="de">DE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Genres */}
        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
          <label className="block text-sm font-semibold text-gray-300 mb-2">Genres</label>
          {isGenresLoading ? (
            <p className="mt-2 text-sm text-gray-400">Loading filters...</p>
          ) : Array.isArray(genres) && genres.length > 0 ? (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
              {genres.map((genre) => (
                <label key={genre.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="genre"
                    value={genre.id}
                    checked={selectedGenres.includes(genre.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGenres([...selectedGenres, genre.id]);
                      } else {
                        setSelectedGenres(selectedGenres.filter((id) => id !== genre.id));
                      }
                    }}
                    className="form-checkbox h-5 w-5 rounded border-gray-600 bg-gray-700"
                  />
                  <span>{genre.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-400">No genres available</p>
          )}
        </div>

        {/* Country & Streaming Providers */}
        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 space-y-4">
          <div>
            <label htmlFor="watchRegion" className="block text-sm font-semibold text-gray-300 mb-2">
              Streaming Availability by Country
            </label>
            <select
              id="watchRegion"
              name="watchRegion"
              value={watchRegion}
              onChange={(e) => onWatchRegionChange && onWatchRegionChange(e.target.value)}
              className="mt-2 w-full p-2 bg-gray-700 border border-gray-600 rounded"
              aria-label="Filter by country availability"
            >
              <option value="">Select a Country...</option>
              <optgroup label="Popular Countries">
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="AU">Australia</option>
              </optgroup>
              <optgroup label="All Countries">
                {Object.entries(COUNTRY_NAMES)
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Filter by Streaming Providers
            </label>
            {!watchRegion ? (
              <p className="mt-2 text-sm text-yellow-500 bg-yellow-900/30 p-2 rounded">
                Please select a country above to view available streaming providers.
              </p>
            ) : isProvidersLoading ? (
              <p className="mt-2 text-sm text-gray-400">Loading providers...</p>
            ) : Array.isArray(providers) && providers.length > 0 ? (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                {providers.map((provider) => {
                  const logoUrl = buildTmdbImageUrl(provider.logo_path, 'w92');
                  return (
                    <label
                      key={provider.provider_id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        name="provider"
                        value={provider.provider_id}
                        checked={selectedProviders.includes(provider.provider_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProviders([...selectedProviders, provider.provider_id]);
                          } else {
                            setSelectedProviders(
                              selectedProviders.filter((id) => id !== provider.provider_id)
                            );
                          }
                        }}
                        className="form-checkbox h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      {logoUrl && (
                        <img
                          src={logoUrl}
                          alt=""
                          className="w-6 h-6 rounded flex-shrink-0 object-contain"
                        />
                      )}
                      <span className="text-sm truncate" title={provider.provider_name}>
                        {provider.provider_name}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">No providers available for this region</p>
            )}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="pt-2 border-t border-gray-700">
            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium text-gray-300 hover:text-white transition-colors"
              aria-label="Clear all filters"
            >
              Clear all filters ({activeFilterCount})
            </button>
          </div>
        )}
      </div>

      <button type="submit" className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded font-bold">
        Search
      </button>
    </form>
  );
};

export default SearchForm;
