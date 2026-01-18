# CLAUDE.md - AI Assistant Guide

This document provides comprehensive guidance for AI assistants working on the WhereToStream project. It explains the codebase structure, development workflows, testing conventions, and architectural patterns.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Development Workflows](#development-workflows)
5. [Coding Conventions](#coding-conventions)
6. [Architecture Patterns](#architecture-patterns)
7. [Testing Strategy](#testing-strategy)
8. [API Design](#api-design)
9. [Component Patterns](#component-patterns)
10. [Common Tasks](#common-tasks)

---

## Project Overview

**WhereToStream** is a Next.js application for finding streaming availability of movies and TV shows across multiple countries. It integrates with The Movie Database (TMDB) API to provide search, filtering, and detailed title information.

### Key Features

- Multi-criteria search (movies, TV shows, or both)
- Autocomplete search suggestions
- Advanced filtering (genre, year, language, rating)
- Streaming availability by country
- Preferred countries (DE, GB, US, CA) shown first
- Responsive design with dark theme
- Accessibility-first approach

---

## Technology Stack

### Core Technologies

- **Next.js 16** (App Router)
- **React 18**
- **TypeScript 5.9** (strict mode enabled)
- **TailwindCSS 3** for styling

### Development Tools

- **ESLint** with Next.js config + Prettier integration
- **Prettier** for code formatting
- **Jest 30** + React Testing Library 16 for unit tests
- **Playwright 1.56** for E2E tests with visual regression
- **Node.js** (check `package.json` for version requirements)

### Key Dependencies

- `@testing-library/react` - Component testing
- `@testing-library/jest-dom` - Jest matchers
- `@testing-library/user-event` - User interaction simulation
- `@playwright/test` - E2E testing framework

---

## Project Structure

```
where-to-stream/
├── app/                          # Next.js App Router directory
│   ├── api/                      # API Routes
│   │   ├── genres/route.ts       # GET /api/genres
│   │   ├── search/route.ts       # GET /api/search
│   │   ├── title/[type]/[id]/route.ts  # GET /api/title/:type/:id
│   │   └── errorMapping.ts       # TMDB to HTTP status mapping
│   ├── components/               # React components
│   │   ├── AutocompleteList.tsx
│   │   ├── ErrorBanner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── ResultDetails.tsx
│   │   ├── ResultItem.tsx
│   │   ├── ResultsList.tsx
│   │   ├── SearchForm.tsx
│   │   └── SearchHistory.tsx
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAutocomplete.ts
│   │   ├── useGenres.ts
│   │   ├── useSearch.ts
│   │   └── useSearchHistory.ts
│   ├── utils/                    # Utility functions
│   │   ├── countries.ts          # Country data/utilities
│   │   ├── logger.ts             # Logging utilities
│   │   ├── searchHistory.ts      # Search history management
│   │   └── tmdb.ts               # TMDB utility functions
│   ├── availabilityMapper.ts     # Maps TMDB providers to availability model
│   ├── cache.ts                  # In-memory cache with TTL
│   ├── config.ts                 # Configuration & env validation
│   ├── globals.css               # Global styles + Tailwind
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   ├── tmdbApi.ts                # High-level TMDB API methods
│   ├── tmdbClient.ts             # Low-level TMDB HTTP client
│   ├── tmdbTypes.ts              # TMDB API type definitions
│   └── types.ts                  # Application type definitions
├── __tests__/                    # Unit & integration tests
│   ├── app/api/                  # API route tests
│   ├── components/               # Component tests
│   ├── hooks/                    # Hook tests
│   └── utils/                    # Utility tests
├── e2e/                          # End-to-end tests
│   ├── fixtures/                 # Playwright fixtures
│   ├── helpers/                  # Test helpers & mocks
│   ├── pages/                    # Page Object Models
│   └── tests/                    # E2E test specs
├── .env.example                  # Environment variables template
├── .prettierrc.json              # Prettier configuration
├── eslint.config.mjs             # ESLint configuration
├── jest.config.js                # Jest configuration
├── jest.setup.tsx                # Jest setup
├── next.config.js                # Next.js configuration
├── playwright.config.ts          # Playwright configuration
├── postcss.config.js             # PostCSS configuration
├── tailwind.config.ts            # Tailwind configuration
└── tsconfig.json                 # TypeScript configuration
```

---

## Development Workflows

### Initial Setup

```bash
# Install dependencies
npm install --production=false

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your TMDB_API_KEY
# Get API key from: https://www.themoviedb.org/settings/api

# Start development server
npm run dev
# Access at http://localhost:3000
```

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Building
npm run build            # Production build
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without changes

# Testing
npm test                 # Run Jest unit tests
npm run test:watch       # Run Jest in watch mode
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run E2E tests with UI mode
npm run test:e2e:debug   # Debug E2E tests
npm run test:e2e:headed  # Run E2E tests in headed mode
npm run test:e2e:chromium # Run E2E tests in Chromium only
npm run test:e2e:report  # Show Playwright test report
npm run test:all         # Run all tests (unit + E2E)
```

### Git Workflow

1. **Always work on feature branches** (never push to main directly)
2. **Create descriptive commit messages** following conventional commits style
3. **Run tests before committing** to ensure nothing breaks
4. **Format code** before committing (automatically enforced by ESLint+Prettier)

---

## Coding Conventions

### TypeScript

- **Strict mode enabled** - All TypeScript strict checks are active
- **Target ES2017** - Modern JavaScript features available
- **Use explicit types** - Avoid implicit `any`
- **Use path alias `@/`** - Maps to project root (e.g., `@/app/types`)

```typescript
// Good
import { NormalizedSearchResult } from '@/app/types';

// Bad
import { NormalizedSearchResult } from '../../../app/types';
```

### Code Formatting (Prettier)

**Configuration** (`.prettierrc.json`):

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**Key Points:**

- Single quotes for strings
- Semicolons required
- 100-character line limit
- 2-space indentation
- Always use arrow function parentheses
- LF line endings

### File Naming

- **Components**: PascalCase (e.g., `SearchForm.tsx`, `ResultItem.tsx`)
- **Utilities/Hooks**: camelCase (e.g., `tmdbClient.ts`, `useSearch.ts`)
- **API Routes**: `route.ts` in descriptive folders
- **Tests**: Match source file name with `.test.ts` or `.test.tsx` suffix
- **E2E Tests**: Descriptive name with `.e2e.spec.ts` suffix

### Component Structure

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { SomeType } from '@/app/types';

// 2. Interface definitions
interface ComponentProps {
  prop1: string;
  prop2?: number;
  onAction: (data: SomeType) => void;
}

// 3. Component definition
const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2, onAction }) => {
  // 4. State hooks
  const [state, setState] = useState('');

  // 5. Effect hooks
  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  // 6. Event handlers
  const handleClick = () => {
    // Handler logic
  };

  // 7. Render
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};

// 8. Export
export default ComponentName;
```

### Documentation

- **JSDoc comments** for public functions, especially in utilities and API clients
- **Inline comments** for complex logic only (prefer self-documenting code)
- **Type definitions** instead of long comments when possible

```typescript
/**
 * Retrieves the TMDB API key from environment variables.
 * @throws {Error} If TMDB_API_KEY is not set or is empty
 * @returns {string} The TMDB API key
 */
export function getTmdbApiKey(): string {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('TMDB_API_KEY is not set');
  }
  return apiKey;
}
```

---

## Architecture Patterns

### Layered Architecture

The application follows a clear separation of concerns:

```
UI Layer (Components)
       ↓
Business Logic (Hooks, Utils)
       ↓
API Layer (Route Handlers)
       ↓
Service Layer (tmdbApi.ts)
       ↓
HTTP Client (tmdbClient.ts)
       ↓
External API (TMDB)
```

### Key Modules

#### 1. Configuration (`app/config.ts`)

Centralizes all environment variables and constants. **Always use this for configuration values.**

```typescript
import { getTmdbApiKey, PREFERRED_COUNTRIES, CACHE_TTL_SECONDS } from '@/app/config';
```

#### 2. TMDB Client (`app/tmdbClient.ts`)

Low-level HTTP client with error handling. **Use this for raw TMDB API calls.**

- Handles authentication
- Provides typed error handling (`TmdbError`)
- Returns raw TMDB responses

#### 3. TMDB API (`app/tmdbApi.ts`)

High-level domain methods. **Prefer this over direct client usage.**

- `searchMovies(params)` - Search movies
- `searchTv(params)` - Search TV shows
- `getMovieDetails(id)` - Get movie details
- `getTvDetails(id)` - Get TV details
- `getWatchProviders(type, id)` - Get streaming availability
- `getGenres()` - Get genre lists

#### 4. Cache (`app/cache.ts`)

In-memory cache with TTL. **Use for expensive API calls.**

```typescript
import { getCache, setCache } from '@/app/cache';

// Check cache first
let data = getCache<DataType>(cacheKey);
if (!data) {
  data = await fetchFromAPI();
  setCache(cacheKey, data, CACHE_TTL_SECONDS);
}
```

#### 5. Type Definitions

- `app/types.ts` - Application domain types
- `app/tmdbTypes.ts` - TMDB API response types

**Always use application types in components and API routes, TMDB types only in service layer.**

#### 6. Error Handling

- TMDB errors are mapped to HTTP status codes in `app/api/errorMapping.ts`
- API routes should catch `TmdbError` and return appropriate responses
- Components receive standardized error messages

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

**Location:** `__tests__/` directory mirroring source structure

**Naming:** `*.test.ts` or `*.test.tsx`

**Patterns:**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const handleClick = jest.fn();
    render(<ComponentName onClick={handleClick} />);

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

**Key Principles:**

- Test user-facing behavior, not implementation details
- Use accessible queries (`getByRole`, `getByLabelText`) over test IDs
- Mock external dependencies (API calls, TMDB client)
- Test error states and edge cases
- Keep tests focused and isolated

### E2E Tests (Playwright)

**Location:** `e2e/tests/` directory

**Naming:** `*.e2e.spec.ts`

**Configuration:** Port 3001 for E2E tests (configured in `playwright.config.ts`)

**Structure:**

- `e2e/pages/` - Page Object Models (POM)
- `e2e/helpers/` - API mocks and test data
- `e2e/fixtures/` - Playwright fixtures

**Example:**

```typescript
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Feature Name', () => {
  test('should perform action', async ({ homePage, page }) => {
    await homePage.search('Fight Club');
    await homePage.waitForResults();

    const resultsCount = await homePage.getResultsCount();
    expect(resultsCount).toBeGreaterThan(0);
  });
});
```

**Test Categories:**

- `search.e2e.spec.ts` - Search functionality
- `autocomplete.e2e.spec.ts` - Autocomplete behavior
- `filters.e2e.spec.ts` - Filter interactions
- `results.e2e.spec.ts` - Result display
- `accessibility.e2e.spec.ts` - Accessibility compliance
- `responsive.e2e.spec.ts` - Responsive design
- `visual-regression.e2e.spec.ts` - Visual regression testing
- `error-handling.e2e.spec.ts` - Error scenarios

### Testing Best Practices

1. **Write tests for new features** - Every new component/function should have tests
2. **Update tests when changing behavior** - Keep tests synchronized with code
3. **Mock API calls** - Use fixtures/mocks to avoid hitting real TMDB API
4. **Test accessibility** - Ensure components are keyboard navigable and screen-reader friendly
5. **Run tests before committing** - Use `npm test` and `npm run test:e2e`

---

## API Design

### API Routes

All API routes follow RESTful conventions and return JSON responses.

#### GET `/api/genres`

Returns combined movie and TV genres.

**Response:**

```json
{
  "movie": [{ "id": 28, "name": "Action" }],
  "tv": [{ "id": 10759, "name": "Action & Adventure" }]
}
```

#### GET `/api/search`

Search for movies/TV with filters.

**Query Parameters:**

- `query` (required): Search term
- `type`: `"movie" | "tv" | "all"` (default: `"all"`)
- `mode`: `"autocomplete" | "full"` (default: `"full"`)
- `page`: Page number (default: 1)
- `yearFrom`, `yearTo`: Year range
- `language`: ISO 639-1 code
- `genreIds`: Comma-separated genre IDs
- `minRating`: Minimum rating (0-10)

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
      "posterUrl": "https://...",
      "rating": 8.4,
      "genres": [18],
      "overview": "...",
      "popularity": 50.5
    }
  ]
}
```

**Autocomplete Mode:**

When `mode=autocomplete`, response includes minimal fields for performance (id, type, title, year, posterUrl, popularity).

#### GET `/api/title/:type/:id`

Get detailed information about a specific title.

**Path Parameters:**

- `type`: `"movie" | "tv"`
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
  "posterUrl": "https://...",
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

### Error Responses

All API routes return consistent error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common Status Codes:**

- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (unexpected error)
- `502` - Bad Gateway (TMDB API error)

---

## Component Patterns

### Accessibility

**All components must be accessible.** Follow these guidelines:

1. **Semantic HTML** - Use proper HTML5 elements (`<button>`, `<nav>`, `<main>`)
2. **ARIA labels** - Add `aria-label` when text isn't visible
3. **Keyboard navigation** - All interactive elements must be keyboard accessible
4. **Focus management** - Manage focus for modals, dropdowns, autocomplete
5. **Color contrast** - Ensure text meets WCAG AA standards (handled by theme)

```typescript
// Good - Accessible button
<button
  type="button"
  onClick={handleClick}
  aria-label="Close dialog"
>
  <CloseIcon />
</button>

// Bad - Non-semantic div
<div onClick={handleClick}>
  <CloseIcon />
</div>
```

### Form Handling

Use controlled components with React state:

```typescript
const [query, setQuery] = useState('');

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  onSearch({ query });
};

return (
  <form onSubmit={handleSubmit}>
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      aria-label="Search query"
    />
    <button type="submit">Search</button>
  </form>
);
```

### Custom Hooks

Extract reusable logic into custom hooks:

```typescript
// app/hooks/useSearch.ts
export function useSearch() {
  const [results, setResults] = useState<NormalizedSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/search?...');
      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  return { results, isLoading, error, search };
}
```

### Styling (TailwindCSS)

**Use Tailwind utility classes directly in components.**

```typescript
<div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
  <h2 className="text-xl font-bold text-white">Title</h2>
  <button className="px-4 py-2 bg-primary hover:bg-primary-dark rounded">
    Action
  </button>
</div>
```

**Theme Colors:**

- Background: `bg-gray-900` (near-black)
- Text: `text-gray-200`
- Primary Accent: `text-primary` (cyan/neon blue)
- Secondary Accent: `text-secondary` (warm orange)

**Custom configuration is in `tailwind.config.ts`.**

---

## Common Tasks

### Adding a New Component

1. Create component file in `app/components/ComponentName.tsx`
2. Define props interface
3. Implement component following structure guidelines
4. Add accessibility features
5. Create test file in `__tests__/components/ComponentName.test.tsx`
6. Write unit tests covering main functionality
7. Add to relevant E2E tests if needed
8. Export and use in parent component

### Adding a New API Route

1. Create route file: `app/api/endpoint-name/route.ts`
2. Import necessary TMDB API functions
3. Implement route handler with proper typing
4. Add error handling (catch `TmdbError`)
5. Map TMDB errors to HTTP status codes
6. Create test file: `__tests__/app/api/endpoint-name/route.test.ts`
7. Write tests with mocked TMDB client
8. Update this documentation with API details

### Adding a New Utility Function

1. Create/add to appropriate file in `app/utils/`
2. Add JSDoc comments
3. Create test file in `__tests__/utils/`
4. Write comprehensive unit tests
5. Export from utility file

### Adding a New Type

1. Determine if it's application or TMDB type
2. Add to `app/types.ts` (application) or `app/tmdbTypes.ts` (TMDB API)
3. Use interface for object types, type for unions/primitives
4. Export for use in other modules

### Modifying TMDB Integration

1. Check if change is in client (`tmdbClient.ts`) or API (`tmdbApi.ts`)
2. Update types in `tmdbTypes.ts` if TMDB response structure changes
3. Update availability mapper if provider data changes
4. Update cache TTL if needed
5. Test thoroughly with mocked data
6. Update documentation

### Adding E2E Tests

1. Create test file in `e2e/tests/feature-name.e2e.spec.ts`
2. Use existing Page Object Models or create new ones
3. Use fixtures from `e2e/fixtures/test-fixtures.ts`
4. Mock API calls in `e2e/helpers/api-mock.ts`
5. Follow existing test patterns
6. Run tests across all browsers: `npm run test:e2e`

---

## Environment Variables

**Required:**

- `TMDB_API_KEY` - TMDB API key (get from https://www.themoviedb.org/settings/api)

**Setup:**

```bash
cp .env.example .env.local
# Edit .env.local and add your API key
```

**Access in code:**

```typescript
import { getTmdbApiKey } from '@/app/config';

const apiKey = getTmdbApiKey(); // Throws if not set
```

---

## Key Conventions Summary

### DO:

- ✅ Use TypeScript strict mode
- ✅ Follow Prettier formatting rules
- ✅ Write accessible components (ARIA, semantic HTML, keyboard nav)
- ✅ Use path alias `@/` for imports
- ✅ Write tests for new features
- ✅ Use custom hooks for reusable logic
- ✅ Cache expensive API calls
- ✅ Handle errors gracefully
- ✅ Use Page Object Models for E2E tests
- ✅ Document complex functions with JSDoc

### DON'T:

- ❌ Push directly to main branch
- ❌ Skip tests
- ❌ Use `any` type unless absolutely necessary
- ❌ Hardcode configuration values (use `config.ts`)
- ❌ Make raw TMDB API calls (use `tmdbApi.ts`)
- ❌ Bypass cache for frequent API calls
- ❌ Use test IDs for testing (prefer accessible queries)
- ❌ Commit without formatting code
- ❌ Create non-accessible components

---

## Additional Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **TailwindCSS Docs**: https://tailwindcss.com/docs
- **Testing Library Docs**: https://testing-library.com/docs/react-testing-library/intro
- **Playwright Docs**: https://playwright.dev/docs/intro
- **TMDB API Docs**: https://developer.themoviedb.org/docs

---

## Questions or Issues?

When working on this project:

1. **Read this guide first** - Most questions are answered here
2. **Check existing code** - Look for similar patterns in the codebase
3. **Review tests** - Tests demonstrate expected behavior
4. **Consult documentation** - Links provided above
5. **Ask for clarification** - If something is unclear, ask the team

---

**Last Updated:** 2026-01-18

**Document Version:** 1.0.0
