import { getMovieGenres, getTvGenres } from '@/app/tmdbClient';

/**
 * API route handler for fetching movie and TV genres.
 *
 * GET /api/genres
 *
 * Fetches genre lists for both movies and TV shows from TMDB in parallel,
 * then returns them combined in a single response. This endpoint is cached
 * by the TMDB client layer with a long TTL (24 hours) since genres change
 * infrequently.
 *
 * @returns {Promise<Response>} JSON response with structure:
 *   {
 *     movie: Genre[],
 *     tv: Genre[]
 *   }
 * @throws {Response} Returns 502 status if TMDB API fails
 */
export async function GET() {
  try {
    const [movie, tv] = await Promise.all([getMovieGenres(), getTvGenres()]);
    return new Response(JSON.stringify({ movie, tv }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch genres' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
