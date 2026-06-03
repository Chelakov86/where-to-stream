import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AutocompleteList, AutocompleteItem } from './AutocompleteList';
import { COUNTRY_NAMES, getCountryFlagUrl } from '@/app/utils/countries';
import { loadFilterState, saveFilterState } from '@/app/utils/filterStorage';
import ProviderChips from './ProviderChips';
import { WatchProvider } from '@/app/types';

interface SearchFormProps {
  genres: { id: number; name: string }[];
  providers: WatchProvider[];
  onSearch: (params: {
    query: string;
    type: 'movie' | 'tv' | 'all';
    yearFrom?: number;
    yearTo?: number;
    language?: string;
    genreIds?: number[];
    providerIds?: number[];
    watchRegion?: string;
    minRating?: number;
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

const POPULAR_COUNTRY_CODES = ['US', 'GB', 'CA', 'DE', 'FR', 'AU'];

interface CountryPickerProps {
  value: string;
  onChange?: (region: string) => void;
  fieldClass: string;
}

const CountryPicker: React.FC<CountryPickerProps> = ({ value, onChange, fieldClass }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedCountry = value ? COUNTRY_NAMES[value] || value : '';

  const allCountries = useMemo(
    () => Object.entries(COUNTRY_NAMES).sort((a, b) => a[1].localeCompare(b[1])),
    []
  );

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) {
      return allCountries;
    }
    return allCountries.filter(
      ([code, name]) => code.toLowerCase().includes(query) || name.toLowerCase().includes(query)
    );
  }, [allCountries, countrySearch]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectCountry = (countryCode: string) => {
    onChange?.(countryCode);
    setCountrySearch('');
    setIsOpen(false);
  };

  const clearCountry = () => {
    onChange?.('');
    setCountrySearch('');
    setIsOpen(false);
  };

  const renderCountryOption = ([code, name]: [string, string]) => {
    const isSelected = code === value;
    return (
      <li key={code}>
        <button
          type="button"
          onClick={() => selectCountry(code)}
          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
            isSelected
              ? 'border-accent-primary/40 bg-accent-primary/[0.16] text-text'
              : 'border-white/[0.08] bg-white/[0.045] text-text-secondary hover:border-white/20 hover:bg-white/[0.08] hover:text-text'
          }`}
          role="option"
          aria-selected={isSelected}
        >
          <img
            src={getCountryFlagUrl(code)}
            alt=""
            className="h-[15px] w-5 rounded-[2px] object-cover"
            loading="lazy"
          />
          <span className="min-w-0 flex-1 truncate text-sm font-black">{name}</span>
          <span className="rounded-md bg-white/[0.08] px-2 py-1 text-[11px] font-black text-text-secondary">
            {code}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div ref={pickerRef} className="relative mt-2">
      <input id="watchRegion" name="watchRegion" type="hidden" value={value} readOnly />
      <button
        type="button"
        className={`${fieldClass} flex items-center justify-between gap-3 text-left`}
        aria-label="Streaming Availability by Country"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="watch-region-listbox"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
      >
        <span className="flex min-w-0 items-center gap-3">
          {value ? (
            <img
              src={getCountryFlagUrl(value)}
              alt=""
              className="h-[15px] w-5 rounded-[2px] object-cover"
            />
          ) : (
            <span className="h-[15px] w-5 rounded-[2px] border border-white/20 bg-white/[0.08]" />
          )}
          <span className={`truncate ${value ? 'text-text' : 'text-text-secondary/70'}`}>
            {selectedCountry || 'Select streaming country'}
          </span>
        </span>
        <span className="rounded-md bg-accent-primary/15 px-2 py-1 text-xs font-black text-accent-primary">
          {value || 'SET'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-xl border border-white/[0.14] bg-[#10151d] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={countrySearch}
              onChange={(event) => setCountrySearch(event.target.value)}
              placeholder="Search country or code"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-text outline-none placeholder:text-text-secondary/60 focus:border-accent-primary/70 focus:ring-2 focus:ring-accent-primary/20"
              aria-label="Search countries"
              autoFocus
            />
            {value && (
              <button
                type="button"
                onClick={clearCountry}
                className="rounded-lg border border-white/10 bg-white/[0.05] px-3 text-xs font-black uppercase tracking-[0.12em] text-text-secondary transition hover:bg-white/[0.09] hover:text-text"
              >
                Clear
              </button>
            )}
          </div>

          {!countrySearch && (
            <div className="mt-3">
              <p className="mb-2 px-1 text-xs font-black uppercase tracking-[0.16em] text-text-secondary">
                Popular countries
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {POPULAR_COUNTRY_CODES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => selectCountry(code)}
                    className={`flex min-w-0 items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs font-black transition ${
                      code === value
                        ? 'border-accent-primary/50 bg-accent-primary/[0.14] text-text'
                        : 'border-white/10 bg-white/[0.04] text-text-secondary hover:border-white/20 hover:text-text'
                    }`}
                  >
                    <img
                      src={getCountryFlagUrl(code)}
                      alt=""
                      className="h-[15px] w-5 rounded-[2px] object-cover"
                    />
                    <span className="min-w-0 truncate">{COUNTRY_NAMES[code]}</span>
                    <span className="ml-auto text-[10px] text-text-secondary">{code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <ul
            id="watch-region-listbox"
            role="listbox"
            className="custom-scrollbar mt-3 max-h-64 space-y-1 overflow-y-auto rounded-lg bg-black/20 p-1"
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map(renderCountryOption)
            ) : (
              <li className="px-3 py-4 text-center text-sm font-semibold text-text-secondary">
                No countries match &quot;{countrySearch}&quot;
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

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
  const [minRating, setMinRating] = useState<number>(0);
  const [isAutocompleteSuppressed, setIsAutocompleteSuppressed] = useState(false);

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
    (watchRegion ? 1 : 0) +
    (minRating > 0 ? 1 : 0);

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
      setMinRating(savedState.minRating ?? 0);
      // Notify parent of saved watch region
      if (savedState.watchRegion && onWatchRegionChange) {
        previousWatchRegion.current = savedState.watchRegion;
        onWatchRegionChange(savedState.watchRegion);
      }
    }
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
      minRating,
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
    minRating,
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
    setIsAutocompleteSuppressed(true);
    onAutocompleteClose?.();

    const formData = new FormData(event.currentTarget);
    const selectedGenreIds = formData.getAll('genre').map((id) => parseInt(id as string, 10));
    const selectedProviderIds = selectedProviders;

    onSearch({
      query: formData.get('query') as string,
      type: formData.get('type') as 'movie' | 'tv' | 'all',
      yearFrom: Number(formData.get('yearFrom')) || undefined,
      yearTo: Number(formData.get('yearTo')) || undefined,
      language: formData.get('language') as string,
      genreIds: selectedGenreIds.length > 0 ? selectedGenreIds : undefined,
      providerIds: selectedProviderIds.length > 0 ? selectedProviderIds : undefined,
      watchRegion: watchRegion || undefined,
      minRating: minRating > 0 ? minRating : undefined,
    });
  };

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setQuery(newQuery);
    setHighlightedIndex(-1);
    setIsAutocompleteSuppressed(false);
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
    setMinRating(0);
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
      minRating: 0,
    });
  };

  const fieldClass =
    'w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-text outline-none transition placeholder:text-text-secondary/60 focus:border-accent-primary/70 focus:bg-white/[0.09] focus:ring-2 focus:ring-accent-primary/20';
  const labelClass = 'block text-xs font-black uppercase tracking-[0.16em] text-text-secondary';
  const filterPanelClass = 'rounded-xl border border-white/10 bg-black/[0.18] p-4';

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-20 rounded-2xl border border-white/[0.12] bg-[#121821]/[0.85] p-3 text-text shadow-[0_28px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-4"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem]">
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
            className="h-14 w-full rounded-xl border border-white/[0.12] bg-[#eef1ea] px-4 text-base font-black text-[#10141a] shadow-inner outline-none transition placeholder:text-[#59615b] focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/20 sm:px-5 sm:text-lg"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-controls={autocompleteListId}
            aria-expanded={!isAutocompleteSuppressed && autocompleteItems.length > 0}
            aria-describedby={error ? errorMessageId : undefined}
            autoComplete="off"
            aria-label="Search query"
          />
          {error && (
            <p id={errorMessageId} className="mt-2 text-sm font-semibold text-red-300" role="alert">
              {error}
            </p>
          )}
          {!isAutocompleteSuppressed &&
            autocompleteItems.length > 0 &&
            onAutocompleteSelect &&
            onAutocompleteClose && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30">
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

        <button
          type="submit"
          className="h-14 rounded-xl bg-accent-primary px-6 text-sm font-black uppercase tracking-[0.14em] text-[#161006] shadow-[0_16px_34px_rgba(246,185,75,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ffcb66] focus:outline-none focus:ring-4 focus:ring-accent-primary/25"
        >
          Search
        </button>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-black text-text transition hover:border-white/20 hover:bg-white/[0.07]"
          aria-expanded={showFilters}
          aria-controls="filter-section"
          aria-label={showFilters ? 'Hide search filters' : 'Show search filters'}
        >
          <span className="flex items-center gap-3">
            <span>{showFilters ? 'Hide filters' : 'Refine search'}</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-accent-secondary/[0.18] px-2.5 py-1 text-xs font-black text-accent-secondary">
                {activeFilterCount} active
              </span>
            )}
          </span>
          <span className="grid h-7 w-7 place-items-center rounded-md bg-white/[0.08] text-lg leading-none text-accent-primary">
            {showFilters ? '−' : '+'}
          </span>
        </button>
      </div>

      <div id="filter-section" className={`mt-4 space-y-4 ${showFilters ? '' : 'hidden'}`}>
        <div className={filterPanelClass}>
          <h3 className="mb-4 text-sm font-black text-text">Format and release</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="type" className={labelClass}>
                Type
              </label>
              <select
                id="type"
                name="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'movie' | 'tv' | 'all')}
                className={`${fieldClass} mt-2`}
                aria-label="Filter by content type"
              >
                <option value="all">All</option>
                <option value="movie">Movies only</option>
                <option value="tv">Series only</option>
              </select>
            </div>

            <div>
              <label htmlFor="yearFrom" className={labelClass}>
                From
              </label>
              <input
                id="yearFrom"
                name="yearFrom"
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder="2000"
                className={`${fieldClass} mt-2`}
                aria-label="From Year"
              />
            </div>

            <div>
              <label htmlFor="yearTo" className={labelClass}>
                To
              </label>
              <input
                id="yearTo"
                name="yearTo"
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder="2026"
                className={`${fieldClass} mt-2`}
                aria-label="To Year"
              />
            </div>

            <div>
              <label htmlFor="language" className={labelClass}>
                Language
              </label>
              <select
                id="language"
                name="language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className={`${fieldClass} mt-2`}
                aria-label="Filter by language"
              >
                <option value="">Any</option>
                <option value="en">EN</option>
                <option value="de">DE</option>
              </select>
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <span className={labelClass}>Minimum Rating</span>
              <label htmlFor="minRating" className="text-xs font-black text-accent-primary">
                ★ <span>{minRating.toFixed(1)}</span>
              </label>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <input
                id="minRating"
                name="minRating"
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-accent-primary"
                aria-label="Filter by minimum rating"
                aria-valuemin={0}
                aria-valuemax={10}
                aria-valuenow={minRating}
              />
            </div>
          </div>
        </div>

        <div className={filterPanelClass}>
          <label className="mb-3 block text-sm font-black text-text">Genres</label>
          {isGenresLoading ? (
            <p className="text-sm text-text-secondary">Loading filters...</p>
          ) : Array.isArray(genres) && genres.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {genres.map((genre) => (
                <label
                  key={genre.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm font-semibold text-text-secondary transition hover:border-white/[0.18] hover:text-text"
                >
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
                    className="h-4 w-4 rounded border-white/20 bg-white/10 accent-accent-primary"
                  />
                  <span>{genre.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No genres available</p>
          )}
        </div>

        <div className={`${filterPanelClass} space-y-4`}>
          <div>
            <label htmlFor="watchRegion" className={labelClass}>
              Streaming country
            </label>
            <CountryPicker
              value={watchRegion}
              onChange={onWatchRegionChange}
              fieldClass={fieldClass}
            />
          </div>

          <div>
            <label className="mb-3 block text-sm font-black text-text">Streaming services</label>
            {!watchRegion ? (
              <p className="rounded-lg border border-accent-primary/20 bg-accent-primary/10 p-3 text-sm font-semibold text-[#ffd98d]">
                Please select a country above to view available streaming providers.
              </p>
            ) : isProvidersLoading ? (
              <p className="text-sm text-text-secondary">Loading providers...</p>
            ) : Array.isArray(providers) && providers.length > 0 ? (
              <div>
                <ProviderChips
                  providers={providers}
                  selectedProviders={selectedProviders}
                  onChange={setSelectedProviders}
                />
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No providers available for this region</p>
            )}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-text-secondary transition hover:border-red-300/40 hover:bg-red-500/10 hover:text-red-100"
              aria-label="Clear all filters"
            >
              Clear all filters ({activeFilterCount})
            </button>
          </div>
        )}
      </div>
    </form>
  );
};

export default SearchForm;
