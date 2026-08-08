/**
 * Title normalizer module.
 *
 * Converts a raw TMDB media object (movie or TV) into the app's title shape.
 * Hides the movie/TV duality (title vs name, release date vs first air date),
 * year extraction, runtime selection, and poster URL sizing, so no caller
 * ever sees a TMDB field name or URL format.
 */

import { TmdbImageSize, buildTmdbImageUrl, getYear } from './utils/tmdb';

/**
 * The subset of TMDB media shapes the normalizer needs.
 * All TMDB response types (search results, movie details, TV details) are assignable.
 */
interface TmdbMediaInput {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  vote_average: number;
  overview?: string;
  runtime?: number | null;
  episode_run_time?: number[];
}

/**
 * The normalized title shape produced by the normalizer.
 */
export interface NormalizedMedia {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  originalTitle?: string;
  year?: number;
  posterUrl?: string;
  rating?: number;
  overview?: string;
  runtime?: number | null;
}

interface NormalizeOptions {
  posterSize?: TmdbImageSize;
}

/**
 * Normalizes a raw TMDB media object into the app's title shape.
 *
 * @param media - Raw TMDB media object (search result or details)
 * @param type - Content type ('movie' or 'tv')
 * @param options - Optional settings (e.g. posterSize, default 'w500')
 * @returns Normalized title shape
 *
 * @example
 * ```typescript
 * normalizeTmdbMedia(movieResult, 'movie');
 * // { id: 550, type: 'movie', title: 'Fight Club', year: 1999, ... }
 * ```
 */
export function normalizeTmdbMedia(
  media: TmdbMediaInput,
  type: 'movie' | 'tv',
  options: NormalizeOptions = {}
): NormalizedMedia {
  const isMovie = type === 'movie';

  const normalized: NormalizedMedia = {
    id: media.id,
    type,
    title: (isMovie ? media.title : media.name) || '',
  };

  const originalTitle = isMovie ? media.original_title : media.original_name;
  const year = getYear(isMovie ? media.release_date : media.first_air_date);
  const posterUrl = buildTmdbImageUrl(media.poster_path, options.posterSize ?? 'w500');
  const runtime = isMovie ? (media.runtime ?? null) : (media.episode_run_time?.[0] ?? null);

  if (originalTitle) {
    normalized.originalTitle = originalTitle;
  }
  if (year !== undefined) {
    normalized.year = year;
  }
  if (posterUrl) {
    normalized.posterUrl = posterUrl;
  }
  if (media.vote_average !== undefined) {
    normalized.rating = media.vote_average;
  }
  if (media.overview) {
    normalized.overview = media.overview;
  }
  // TV shows have no single runtime; use the first episode runtime
  if (runtime !== undefined && runtime !== null) {
    normalized.runtime = runtime;
  }

  return normalized;
}
