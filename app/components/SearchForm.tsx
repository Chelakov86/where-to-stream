import React, { useState } from 'react';

interface SearchFormProps {
  genres: { id: number; name: string }[];
  onSearch: (params: {
    query: string;
    type: 'movie' | 'tv' | 'all';
    yearFrom?: number;
    yearTo?: number;
    language?: string;
    genreIds?: number[];
    minRating?: number;
  }) => void;
  onAutocompleteRequest?: (query: string) => void;
  isGenresLoading?: boolean;
  autocompleteListId?: string;
  isAutocompleteOpen?: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({
  genres,
  onSearch,
  onAutocompleteRequest,
  isGenresLoading = false,
  autocompleteListId,
  isAutocompleteOpen,
}) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [minRating, setMinRating] = useState(5);
  const errorMessageId = 'search-form-query-error';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      setError('Please enter a search query.');
      return;
    }
    setError(null);

    const formData = new FormData(event.currentTarget);
    const selectedGenreIds = formData.getAll('genre').map((id) => parseInt(id as string, 10));

    onSearch({
      query: formData.get('query') as string,
      type: formData.get('type') as 'movie' | 'tv' | 'all',
      yearFrom: Number(formData.get('yearFrom')) || undefined,
      yearTo: Number(formData.get('yearTo')) || undefined,
      language: formData.get('language') as string,
      genreIds: selectedGenreIds.length > 0 ? selectedGenreIds : undefined,
      minRating: Number(formData.get('minRating')) || undefined,
    });
  };

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setQuery(newQuery);
    if (onAutocompleteRequest) {
      onAutocompleteRequest(newQuery);
    }
    if (error && newQuery.trim()) {
      setError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-800 text-white rounded-lg">
      <div>
        <label htmlFor="query" className="sr-only">
          Search for a movie or series
        </label>
        <input
          id="query"
          name="query"
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search for a movie or series"
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={autocompleteListId}
          aria-expanded={isAutocompleteOpen ?? undefined}
          aria-describedby={error ? errorMessageId : undefined}
          autoComplete="off"
        />
        {error && (
          <p id={errorMessageId} className="text-red-500 text-sm mt-1" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            name="type"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
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
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
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
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
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
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
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
        <label htmlFor="minRating" className="block text-sm font-medium">
          Minimum Rating: <span>{minRating}</span>
        </label>
        <input
          id="minRating"
          name="minRating"
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={minRating}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          onChange={(event) => setMinRating(Number(event.target.value))}
        />
      </div>

      <button type="submit" className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded font-bold">
        Search
      </button>
    </form>
  );
};

export default SearchForm;
