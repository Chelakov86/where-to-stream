import { NormalizedSearchResult, Genre } from '@/app/types';

/**
 * Test data constants for E2E tests
 */

export const sampleGenres: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

export const sampleMovie: NormalizedSearchResult = {
  id: 550,
  type: 'movie',
  title: 'Fight Club',
  year: 1999,
  posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  rating: 8.4,
  genres: [18, 53],
  overview:
    'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
  popularity: 85.5,
};

export const sampleTvShow: NormalizedSearchResult = {
  id: 1396,
  type: 'tv',
  title: 'Breaking Bad',
  year: 2008,
  posterUrl: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  rating: 9.5,
  genres: [18, 80],
  overview:
    'A high school chemistry teacher turned methamphetamine manufacturer partners with a former student.',
  popularity: 95.2,
};

export const sampleSearchResults: NormalizedSearchResult[] = [
  sampleMovie,
  sampleTvShow,
  {
    id: 278,
    type: 'movie',
    title: 'The Shawshank Redemption',
    year: 1994,
    posterUrl: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    rating: 9.3,
    genres: [18, 80],
    overview:
      'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    popularity: 92.1,
  },
  {
    id: 238,
    type: 'movie',
    title: 'The Godfather',
    year: 1972,
    posterUrl: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    rating: 9.2,
    genres: [18, 80],
    overview:
      'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
    popularity: 88.5,
  },
];

export const sampleAutocompleteResults: NormalizedSearchResult[] = [
  {
    id: 550,
    type: 'movie',
    title: 'Fight Club',
    year: 1999,
    posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    popularity: 85.5,
  },
  {
    id: 1396,
    type: 'tv',
    title: 'Breaking Bad',
    year: 2008,
    posterUrl: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    popularity: 95.2,
  },
  {
    id: 278,
    type: 'movie',
    title: 'The Shawshank Redemption',
    year: 1994,
    posterUrl: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    popularity: 92.1,
  },
];

export const sampleTitleDetails = {
  id: 550,
  type: 'movie' as const,
  title: 'Fight Club',
  year: 1999,
  genres: [
    { id: 18, name: 'Drama' },
    { id: 53, name: 'Thriller' },
  ],
  overview:
    'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
  posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  rating: 8.4,
  runtime: 139,
  availability: {
    preferredCountries: [
      {
        countryCode: 'US',
        countryName: 'United States',
        hasNetflix: true,
        freeOrAdsProviders: ['Tubi', 'Pluto TV'],
        watchLink: 'https://www.themoviedb.org/movie/550-watch',
      },
      {
        countryCode: 'GB',
        countryName: 'United Kingdom',
        hasNetflix: false,
        freeOrAdsProviders: ['BBC iPlayer'],
        watchLink: 'https://www.themoviedb.org/movie/550-watch',
      },
    ],
    otherCountries: [
      {
        countryCode: 'DE',
        countryName: 'Germany',
        hasNetflix: true,
        freeOrAdsProviders: [],
        watchLink: 'https://www.themoviedb.org/movie/550-watch',
      },
    ],
  },
};

export const emptySearchResults: NormalizedSearchResult[] = [];

export const errorResponse = {
  error: 'Error from TMDB API',
};

export const networkErrorResponse = {
  error: 'Internal Server Error',
};
