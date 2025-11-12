# WhereToStream

A Next.js application to find where movies and TV shows are streaming. Search for movies and TV series, view detailed information, and discover streaming availability across multiple countries.

## Features

- **Search for Movies and TV Shows**: Search across both movies and TV series with autocomplete suggestions
- **View Streaming Availability**: See where titles are available to stream by country, with preferred countries (DE, GB, US, CA) shown first
- **Autocomplete Search**: Get instant search suggestions as you type
- **Advanced Filtering**: Filter results by:
  - Genre (multi-select)
  - Year range (from/to)
  - Language
  - Minimum rating
- **Detailed Title Information**: View comprehensive details including:
  - Title, year, genres, overview
  - Rating and runtime
  - Streaming availability with Netflix detection
  - Free/ad-supported provider listings
  - Direct watch links where available

## Project Setup

This project has been initialized with:

- **Next.js 16** (App Router)
- **React 18** & **TypeScript 5.9**
- **TailwindCSS 3** with dark theme configuration
- **Jest 30** & **React Testing Library 16** for testing

## Getting Started

### Prerequisites

- Node.js (version specified in `package.json` engines or `.nvmrc` if present)
- A TMDB API key ([Get one here](https://www.themoviedb.org/settings/api))

### Install Dependencies

```bash
npm install --production=false
```

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
TMDB_API_KEY=your_api_key_here
```

**Note**: Replace `your_api_key_here` with your actual TMDB API key. You can obtain a free API key by creating an account at [TMDB](https://www.themoviedb.org/) and navigating to your account settings.

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Run Tests

```bash
npm test
```

For watch mode:

```bash
npm run test:watch
```

### Build for Production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Project Structure

```
where-to-stream/
├── app/
│   ├── api/                    # API routes
│   │   ├── genres/
│   │   │   └── route.ts        # GET /api/genres - Fetch movie and TV genres
│   │   ├── search/
│   │   │   └── route.ts        # GET /api/search - Search movies/TV with filters
│   │   └── title/
│   │       └── [type]/
│   │           └── [id]/
│   │               └── route.ts # GET /api/title/:type/:id - Get title details & availability
│   ├── components/             # React components
│   │   ├── AutocompleteList.tsx
│   │   ├── ErrorBanner.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── ResultDetails.tsx
│   │   ├── ResultItem.tsx
│   │   ├── ResultsList.tsx
│   │   └── SearchForm.tsx
│   ├── availabilityMapper.ts   # Maps TMDB watch providers to availability model
│   ├── cache.ts                # In-memory cache with TTL
│   ├── config.ts               # Configuration constants and env validation
│   ├── globals.css             # Global styles with TailwindCSS
│   ├── layout.tsx              # Root layout component
│   ├── page.tsx                # Home page component
│   ├── tmdbApi.ts              # High-level TMDB API methods
│   ├── tmdbClient.ts           # Low-level TMDB HTTP client
│   ├── tmdbTypes.ts            # TMDB API type definitions
│   └── types.ts                # Application type definitions
├── __tests__/                  # Test files
│   ├── components/             # Component tests
│   └── *.test.ts               # Unit and integration tests
├── jest.config.js              # Jest configuration
├── jest.setup.ts               # Jest setup file
├── next.config.js              # Next.js configuration
├── tailwind.config.ts          # TailwindCSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Project dependencies and scripts
```

## API Endpoints

The application exposes three main API endpoints:

### `GET /api/genres`

Returns combined movie and TV genres from TMDB.

**Response:**
```json
{
  "movie": [{ "id": 28, "name": "Action" }, ...],
  "tv": [{ "id": 10759, "name": "Action & Adventure" }, ...]
}
```

### `GET /api/search`

Searches for movies and/or TV shows with optional filters.

**Query Parameters:**
- `query` (required): Search query string
- `type`: `"movie"`, `"tv"`, or `"all"` (default: `"all"`)
- `mode`: `"autocomplete"` or `"full"` (default: `"full"`)
- `page`: Page number (default: 1)
- `yearFrom`: Filter by minimum year (optional)
- `yearTo`: Filter by maximum year (optional)
- `language`: ISO 639-1 language code (optional)
- `genreIds`: Comma-separated genre IDs (optional)
- `minRating`: Minimum rating (optional)

**Response:**
```json
{
  "page": 1,
  "totalPages": 10,
  "totalResults": 200,
  "results": [
    {
      "id": 550,
      "type": "movie",
      "title": "Fight Club",
      "year": 1999,
      "posterUrl": "https://image.tmdb.org/t/p/w500/...",
      "rating": 8.4,
      "genres": [18],
      "overview": "...",
      "popularity": 50.5
    }
  ]
}
```

### `GET /api/title/:type/:id`

Returns detailed information about a specific movie or TV show, including streaming availability.

**Path Parameters:**
- `type`: `"movie"` or `"tv"`
- `id`: TMDB ID (positive integer)

**Response:**
```json
{
  "id": 550,
  "type": "movie",
  "title": "Fight Club",
  "originalTitle": "Fight Club",
  "year": 1999,
  "genres": [{ "id": 18, "name": "Drama" }],
  "overview": "...",
  "rating": 8.4,
  "posterUrl": "https://image.tmdb.org/t/p/w500/...",
  "runtime": 139,
  "availability": {
    "preferredCountries": [
      {
        "countryCode": "US",
        "countryName": "United States",
        "hasNetflix": true,
        "freeOrAdsProviders": ["Netflix"],
        "watchLink": "https://..."
      }
    ],
    "otherCountries": [...]
  }
}
```

## Dark Theme Configuration

The project uses a custom dark theme configured in `tailwind.config.ts`:

- **Background**: Near-black (`#0a0a0f`)
- **Text**: Light gray (`#e0e0e0`)
- **Primary Accent**: Cyan/neon blue (`#00d4ff`)
- **Secondary Accent**: Warm orange (`#ff6b35`)

## Testing

Tests are configured using:

- **Jest** with jsdom environment
- **React Testing Library** for component testing
- **@testing-library/jest-dom** for additional matchers

Example test file is located at `__tests__/page.test.tsx`.

## Architecture

The application follows a modular architecture:

- **Configuration** (`config.ts`): Centralizes environment variables and constants
- **TMDB Client** (`tmdbClient.ts`): Low-level HTTP client for TMDB API with error handling
- **TMDB API** (`tmdbApi.ts`): High-level domain methods for searching and fetching data
- **Cache** (`cache.ts`): In-memory caching layer with TTL for API responses
- **Availability Mapper** (`availabilityMapper.ts`): Transforms TMDB watch provider data into a structured availability model
- **API Routes**: Next.js API routes that handle requests, call TMDB, and return normalized responses
- **Components**: React components for UI, following accessibility best practices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.9
- **Styling**: TailwindCSS 3
- **Testing**: Jest 30 + React Testing Library 16
- **Package Manager**: npm
