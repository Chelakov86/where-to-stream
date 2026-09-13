export type MediaType = 'movie' | 'tv';

export interface NormalizedSearchResult {
  id: number;
  type: MediaType;
  title: string;
  year?: number;
  posterUrl?: string;
  rating?: number;
  genres?: number[];
  overview?: string;
  popularity?: number;
}

export type TMDBResult = NormalizedSearchResult;

export interface Genre {
  id: number;
  name: string;
}

/**
 * A watch provider as referenced from availability data.
 * The id is what the user's "My Services" selection is matched against.
 */
export interface ProviderRef {
  id: number;
  name: string;
  logoUrl?: string;
}

export type OfferKind = 'flatrate' | 'free' | 'rent' | 'buy';

/**
 * Every way a title can be watched in one country, grouped by offer kind.
 * `free` merges TMDB's `free` and `ads` categories.
 */
export interface CountryAvailability {
  countryCode: string;
  countryName: string;
  watchLink?: string;
  flatrate: ProviderRef[];
  free: ProviderRef[];
  rent: ProviderRef[];
  buy: ProviderRef[];
}

/** Availability keyed by ISO 3166-1 alpha-2 country code. */
export type AvailabilityByCountry = Record<string, CountryAvailability>;

export interface CastMember {
  name: string;
  character: string;
  profileUrl?: string;
}

export interface TitleDetails {
  id: number;
  type: MediaType;
  title: string;
  originalTitle?: string;
  year?: number;
  genres: Genre[];
  overview?: string;
  tagline?: string;
  rating?: number;
  voteCount?: number;
  posterUrl?: string;
  backdropUrl?: string;
  runtime?: number | null;
  seasons?: number;
  episodes?: number;
  language?: string;
  cast: CastMember[];
  trailerUrl?: string;
  detectedCountry: string | null; // ISO country code or null if detection failed
  availability: AvailabilityByCountry;
}

export interface SearchHistoryItem {
  id: number;
  type: MediaType;
  title: string;
  year?: number;
  timestamp: number; // Unix timestamp
}

export interface SavedTitle {
  id: number;
  type: MediaType;
  title: string;
  year?: number;
  posterUrl?: string;
  addedAt: number; // Unix timestamp
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}
