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
  minRating?: number;
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
  hasNetflix: boolean;
  freeOrAdsProviders: string[];
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
  availability: {
    preferredCountries: CountryAvailability[];
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
