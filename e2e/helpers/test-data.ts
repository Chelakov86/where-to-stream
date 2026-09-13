import { Genre, NormalizedSearchResult, TitleDetails, WatchProvider } from '@/app/types';

/**
 * Test data constants for E2E tests
 */

export const sampleGenres: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 18, name: 'Drama' },
  { id: 14, name: 'Fantasy' },
  { id: 27, name: 'Horror' },
  { id: 878, name: 'Science Fiction' },
  { id: 53, name: 'Thriller' },
];

export const sampleMovie: NormalizedSearchResult = {
  id: 550,
  type: 'movie',
  title: 'Fight Club',
  year: 1999,
  posterUrl: 'https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
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
  posterUrl: 'https://image.tmdb.org/t/p/w342/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  rating: 8.9,
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
    posterUrl: 'https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    rating: 8.7,
    genres: [18, 80],
    popularity: 92.1,
  },
  {
    id: 238,
    type: 'movie',
    title: 'The Godfather',
    year: 1972,
    posterUrl: 'https://image.tmdb.org/t/p/w342/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    rating: 8.7,
    genres: [18, 80],
    popularity: 88.5,
  },
];

export const sampleAutocompleteResults: NormalizedSearchResult[] = [
  {
    id: 550,
    type: 'movie',
    title: 'Fight Club',
    year: 1999,
    posterUrl: 'https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    popularity: 85.5,
  },
  {
    id: 1396,
    type: 'tv',
    title: 'Breaking Bad',
    year: 2008,
    posterUrl: 'https://image.tmdb.org/t/p/w342/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    popularity: 95.2,
  },
  {
    id: 278,
    type: 'movie',
    title: 'The Shawshank Redemption',
    year: 1994,
    posterUrl: 'https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    popularity: 92.1,
  },
];

const logo = (file: string) => `https://image.tmdb.org/t/p/w92/${file}.jpg`;
const netflix = { id: 8, name: 'Netflix', logoUrl: logo('netflix') };
const tubi = { id: 73, name: 'Tubi', logoUrl: logo('tubi') };
const appleTv = { id: 2, name: 'Apple TV', logoUrl: logo('apple') };

export const WATCH_LINK = 'https://www.themoviedb.org/movie/550-fight-club/watch';

export const sampleTitleDetails: TitleDetails = {
  id: 550,
  type: 'movie',
  title: 'Fight Club',
  originalTitle: 'Fight Club',
  year: 1999,
  genres: [
    { id: 18, name: 'Drama' },
    { id: 53, name: 'Thriller' },
  ],
  overview:
    'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
  tagline: 'Mischief. Mayhem. Soap.',
  posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  backdropUrl: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
  rating: 8.4,
  voteCount: 30000,
  runtime: 139,
  language: 'en',
  cast: [
    { name: 'Edward Norton', character: 'Narrator', profileUrl: logo('norton') },
    { name: 'Brad Pitt', character: 'Tyler Durden' },
  ],
  trailerUrl: 'https://www.youtube.com/watch?v=qtRKdVHc-cE',
  detectedCountry: null,
  availability: {
    US: {
      countryCode: 'US',
      countryName: 'United States',
      watchLink: WATCH_LINK,
      flatrate: [netflix],
      free: [tubi],
      rent: [],
      buy: [],
    },
    GB: {
      countryCode: 'GB',
      countryName: 'United Kingdom',
      watchLink: WATCH_LINK,
      flatrate: [netflix],
      free: [],
      rent: [],
      buy: [],
    },
    DE: {
      countryCode: 'DE',
      countryName: 'Germany',
      watchLink: WATCH_LINK,
      flatrate: [],
      free: [],
      rent: [appleTv],
      buy: [appleTv],
    },
  },
};

export const sampleProviders: WatchProvider[] = [
  { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 },
  { provider_id: 337, provider_name: 'Disney Plus', logo_path: '/disney.jpg', display_priority: 2 },
  {
    provider_id: 9,
    provider_name: 'Amazon Prime Video',
    logo_path: '/prime.jpg',
    display_priority: 3,
  },
  { provider_id: 73, provider_name: 'Tubi', logo_path: '/tubi.jpg', display_priority: 4 },
];

export const emptySearchResults: NormalizedSearchResult[] = [];

export const errorResponse = {
  error: 'Error fetching data from TMDB.',
};
