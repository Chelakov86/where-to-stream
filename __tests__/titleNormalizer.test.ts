import { normalizeTmdbMedia } from '@/app/titleNormalizer';
import { TmdbSearchResult, TmdbMovieDetails, TmdbTvDetails } from '@/app/tmdbTypes';

const movieSearchResult: TmdbSearchResult = {
  id: 550,
  title: 'Fight Club',
  release_date: '1999-10-15',
  poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  vote_average: 8.4,
  genre_ids: [18],
  popularity: 50.5,
  overview: 'A ticking-time-bomb insomniac...',
  original_language: 'en',
};

const tvSearchResult: TmdbSearchResult = {
  id: 1396,
  name: 'Breaking Bad',
  first_air_date: '2008-01-20',
  poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  vote_average: 8.9,
  genre_ids: [18],
  popularity: 60.1,
  original_language: 'en',
};

const movieDetails: TmdbMovieDetails = {
  id: 550,
  title: 'Fight Club',
  original_title: 'Fight Club',
  release_date: '1999-10-15',
  poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  backdrop_path: null,
  vote_average: 8.4,
  vote_count: 1000,
  popularity: 50.5,
  overview: 'A ticking-time-bomb insomniac...',
  runtime: 139,
  genres: [{ id: 18, name: 'Drama' }],
  original_language: 'en',
  status: 'Released',
  tagline: null,
};

const tvDetails: TmdbTvDetails = {
  id: 1396,
  name: 'Breaking Bad',
  original_name: 'Breaking Bad',
  first_air_date: '2008-01-20',
  poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  backdrop_path: null,
  vote_average: 8.9,
  vote_count: 2000,
  popularity: 60.1,
  overview: 'A chemistry teacher diagnosed with cancer...',
  genres: [{ id: 18, name: 'Drama' }],
  original_language: 'en',
  status: 'Ended',
  tagline: null,
  number_of_seasons: 5,
  number_of_episodes: 62,
  episode_run_time: [45, 47],
};

describe('normalizeTmdbMedia', () => {
  it('normalizes a movie search result', () => {
    const result = normalizeTmdbMedia(movieSearchResult, 'movie');

    expect(result).toEqual({
      id: 550,
      type: 'movie',
      title: 'Fight Club',
      year: 1999,
      posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      rating: 8.4,
      overview: 'A ticking-time-bomb insomniac...',
    });
  });

  it('normalizes a TV search result using name and first_air_date', () => {
    const result = normalizeTmdbMedia(tvSearchResult, 'tv');

    expect(result.title).toBe('Breaking Bad');
    expect(result.year).toBe(2008);
    expect(result.type).toBe('tv');
  });

  it('normalizes movie details including originalTitle and runtime', () => {
    const result = normalizeTmdbMedia(movieDetails, 'movie');

    expect(result.originalTitle).toBe('Fight Club');
    expect(result.runtime).toBe(139);
  });

  it('selects the first episode runtime for TV shows', () => {
    const result = normalizeTmdbMedia(tvDetails, 'tv');

    expect(result.originalTitle).toBe('Breaking Bad');
    expect(result.runtime).toBe(45);
  });

  it('applies the requested poster size', () => {
    const result = normalizeTmdbMedia(movieSearchResult, 'movie', { posterSize: 'w200' });

    expect(result.posterUrl).toBe(
      'https://image.tmdb.org/t/p/w200/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
    );
  });

  it('omits the poster URL when there is no poster path', () => {
    const result = normalizeTmdbMedia({ ...movieSearchResult, poster_path: null }, 'movie');

    expect(result.posterUrl).toBeUndefined();
  });

  it('returns undefined year for missing dates', () => {
    const result = normalizeTmdbMedia({ ...movieSearchResult, release_date: undefined }, 'movie');

    expect(result.year).toBeUndefined();
  });

  it('extracts the correct year for January 1st dates', () => {
    const result = normalizeTmdbMedia({ ...tvSearchResult, first_air_date: '2021-01-01' }, 'tv');

    expect(result.year).toBe(2021);
  });
});
