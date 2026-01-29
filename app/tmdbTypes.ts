/**
 * TypeScript type definitions for TMDB API responses.
 * Contains minimal interfaces covering the fields we need.
 */

export interface TmdbSearchResult {
  id: number;
  title?: string; // for movies
  name?: string; // for TV shows
  release_date?: string; // for movies
  first_air_date?: string; // for TV shows
  poster_path: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  vote_count?: number;
  genre_ids: number[];
  popularity: number;
  overview?: string;
  original_language?: string;
}

export interface TmdbSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbGenreList {
  genres: TmdbGenre[];
}

export interface TmdbProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TmdbProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TmdbSpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  overview: string;
  runtime: number | null;
  genres: TmdbGenre[];
  original_language: string;
  status: string;
  tagline: string | null;
  budget?: number;
  revenue?: number;
  production_companies?: TmdbProductionCompany[];
  production_countries?: TmdbProductionCountry[];
  spoken_languages?: TmdbSpokenLanguage[];
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  original_name: string;
  first_air_date: string;
  last_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  overview: string;
  genres: TmdbGenre[];
  original_language: string;
  status: string;
  tagline: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time?: number[];
  production_companies?: TmdbProductionCompany[];
  production_countries?: TmdbProductionCountry[];
  spoken_languages?: TmdbSpokenLanguage[];
}

export interface TmdbWatchProviderInfo {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface TmdbCountryWatchProviders {
  link?: string;
  flatrate?: TmdbWatchProviderInfo[];
  rent?: TmdbWatchProviderInfo[];
  buy?: TmdbWatchProviderInfo[];
  ads?: TmdbWatchProviderInfo[];
  free?: TmdbWatchProviderInfo[];
}

export interface TmdbWatchProvidersResponse {
  id: number;
  results: Record<string, TmdbCountryWatchProviders>;
}
