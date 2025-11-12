import { getMovieGenres, getTvGenres } from '@/app/tmdbClient';

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
