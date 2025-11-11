import { GET } from "@/app/api/genres/route";
import { getMovieGenres, getTvGenres } from "@/app/tmdbClient";
import { NextRequest } from "next/server";

jest.mock("@/app/tmdbClient", () => ({
  getMovieGenres: jest.fn(),
  getTvGenres: jest.fn(),
}));

const mockedGetMovieGenres = getMovieGenres as jest.Mock;
const mockedGetTvGenres = getTvGenres as jest.Mock;

describe("/api/genres", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return combined movie and TV genres on success", async () => {
    const movieGenres = [
      { id: 28, name: "Action" },
      { id: 12, name: "Adventure" },
    ];
    const tvGenres = [
      { id: 10759, name: "Action & Adventure" },
      { id: 16, name: "Animation" },
    ];

    mockedGetMovieGenres.mockResolvedValue(movieGenres);
    mockedGetTvGenres.mockResolvedValue(tvGenres);

    const response = await GET({} as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      movie: movieGenres,
      tv: tvGenres,
    });
  });

  it("should return 502 if fetching movie genres fails", async () => {
    mockedGetMovieGenres.mockRejectedValue(new Error("TMDB API error"));
    mockedGetTvGenres.mockResolvedValue([]);

    const response = await GET({} as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ error: "Failed to fetch genres" });
  });

  it("should return 502 if fetching TV genres fails", async () => {
    mockedGetMovieGenres.mockResolvedValue([]);
    mockedGetTvGenres.mockRejectedValue(new Error("TMDB API error"));

    const response = await GET({} as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ error: "Failed to fetch genres" });
  });

  it("should return 502 if both fetches fail", async () => {
    mockedGetMovieGenres.mockRejectedValue(new Error("Movie API error"));
    mockedGetTvGenres.mockRejectedValue(new Error("TV API error"));

    const response = await GET({} as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ error: "Failed to fetch genres" });
  });
});
