# WhereToStream

A Next.js app for finding where movies and TV shows are streaming. Search or browse titles, filter
them, and see availability by country — with your own streaming services and preferred countries
shown first. Data comes from [TMDB](https://www.themoviedb.org/).

## Features

- Search with autocomplete, or browse what's popular in your country
- Filters: type, genre, year range, language, minimum rating, sort, "only my services"
- Title pages with a headline availability verdict and offers grouped by stream / free / rent / buy
- Country comparison for a single title
- Saved titles and recently viewed history (stored locally)

Title searches with year, rating, genre, original-language or selected-service filters, or an explicit sort other than
Best match, collect up to 50 TMDB pages per
media type, apply filters and sorting, then paginate the matches in pages of 20. Snapshots are reused for five minutes. Searches that exceed
this budget are explicitly marked incomplete; their counts cover only the inspected titles.
Original language filters match TMDB’s `original_language` for movies and TV without changing
response localization. Titles with unknown original language are excluded when a language is selected.
Exact-year queries are sent upstream only when both bounds are equal. Failed search-page or provider
lookups reject the snapshot and allow a complete retry. Best match preserves TMDB relevance order for a single media type. For All, it interleaves
movies and TV by upstream rank, with movies first on ties; it does not substitute popularity
for relevance. Other title-search sorts order the collected set before pagination. Unfiltered
Best match searches retain TMDB's page boundaries; browsing without a query uses TMDB's native filters.

## Getting Started

**Prerequisites:** Node.js and a TMDB API key ([get one here](https://www.themoviedb.org/settings/api)).

```bash
npm install --production=false
cp .env.example .env.local   # then set TMDB_API_KEY
npm run dev                  # http://localhost:3000
```

## Scripts

| Command                   | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `npm run dev`             | Start the dev server                                      |
| `npm run build` / `start` | Production build / server                                 |
| `npm run lint`            | ESLint                                                    |
| `npm run format`          | Prettier (`format:check` to verify only)                  |
| `npm test`                | Jest unit tests (`test:watch` for watch mode)             |
| `npm run test:e2e`        | Playwright E2E tests (see [e2e/README.md](e2e/README.md)) |
| `npm run test:all`        | Unit + E2E                                                |

## Project Structure

```
app/            Next.js App Router: routes, API handlers, components, hooks, views, utils
__tests__/      Jest unit & integration tests (mirrors app/)
e2e/            Playwright specs, page objects, fixtures and API mocks
docs/           Agent workflow docs and design specs/plans
```

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript 5.9 (strict) · TailwindCSS 3 + shadcn/ui ·
Jest 30 + React Testing Library 16 · Playwright

## Further Reading

[CLAUDE.md](CLAUDE.md) is the detailed developer guide: architecture, API reference, coding
conventions and testing strategy.
