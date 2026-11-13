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
