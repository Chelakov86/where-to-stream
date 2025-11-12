import { TitleDetails } from '@/app/types';

export const mockGenres = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
];

export const mockMovie: TitleDetails = {
  id: 550,
  title: 'Fight Club',
  year: 2023,
  type: 'movie',
  genres: [
    { id: 1, name: 'Action' },
    { id: 2, name: 'Adventure' },
  ],
  overview:
    'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
  posterUrl: '/path/to/poster.jpg',
  rating: 8.5,
  runtime: 90,
  availability: {
    preferredCountries: [
      {
        countryCode: 'US',
        countryName: 'United States',
        hasNetflix: true,
        freeOrAdsProviders: ['Hulu', 'Max'],
        watchLink: 'https://example.com/watch/movie/us',
      },
    ],
    otherCountries: [
      {
        countryCode: 'GB',
        countryName: 'United Kingdom',
        hasNetflix: false,
        freeOrAdsProviders: [],
        watchLink: 'https://example.com/watch/movie/gb',
      },
    ],
  },
};

export const mockTv: TitleDetails = {
  id: 1399,
  title: 'Game of Thrones',
  year: 2021,
  type: 'tv',
  genres: [
    { id: 10765, name: 'Sci-Fi & Fantasy' },
    { id: 18, name: 'Drama' },
  ],
  overview: 'Seven noble families fight for control of the mythical land of Westeros.',
  posterUrl: '/path/to/another-poster.jpg',
  rating: 9,
  runtime: 45,
  availability: {
    preferredCountries: [
      {
        countryCode: 'CA',
        countryName: 'Canada',
        hasNetflix: false,
        freeOrAdsProviders: ['Crave'],
        watchLink: 'https://example.com/watch/tv/ca',
      },
    ],
    otherCountries: [],
  },
};
