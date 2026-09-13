import { CountryAvailability, TitleDetails } from '@/app/types';

export const mockGenres = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
];

const netflix = { id: 8, name: 'Netflix', logoUrl: 'https://image.tmdb.org/t/p/w92/netflix.jpg' };
const hulu = { id: 15, name: 'Hulu' };
const tubi = { id: 73, name: 'Tubi' };
const appleTv = { id: 2, name: 'Apple TV' };
const crave = { id: 230, name: 'Crave' };

const country = (
  countryCode: string,
  countryName: string,
  offers: Partial<Pick<CountryAvailability, 'flatrate' | 'free' | 'rent' | 'buy'>>
): CountryAvailability => ({
  countryCode,
  countryName,
  watchLink: `https://example.com/watch/${countryCode.toLowerCase()}`,
  flatrate: [],
  free: [],
  rent: [],
  buy: [],
  ...offers,
});

export const mockMovie: TitleDetails = {
  id: 550,
  title: 'Fight Club',
  year: 1999,
  type: 'movie',
  genres: [
    { id: 18, name: 'Drama' },
    { id: 53, name: 'Thriller' },
  ],
  overview:
    'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
  tagline: 'Mischief. Mayhem. Soap.',
  posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
  rating: 8.4,
  voteCount: 30000,
  runtime: 139,
  language: 'en',
  cast: [{ name: 'Edward Norton', character: 'Narrator' }],
  trailerUrl: 'https://www.youtube.com/watch?v=abc',
  detectedCountry: 'US',
  availability: {
    US: country('US', 'United States', { flatrate: [hulu, netflix], free: [tubi] }),
    GB: country('GB', 'United Kingdom', { flatrate: [netflix] }),
    DE: country('DE', 'Germany', { rent: [appleTv], buy: [appleTv] }),
  },
};

export const mockTv: TitleDetails = {
  id: 1399,
  title: 'Game of Thrones',
  year: 2011,
  type: 'tv',
  genres: [
    { id: 10765, name: 'Sci-Fi & Fantasy' },
    { id: 18, name: 'Drama' },
  ],
  overview: 'Seven noble families fight for control of the mythical land of Westeros.',
  posterUrl: 'https://image.tmdb.org/t/p/w500/another-poster.jpg',
  rating: 8.5,
  runtime: 60,
  seasons: 8,
  episodes: 73,
  cast: [],
  detectedCountry: 'CA',
  availability: {
    CA: country('CA', 'Canada', { flatrate: [crave] }),
  },
};
