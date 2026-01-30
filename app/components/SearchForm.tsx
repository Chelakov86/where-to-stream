import React, { useState, useEffect, useRef } from 'react';
import { AutocompleteList, AutocompleteItem } from './AutocompleteList';
import { COUNTRY_NAMES } from '@/app/utils/countries';

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
  autocompleteListId,
  autocompleteItems = [],
  onAutocompleteSelect,
  onAutocompleteClose,
}) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showFilters, setShowFilters] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const errorMessageId = 'search-form-query-error';

  useEffect(() => {
    if (autocompleteItems.length === 0) {
      setHighlightedIndex(-1);
    }
  }, [autocompleteItems.length]);

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
    const watchRegion = formData.get('watchRegion') as string;

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
          <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
          <span className="text-lg">{showFilters ? '−' : '+'}</span>
        </button>
      </div>

      <div id="filter-section" className={`space-y-4 ${showFilters ? '' : 'hidden'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium">
              Type
            </label>
            <select
              id="type"
              name="type"
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
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              aria-label="Filter by language"
            >
              <option value="">Any</option>
              <option value="en">EN</option>
              <option value="de">DE</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Genres</label>
          {isGenresLoading ? (
            <p className="mt-2 text-sm text-gray-400">Loading filters...</p>
          ) : Array.isArray(genres) && genres.length > 0 ? (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
              {genres.map((genre) => (
                <label key={genre.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="genre"
                    value={genre.id}
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

        <div>
          <label className="block text-sm font-medium">Streaming Providers</label>
          {isProvidersLoading ? (
            <p className="mt-2 text-sm text-gray-400">Loading providers...</p>
          ) : Array.isArray(providers) && providers.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
              {providers.map((provider) => (
                <label key={provider.provider_id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 p-1 rounded">
                  <input
                    type="checkbox"
                    name="provider"
                    value={provider.provider_id}
                    className="form-checkbox h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm truncate" title={provider.provider_name}>
                    {provider.provider_name}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-400">No providers available</p>
          )}
        </div>

        <div>
          <label htmlFor="watchRegion" className="block text-sm font-medium">
            Filter by country availability
          </label>
          <select
            id="watchRegion"
            name="watchRegion"
            className="mt-2 w-full p-2 bg-gray-700 border border-gray-600 rounded"
            aria-label="Filter by country availability"
          >
            <option value="">Any Country</option>
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
      </div>

      <button type="submit" className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded font-bold">
        Search
      </button>
    </form>
  );
};

export default SearchForm;
