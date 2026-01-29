export interface NormalizedSearchResult {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  year?: number;
  posterUrl?: string;
  rating?: number;
  genres?: number[];
  overview?: string;
  popularity?: number;
}

export interface SearchParams {
  query: string;
  type?: 'movie' | 'tv' | 'all';
  yearFrom?: number;
  yearTo?: number;
  language?: string;
  genreIds?: number[];
  providerIds?: number[];
  watchRegion?: string;
}

export type TMDBResult = NormalizedSearchResult;

export interface ResultsListProps {
  results: NormalizedSearchResult[];
  page: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (nextPage: number) => void;
  onSelectResult: (result: NormalizedSearchResult) => void;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CountryAvailability {
  countryCode: string;
  countryName: string;
  freeProviders: string[];
  paidProviders: string[];
  watchLink?: string;
}

export interface TitleDetails {
  id: number;
  title: string;
  year: number;
  type: 'movie' | 'tv';
  genres: Genre[];
  overview: string;
  posterUrl: string;
  rating: number;
  runtime: number;
  detectedCountry: string | null; // ISO country code or null if detection failed
  availability: {
    userCountry: CountryAvailability | null; // Single country or null
    otherCountries: CountryAvailability[];
  };
}

export interface SearchHistoryItem {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  year?: number;
  timestamp: number; // Unix timestamp
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}
