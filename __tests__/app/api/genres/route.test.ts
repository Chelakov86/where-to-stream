import { GET } from '@/app/api/genres/route';
import * as tmdbApi from '@/app/tmdbApi';
import { TmdbError } from '@/app/tmdbClient';

jest.mock('@/app/tmdbApi');

const mockedGetMovieGenres = tmdbApi.getMovieGenres as jest.Mock;
const mockedGetTvGenres = tmdbApi.getTvGenres as jest.Mock;

const makeRequest = () => new Request('http://localhost/api/genres');

const movieGenreList = {
  genres: [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
  ],
};

const tvGenreList = {
  genres: [
    { id: 10759, name: 'Action & Adventure' },
    { id: 16, name: 'Animation' },
  ],
};

describe('/api/genres', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return combined movie and TV genres on success', async () => {
    mockedGetMovieGenres.mockResolvedValue(movieGenreList);
    mockedGetTvGenres.mockResolvedValue(tvGenreList);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      movie: movieGenreList.genres,
      tv: tvGenreList.genres,
    });
  });

  it('should return 502 if fetching movie genres fails with a TMDB error', async () => {
    mockedGetMovieGenres.mockRejectedValue(new TmdbError(500, 'TMDB API error'));
    mockedGetTvGenres.mockResolvedValue(tvGenreList);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ error: 'Error fetching data from TMDB.' });
  });

  it('should return 500 for internal failures', async () => {
    mockedGetMovieGenres.mockRejectedValue(new Error('Unexpected error'));
    mockedGetTvGenres.mockResolvedValue(tvGenreList);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Internal Server Error' });
  });

  it('should return 502 if both fetches fail with TMDB errors', async () => {
    mockedGetMovieGenres.mockRejectedValue(new TmdbError(500, 'Movie API error'));
    mockedGetTvGenres.mockRejectedValue(new TmdbError(503, 'TV API error'));

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ error: 'Error fetching data from TMDB.' });
  });
});
