# WhereToStream – Architecture Blueprint and TDD Prompt Pack

This file contains:

1. A **high-level, step-by-step architecture and implementation blueprint** for the WhereToStream MVP.  
2. A **series of self-contained prompts** for a code-generation LLM, designed for test-driven, incremental implementation.

---

## 1. High-level Architecture Blueprint

### 1.1 Core technologies

- **Next.js (App Router) + React + TypeScript** for a full-stack web app.
- **TailwindCSS** for styling & dark theme.
- **Internal API endpoints** under `/api` for:
  - `GET /api/search`
  - `GET /api/title/:type/:id`
  - `GET /api/genres`
- **Modules**:
  - `tmdbClient` for TMDB calls.
  - `availabilityMapper` for watch-provider logic (Netflix, free/ad-supported, country grouping).
  - `cache` for in-memory caching with TTL.
  - `config` for constants + env validation.
- **Frontend components**:
  - `SearchForm`
  - `AutocompleteList`
  - `ResultsList`
  - `ResultItem`
  - `ResultDetails`
  - `Layout` / `Header` / `Footer`
- **Tests**:
  - Unit (modules)
  - Integration (API routes)
  - Component tests (React Testing Library)

---

### 1.2 Backend data flow

1. **Config & TMDB client**
   - Reads `TMDB_API_KEY` from env.
   - Validates presence; fails fast at startup.
   - Exposes typed methods: `searchMovies`, `searchTv`, `getMovieDetails`, `getTvDetails`, `getGenres`, `getWatchProviders`.

2. **Cache layer**
   - In-memory `Map<string, { value: T; expiresAt: number }>`
   - Helpers: `getCached(key)`, `setCached(key, value, ttlSeconds)`.

3. **Availability mapper**
   - Input: TMDB watch providers payload.
   - Output:
     - `preferredCountries[]` ordered as `["DE", "GB", "US", "CA"]`.
     - `otherCountries[]` sorted alphabetically.
   - Marks:
     - `hasNetflix: boolean` per country.
     - `freeOrAdsProviders: string[]` per country.

4. **API endpoints**
   - `/api/genres`
     - Reads genres for movie & tv, caches.
   - `/api/search`
     - Accepts query, filters, pagination, `mode=autocomplete|full`.
     - Normalizes TMDB results into a consistent shape.
   - `/api/title/:type/:id`
     - Fetches details and watch providers.
     - Uses `availabilityMapper`.
   - All endpoints:
     - Use cache where appropriate.
     - Map TMDB errors to appropriate HTTP codes.

---

### 1.3 Frontend flow

1. User sees a **dark-themed landing page** with:
   - Header with logo + “WhereToStream”.
   - Centered search card with:
     - Title input with autocomplete.
     - Filters (type, year range, language, genres, min rating).
   - Empty state / placeholder.

2. User types a title:
   - Autocomplete uses `/api/search?mode=autocomplete`.
   - Selecting suggestion yields a TMDB ID.

3. User submits search or selects suggestion:
   - **If suggestion selected**:
     - Immediately fetches `/api/title/:type/:id`.
   - **If not selected**:
     - Calls `/api/search?mode=full` with filters + pagination.
     - Shows `ResultsList` with `ResultItem` rows.

4. User expands a result:
   - `ResultDetails` fetches `/api/title/:type/:id`.
   - Shows poster, metadata, and availability table:
     - Preferred countries first (always shown).
     - “Other countries” section below if applicable.
     - Handles “No streaming availability found”.

---

### 1.4 Testing blueprint (TDD perspective)

- **Unit**
  - `tmdbClient`: URL building, query params, error handling, API key header.
  - `availabilityMapper`: Netflix detection, free/ads provider extraction, country grouping.
  - `cache`: TTL expiration & retrieval.
  - `config`: env validation.

- **Integration**
  - `/api/genres`: caching & mapping.
  - `/api/search`: query mapping, filters, pagination, error mapping.
  - `/api/title/:type/:id`: correct metadata & availability logic, error mapping.

- **Frontend**
  - `SearchForm`: rendering, validation, calling callback / API.
  - `AutocompleteList`: suggestions, keyboard & mouse selection.
  - `ResultsList` / `ResultItem`: rendering & expand/collapse.
  - `ResultDetails`: metadata rendering, availability table, message when no availability.

---

### 1.5 Phases → Chunks → Steps (Implementation Roadmap)

#### Phase 0 – Project scaffolding & tooling

**Chunk 0.1 – Base Next.js + TypeScript + Tailwind setup**

Steps:

1. Initialize a new Next.js App Router project (`create-next-app` with TS).
2. Configure ESLint & Prettier with recommended settings.
3. Install TailwindCSS and generate config, wire it into the project.
4. Implement base layout: dark background, main font, base color tokens in Tailwind.
5. Add a simple landing page (`app/page.tsx`) with placeholder text.
6. Add basic Jest & React Testing Library config, with a sample test that passes.

---

#### Phase 1 – Configuration & TMDB client

**Chunk 1.1 – Config module**

Steps:

1. Create `config.ts` with:
   - `TMDB_BASE_URL`
   - `PREFERRED_COUNTRIES = ["DE","GB","US","CA"]`
   - `CACHE_TTL_SECONDS` defaults.
2. Implement runtime env validation for `TMDB_API_KEY`.
3. Write unit tests verifying:
   - Missing `TMDB_API_KEY` causes a clear error.
   - `PREFERRED_COUNTRIES` ordering is correct.

**Chunk 1.2 – TMDB client core**

Steps:

1. Implement `tmdbClient.ts` with:
   - A generic `get(path, params)` helper.
   - Sets base URL, API key header / param.
2. Add methods:
   - `searchMovies`
   - `searchTv`
   - `getMovieDetails`
   - `getTvDetails`
   - `getMovieWatchProviders`
   - `getTvWatchProviders`
   - `getMovieGenres`
   - `getTvGenres`
3. Unit tests for:
   - Correct URL paths for each method.
   - Correct query param mapping.
   - Error mapping when TMDB returns 4xx/5xx.

---

#### Phase 2 – Cache layer

**Chunk 2.1 – In-memory cache implementation**

Steps:

1. Implement `cache.ts` with:
   - `setCache(key, value, ttlSeconds)`
   - `getCache(key)`
2. Add TTL logic:
   - Store `expiresAt` timestamp.
   - `getCache` returns `undefined` if expired.
3. Add unit tests:
   - Values are returned before expiry.
   - Values are not returned after expiry.

**Chunk 2.2 – Cache integration with TMDB client**

Steps:

1. Define cache keys:
   - `search::<hash>`
   - `title::<type>::<id>`
   - `genres`
2. Wrap `tmdbClient` methods using cache:
   - `getMovieGenres`, `getTvGenres` cached for long TTL.
   - `searchMovies`, `searchTv`, details, providers cached with shorter TTL.
3. Integration-style tests with mocked TMDB:
   - First call hits mock; second call reads from cache.

---

#### Phase 3 – Availability mapper

**Chunk 3.1 – Basic mapping**

Steps:

1. Implement `availabilityMapper.ts` that accepts TMDB provider payload.
2. For each country in payload:
   - Collect Netflix providers (by `provider_name` or ID).
   - Collect free/ad-supported providers (categories `free`, `ads` if present).
3. Build normalized structure:
   - `{ countryCode, countryName, hasNetflix, freeOrAdsProviders, watchLink }`.

**Chunk 3.2 – Preferred vs other country grouping**

Steps:

1. Use `PREFERRED_COUNTRIES` from config to build `preferredCountries[]` (all four always present).
2. Build `otherCountries[]` from remaining countries with any provider.
3. Sort `otherCountries` alphabetically.
4. Add unit tests for:
   - Missing country in providers still appears in `preferredCountries` with `hasNetflix=false` & no free providers.
   - Countries outside preferred list appear in `otherCountries`.
   - “No availability” scenario (no providers at all).

---

#### Phase 4 – `/api/genres` endpoint

**Chunk 4.1 – Route handler**

Steps:

1. Implement `GET /api/genres` route.
2. It calls `tmdbClient.getMovieGenres` and `.getTvGenres`.
3. Uses cache via the client-level caching.
4. Returns a normalized JSON shape:
   - `{ movie: Genre[], tv: Genre[] }`.

**Chunk 4.2 – Tests**

Steps:

1. Integration tests for:
   - Successful response with both lists.
   - Error mapping when TMDB fails.

---

#### Phase 5 – `/api/search` endpoint

**Chunk 5.1 – Parameter parsing & validation**

Steps:

1. Implement `GET /api/search` route.
2. Parse query params:
   - `query` (required)
   - `type` (default `all`)
   - `yearFrom`, `yearTo`
   - `language`
   - `genreIds`
   - `minRating`
   - `page` (default 1)
   - `mode` (`autocomplete` | `full`, default `full`)
3. Validate and normalise params (numbers, ranges).

**Chunk 5.2 – TMDB calls & normalization**

Steps:

1. For `type=movie` or `type=tv`, call the appropriate TMDB search endpoint.
2. For `type=all`:
   - Call both `searchMovies` and `searchTv`, merge + sort by popularity.
3. Normalize results:
   - `id`, `type`, `title`, `year`, `posterUrl`, `rating`, `genres`, `overview`, `popularity`.
4. Pagination: return `page`, `totalPages`, `totalResults`.

**Chunk 5.3 – Mode handling & tests**

Steps:

1. Implement `mode=autocomplete` to:
   - Return only minimal fields needed for suggestions:
     - `id`, `type`, `title`, `year`, `posterThumbnailUrl`.
2. Write integration tests for:
   - Full mode with filters.
   - Autocomplete mode.
   - Pagination.
   - Error mapping.

---

#### Phase 6 – `/api/title/:type/:id` endpoint

**Chunk 6.1 – Details & providers retrieval**

Steps:

1. Implement route `GET /api/title/[type]/[id]`.
2. Validate `type` ∈ {`movie`,`tv`}.
3. Call `getMovieDetails`/`getTvDetails` and `getMovieWatchProviders`/`getTvWatchProviders`.
4. Normalize metadata:
   - `id`, `type`, `title`, `originalTitle`, `year`, `genres`, `overview`, `rating`, `posterUrl`, `runtime` (if available).

**Chunk 6.2 – Availability mapping**

Steps:

1. Pass providers payload to `availabilityMapper`.
2. Return:
   - `availability.preferredCountries[]`
   - `availability.otherCountries[]`
3. Integration tests for:
   - Preferred country block always present.
   - “No availability” message conditions.

---

#### Phase 7 – UI Shell: Layout, Header, Footer

**Chunk 7.1 – Layout & theme**

Steps:

1. Implement main layout with:
   - Dark background gradient.
   - Base typography styles.
2. Add branded header component:
   - Logo placeholder + “WhereToStream”.
3. Add footer:
   - TMDB disclaimer text.
4. Component tests:
   - Header renders name.
   - Footer renders disclaimers.

---

#### Phase 8 – Search form & filters

**Chunk 8.1 – SearchForm component**

Steps:

1. Implement `SearchForm` with:
   - Title text input.
   - Type dropdown (movie/tv/all).
   - Year range inputs.
   - Language dropdown.
   - Genre multi-select (populated from `/api/genres`).
   - Min rating slider or input.
2. Wire form submission to a callback prop.

**Chunk 8.2 – AutocompleteList**

Steps:

1. Implement `AutocompleteList`:
   - Receives suggestions + onSelect callback.
2. Integrate with SearchForm:
   - On input change, call `/api/search?mode=autocomplete`.
   - Display results in a dropdown.
3. Tests:
   - Form renders all fields.
   - Autocomplete triggers on typing.
   - Selection passes ID & type to parent.

---

#### Phase 9 – Results list & item details

**Chunk 9.1 – ResultsList & ResultItem**

Steps:

1. Implement `ResultsList` that:
   - Accepts results & pagination metadata.
   - Renders `ResultItem` rows with poster, title, year, type, rating, genre tags.
2. Implement pagination controls:
   - Next/Previous emitting callbacks.

**Chunk 9.2 – ResultDetails**

Steps:

1. Implement `ResultDetails`:
   - Receives `type` + `id`.
   - Fetches `/api/title/:type/:id` on expand.
2. Renders:
   - Large poster, title, year, type, genres, overview, rating.
   - Availability table:
     - Preferred countries section.
     - Other countries section.
     - “No streaming availability found” state.
3. Tests:
   - Expanding triggers fetch.
   - Correct states for no availability.

---

#### Phase 10 – Error handling, UX polish & manual QA

**Chunk 10.1 – Error states**

Steps:

1. Add generic error banner for API failures.
2. Add “No titles found” handling in search results.
3. Add loading spinners where needed.

**Chunk 10.2 – Manual QA & cross-browser**

Steps:

1. Test flows (popular title, obscure title, no availability).
2. Check desktop and mobile views.
3. Validate keyboard accessibility for key interactions.

---

## 2. TDD-focused LLM Prompts

Each prompt below is **self-contained** and tagged as `text`.  
They are intended to be used sequentially, but none references another prompt directly.

---

### Prompt 1 – Initialize Next.js + Tailwind + Testing Skeleton

```text
You are an expert TypeScript and Next.js engineer following strict test-driven development (TDD).

Task:
Set up a new Next.js App Router project called "WhereToStream" with TypeScript, TailwindCSS for styling, and a basic Jest + React Testing Library test setup.

Requirements:
1. Project setup:
   - Assume the project already exists as a Next.js 13+ App Router TypeScript project.
   - Configure TailwindCSS with a dark-theme oriented base (no custom design yet, just base tokens and dark background).
   - Ensure global styles make the body background dark and text light.

2. Testing setup:
   - Configure Jest for a Next.js + React Testing Library environment.
   - Add a simple example test for a trivial component or the root page to verify the test runner works.

3. Implementation details:
   - Use TypeScript everywhere.
   - Ensure tests can be run via `npm test` or `yarn test`.
   - Do not introduce any domain-specific logic yet.

TDD instructions:
1. First, describe the tests you will create in a concise list.
2. Then write the actual test files.
3. Finally, implement the minimal code needed to make all tests pass.
4. Show the final relevant files (config, tests, components/pages) in full.
```

---

### Prompt 2 – Config Module with Env Validation & Preferred Countries

```text
You are an expert TypeScript backend engineer working in a Next.js App Router project called "WhereToStream". Use strict test-driven development (TDD).

Task:
Create a `config` module that centralizes configuration for the TMDB integration and application constants, including environment variable validation.

Requirements:
1. Implement a `config.ts` module that exports:
   - `TMDB_BASE_URL` as a string constant (e.g. "https://api.themoviedb.org/3").
   - `PREFERRED_COUNTRIES` as a tuple/readonly array in this exact order: ["DE", "GB", "US", "CA"].
   - `CACHE_TTL_SECONDS` for generic cache TTL (e.g. 12 * 60 * 60 for 12h).
   - A function `getTmdbApiKey()` that:
     - Reads `process.env.TMDB_API_KEY`.
     - Throws a clear error if missing, e.g. `"TMDB_API_KEY is not set"`.
     - Returns the string key otherwise.

2. TypeScript:
   - Use strict typing.
   - Ensure exported constants are readonly where appropriate.

3. Tests (Jest):
   - Test that `PREFERRED_COUNTRIES` is exactly in the order ["DE", "GB", "US", "CA"].
   - Test that `getTmdbApiKey()` throws when `TMDB_API_KEY` is undefined.
   - Test that `getTmdbApiKey()` returns the expected value when the env var is set.
   - Optionally test sane default for `CACHE_TTL_SECONDS`.

TDD instructions:
1. Start by listing the test cases.
2. Write the Jest tests for the `config` module.
3. Implement `config.ts` to satisfy the tests.
4. Show full contents of `config.ts` and its test file.
```

---

### Prompt 3 – TMDB HTTP Client with Generic GET Helper

```text
You are an expert in Node.js HTTP clients and TypeScript working in a Next.js project called "WhereToStream". Use strict TDD.

Task:
Create a reusable `tmdbClient` module that wraps TMDB’s HTTP API with a typed `get` helper, using the configuration from an existing `config.ts` (`TMDB_BASE_URL` and `getTmdbApiKey()`).

Requirements:
1. Implement `tmdbClient.ts` with:
   - A generic helper `tmdbGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>`.
   - The helper should:
     - Build a URL using `TMDB_BASE_URL` and the provided `path`.
     - Add query params from `params`.
     - Attach the TMDB API key as an `Authorization: Bearer <key>` header (or as required by TMDB v3/v4; choose one consistent scheme and document it in comments).
     - Handle network errors and non-2xx responses:
       - Throw a custom error including status code and a short message.

2. Error handling:
   - For non-2xx responses, throw an error class like `TmdbError` containing:
     - `status: number`
     - `statusText: string`
     - Optional `body` snippet if available.

3. Tests:
   - Mock `fetch` or the HTTP layer.
   - Test successful JSON response parsing.
   - Test URL building with query parameters.
   - Test that the Authorization header is set with the TMDB API key from config.
   - Test that non-2xx responses throw `TmdbError` with correct status.

4. TypeScript:
   - Ensure `tmdbGet` is generic and callers can specify the expected response type.
   - Export the `TmdbError` class.

TDD instructions:
1. List all test cases.
2. Write Jest tests (mocking `fetch`).
3. Implement `tmdbClient.ts` to make tests pass.
4. Show full code for `tmdbClient.ts` and its tests.
```

---

### Prompt 4 – TMDB Domain Methods (search, details, genres, providers)

```text
You are working in the "WhereToStream" Next.js project and already have a low-level `tmdbGet` helper and config in place. Use strict TDD.

Task:
Extend the TMDB client by adding domain-specific methods for movies, TV, genres, and watch providers.

Requirements:
1. In `tmdbClient.ts` (or a related `tmdbApi.ts` file), implement functions:
   - `searchMovies(params: { query: string; page?: number; year?: number; language?: string; withGenres?: string; voteAverageGte?: number; }): Promise<TmdbSearchResponse>`
   - `searchTv(params: { query: string; page?: number; firstAirDateYear?: number; language?: string; withGenres?: string; voteAverageGte?: number; }): Promise<TmdbSearchResponse>`
   - `getMovieDetails(id: number): Promise<TmdbMovieDetails>`
   - `getTvDetails(id: number): Promise<TmdbTvDetails>`
   - `getMovieWatchProviders(id: number): Promise<TmdbWatchProvidersResponse>`
   - `getTvWatchProviders(id: number): Promise<TmdbWatchProvidersResponse>`
   - `getMovieGenres(): Promise<TmdbGenreList>`
   - `getTvGenres(): Promise<TmdbGenreList>`

2. Use the official TMDB endpoints:
   - `/search/movie`
   - `/search/tv`
   - `/movie/{id}`
   - `/tv/{id}`
   - `/movie/{id}/watch/providers`
   - `/tv/{id}/watch/providers`
   - `/genre/movie/list`
   - `/genre/tv/list`

3. Types:
   - Define minimal TypeScript interfaces needed for these responses (no need to cover every TMDB field, only those used later: id, title/name, release_date/first_air_date, poster_path, vote_average, genre_ids, popularity, etc.).
   - Keep these types in a dedicated TMDB types file if appropriate.

4. Tests:
   - Unit tests that:
     - Verify each function calls `tmdbGet` with the correct path and parameters.
     - For search functions, verify mapping of the parameters to TMDB query params.
     - For details and providers, verify correct path (`/movie/${id}`, `/tv/${id}`, etc.).
   - You may mock `tmdbGet` rather than `fetch` directly.

TDD instructions:
1. Write down the list of test cases.
2. Implement Jest tests that mock the lower-level `tmdbGet`.
3. Implement the domain methods to satisfy the tests.
4. Show all relevant code and tests.
```

---

### Prompt 5 – Generic In-memory Cache with TTL

```text
You are an expert backend engineer implementing a small in-memory cache for "WhereToStream". Use strict TDD.

Task:
Create a generic in-memory cache module with TTL support to be used by the TMDB integration.

Requirements:
1. Implement a module `cache.ts` with:
   - `setCache<T>(key: string, value: T, ttlSeconds: number): void`
   - `getCache<T>(key: string): T | undefined`
   - Internal storage like `Map<string, { value: unknown; expiresAt: number }>`.

2. Behavior:
   - `setCache` stores the value with an expiration time of `Date.now() + ttlSeconds * 1000`.
   - `getCache`:
     - If the key is missing, returns `undefined`.
     - If the key is present but expired, removes it and returns `undefined`.
     - Otherwise returns the stored value cast to `T`.

3. Tests:
   - Retrieving a value before it expires returns the value.
   - Retrieving a value after expiry returns `undefined` and removes it.
   - Overwriting a key updates the value and expiry time.
   - Works with different value types (e.g. numbers, objects).

TDD instructions:
1. Describe the test scenarios.
2. Write Jest tests for `cache.ts`.
3. Implement `cache.ts` to satisfy all tests.
4. Show full code for the cache module and tests.
```

---

### Prompt 6 – TMDB Client + Cache Integration

```text
You are enhancing the TMDB integration for "WhereToStream" using an existing `cache.ts` and TMDB client methods. Use strict TDD.

Task:
Integrate the in-memory cache into selected TMDB methods, using consistent cache keys and TTLs from `config.ts`.

Requirements:
1. Caching policy:
   - `getMovieGenres`, `getTvGenres`:
     - Cache under a fixed key like `"genres:movie"` and `"genres:tv"` with a long TTL (e.g. 24h).
   - `searchMovies`, `searchTv`:
     - Cache under keys based on the full parameter set, e.g. `"search:movie:<hash>"` and `"search:tv:<hash>"`, with a moderate TTL (e.g. 12h).
   - `getMovieDetails`, `getTvDetails`, `getMovieWatchProviders`, `getTvWatchProviders`:
     - Cache under `"title:movie:<id>"`, `"title:tv:<id>"`, and `"providers:movie:<id>"`, `"providers:tv:<id>"` with a moderate TTL.

2. Implementation:
   - Implement a stable hash function for search parameters (e.g. JSON stringify + simple hash).
   - On each method call:
     - Check the cache first.
     - If a valid value exists, return it.
     - Otherwise call the underlying TMDB API, store in cache, then return.

3. Tests:
   - Use Jest and mock the low-level TMDB HTTP call (`tmdbGet` or equivalent).
   - Verify that the first call hits the mocked HTTP method and subsequent calls with the same parameters read from the cache.
   - Verify that different parameters result in different cache keys.

TDD instructions:
1. List test cases.
2. Implement Jest tests with proper mocking.
3. Implement caching integration to pass all tests.
4. Show updated TMDB methods and tests.
```

---

### Prompt 7 – Availability Mapper for Watch Providers

```text
You are implementing the streaming availability mapping for "WhereToStream". Use strict TDD.

Task:
Create an `availabilityMapper` module that converts TMDB watch provider payloads into an internal availability model, focusing on preferred countries and detection of Netflix and free/ad-supported providers.

Requirements:
1. Inputs:
   - The function `mapAvailability(tmdbProviders: TmdbWatchProvidersResponse)` where `tmdbProviders` follows TMDB’s `/movie/{id}/watch/providers` or `/tv/{id}/watch/providers` response shape:
     - It typically has a `results` object keyed by country code, each containing provider lists like `flatrate`, `ads`, `free` and possibly a `link`.

2. Config:
   - Use `PREFERRED_COUNTRIES` from `config.ts`: ["DE", "GB", "US", "CA"].

3. Output type:
   - Define an internal type like:
     ```ts
     interface CountryAvailability {
       countryCode: string;
       countryName: string;
       hasNetflix: boolean;
       freeOrAdsProviders: string[];
       watchLink?: string;
     }

     interface AvailabilityResult {
       preferredCountries: CountryAvailability[];
       otherCountries: CountryAvailability[];
     }
     ```
   - `countryName` can be a simple mapping based on country code (define a small internal map for at least DE, GB, US, CA; others can fall back to the code).

4. Behavior:
   - For each `PREFERRED_COUNTRIES` entry:
     - Always include a `CountryAvailability`, even if that country has no providers.
   - `hasNetflix` should be true if any provider in `flatrate`, `ads`, or `free` has `provider_name === "Netflix"` or a known Netflix provider ID.
   - `freeOrAdsProviders` should be the combined provider names from `free` and `ads` lists (unique, sorted).
   - `watchLink` should be taken from the country’s `link` field if present.
   - `otherCountries` should include all country codes in `tmdbProviders.results` that are not in `PREFERRED_COUNTRIES` and have at least one provider list.
   - Sort `otherCountries` alphabetically by `countryName`.

5. Tests:
   - Case with full data, including Netflix, free/ads providers, and links.
   - Case where some preferred countries have no data in TMDB but still appear with `hasNetflix=false` and empty `freeOrAdsProviders`.
   - Case where there are only non-preferred countries with availability.
   - Case where there is no availability anywhere (both preferred and other lists reflect no providers; preferred still listed).

TDD instructions:
1. Define test scenarios and expected outputs.
2. Implement Jest tests for `mapAvailability`.
3. Implement `availabilityMapper.ts` to satisfy tests.
4. Show full module and tests.
```

---

### Prompt 8 – `/api/genres` Route

```text
You are implementing a Next.js App Router API route for "WhereToStream". Use strict TDD.

Task:
Create a `GET /api/genres` route that returns cached TMDB genres for both movies and TV.

Requirements:
1. Route:
   - Implement in `app/api/genres/route.ts` (or equivalent App Router location).
   - On `GET`, call `getMovieGenres()` and `getTvGenres()` from the TMDB client.
   - Combine into a response:
     {
       "movie": [ { "id": number, "name": string }, ... ],
       "tv": [ { "id": number, "name": string }, ... ]
     }
   - Use the TMDB client’s internal caching (no extra cache wiring in the route).

2. Error handling:
   - If TMDB call fails with a known error, respond with HTTP 502 or 503 and a JSON body like:
     { "error": "Failed to fetch genres" } (plus optional diagnostic code).

3. Tests:
   - Use a Next.js-compatible testing approach (e.g. testing the route handler function directly with mocked TMDB client methods).
   - Test:
     - Successful response shape when both genre calls succeed.
     - Error response when either call throws an error.

TDD instructions:
1. Enumerate test cases.
2. Write Jest tests mocking the TMDB client.
3. Implement the route handler to satisfy tests.
4. Show final code for `route.ts` and tests.
```

---

### Prompt 9 – `/api/search` Route: Parameter Parsing and Validation

```text
You are implementing the search API for "WhereToStream". Use strict TDD.

Task:
Create a `GET /api/search` route that parses and validates query parameters but does not yet call TMDB. Focus purely on parameter handling and response structure.

Requirements:
1. Route location:
   - Implement in `app/api/search/route.ts`.

2. Query parameters:
   - `query` (required string; trim whitespace).
   - `type` (optional string; one of "movie", "tv", "all"; default "all").
   - `yearFrom`, `yearTo` (optional integers).
   - `language` (optional string, TMDB language code).
   - `genreIds` (optional comma-separated list of integers).
   - `minRating` (optional float).
   - `page` (optional integer; default 1).
   - `mode` (optional string; "autocomplete" or "full"; default "full").

3. Behavior:
   - If `query` is missing or empty after trimming, return HTTP 400 with error JSON.
   - Normalize values into a typed internal object:
     interface SearchParams {
       query: string;
       type: "movie" | "tv" | "all";
       yearFrom?: number;
       yearTo?: number;
       language?: string;
       genreIds?: number[];
       minRating?: number;
       page: number;
       mode: "autocomplete" | "full";
     }
   - For now, respond with HTTP 200 and JSON `{ "params": <normalized SearchParams> }` (no TMDB call yet).

4. Tests:
   - Valid request with minimal parameters.
   - Automatic defaults for `type`, `page`, and `mode`.
   - Parsing of `genreIds` into an array of numbers.
   - Handling invalid `type` or `mode` (e.g. normalize to default or reject with 400; choose a strategy and document it).
   - Behavior when `query` is missing or empty.

TDD instructions:
1. Define test cases for parsing and validation.
2. Implement Jest tests for the route handler.
3. Implement `route.ts` according to the tests.
4. Show complete code for the route and tests.
```

---

### Prompt 10 – `/api/search` Route: TMDB Integration and Normalization

```text
You are extending the `/api/search` route for "WhereToStream". Use strict TDD.

Context:
There is already a `/api/search` route that parses and validates query parameters into a `SearchParams` object and returns it. Now, you will integrate the TMDB client and return normalized search results, supporting both "full" and "autocomplete" modes.

Task:
Enhance `GET /api/search` to call TMDB and return normalized results, supporting both "full" and "autocomplete" modes.

Requirements:
1. TMDB client usage:
   - For `type === "movie"`: call `searchMovies`.
   - For `type === "tv"`: call `searchTv`.
   - For `type === "all"`:
     - Call both `searchMovies` and `searchTv`.
     - Merge results and sort by `popularity` descending.

2. Normalize results:
   - Output type:
     interface NormalizedSearchResult {
       id: number;
       type: "movie" | "tv";
       title: string;
       year?: number;
       posterUrl?: string;
       rating?: number;
       genres?: number[];
       overview?: string;
       popularity?: number;
     }

     interface SearchResponse {
       page: number;
       totalPages: number;
       totalResults: number;
       results: NormalizedSearchResult[];
     }
   - For movies: derive `title` from `title`, `year` from `release_date`.
   - For TV: derive `title` from `name`, `year` from `first_air_date`.
   - Construct full poster URL if `poster_path` is present (e.g. using TMDB images base URL; define a helper for this).

3. Modes:
   - For `mode === "full"`:
     - Return full `SearchResponse`.
   - For `mode === "autocomplete"`:
     - Still use the full shape but only fill minimal fields required for suggestions (e.g. `id`, `type`, `title`, `year`, `posterUrl`, `popularity`) and omit others or accept them as optional.

4. Error handling:
   - If TMDB returns an error or throws, map to 502/503 and return a JSON error object.
   - Preserve validation behavior from the previous implementation.

5. Tests:
   - Mock the TMDB client functions.
   - Test:
     - Movie-only search.
     - TV-only search.
     - Combined "all" search (merge and sort).
     - Full vs autocomplete mode.
     - Error handling for TMDB failure.

TDD instructions:
1. List the new test cases.
2. Extend the existing Jest tests for `/api/search` to cover TMDB integration.
3. Implement the updated route handler.
4. Show updated tests and route code.
```

---

### Prompt 11 – `/api/title/:type/:id` Route

```text
You are implementing the title details API for "WhereToStream". Use strict TDD.

Task:
Create the `GET /api/title/:type/:id` route that returns normalized metadata and availability information for a given movie or TV show.

Requirements:
1. Route:
   - Implement in `app/api/title/[type]/[id]/route.ts`.
   - Extract `type` and `id` from the URL.
   - Validate that `type` is either "movie" or "tv"; if invalid, return 400.

2. TMDB integration:
   - For movies:
     - Call `getMovieDetails(id)` and `getMovieWatchProviders(id)`.
   - For TV:
     - Call `getTvDetails(id)` and `getTvWatchProviders(id)`.

3. Normalized response type:
   interface NormalizedTitle {
     id: number;
     type: "movie" | "tv";
     title: string;
     originalTitle?: string;
     year?: number;
     genres: { id: number; name: string }[];
     overview?: string;
     rating?: number;
     posterUrl?: string;
     runtime?: number;
     availability: AvailabilityResult; // from availabilityMapper
   }

   - For movies:
     - `title` from `title`, `originalTitle` from `original_title`, `year` from `release_date`.
   - For TV:
     - `title` from `name`, `originalTitle` from `original_name`, `year` from `first_air_date`.
   - `genres` is an array of `{ id, name }` from TMDB.
   - Build `posterUrl` via the same helper as in `/api/search`.

4. Availability:
   - Pass the watch providers response to `mapAvailability` from `availabilityMapper`.
   - Include its output as `availability`.

5. Error handling:
   - If TMDB errors, map to 502/503 and return JSON error.
   - Validate that `id` is a positive integer; if invalid, return 400.

6. Tests:
   - Mock TMDB client methods and `availabilityMapper`.
   - Test movie and TV cases separately.
   - Test invalid type and invalid ID.
   - Test error path when TMDB or availability mapper throws.

TDD instructions:
1. List test scenarios.
2. Implement Jest tests for the route.
3. Implement the route handler to satisfy tests.
4. Show full code and tests.
```

---

### Prompt 12 – Layout, Header, Footer with Dark Theme

```text
You are building the base UI shell for "WhereToStream" in a Next.js App Router project. Use strict TDD where applicable (component tests).

Task:
Implement a shared layout, header, and footer with a dark, streaming-oriented theme and TMDB disclaimers.

Requirements:
1. Layout:
   - In `app/layout.tsx`, apply:
     - Dark background with subtle gradient (via Tailwind classes).
     - A main font (e.g., Inter) using Next.js font utilities if desired.
   - Structure:
     - `<header>` with a logo placeholder and the text "WhereToStream".
     - `<main>` for page content.
     - `<footer>` with legal text.

2. Header:
   - Simple branding: text “WhereToStream” plus an icon or stylized initial (ASCII or simple span is enough).
   - Align center or left; ensure good contrast.

3. Footer:
   - Include two lines:
     - “This product uses the TMDB API but is not endorsed or certified by TMDB.”
     - “Streaming availability is based on public data sources and may be incomplete or out of date.”

4. Styling:
   - Use Tailwind classes to achieve:
     - Near-black background.
     - Neon-like blue accent for logo/title.
     - Slightly warm accent for badges later (add a placeholder utility class).

5. Tests:
   - Component tests using React Testing Library for:
     - Header renders “WhereToStream”.
     - Footer contains both disclaimer lines.

TDD instructions:
1. Describe the component test cases.
2. Implement the tests.
3. Implement the layout, header, and footer to satisfy tests.
4. Show the relevant layout and component files plus tests.
```

---

### Prompt 13 – SearchForm Component with Filters and Callback

```text
You are implementing the search UI for "WhereToStream". Use strict TDD.

Task:
Create a `SearchForm` React component that renders the main search input and filters, and notifies its parent of search requests.

Requirements:
1. Component interface:
   - File: `components/SearchForm.tsx`.
   - Props:
     interface SearchFormProps {
       genres: { id: number; name: string }[];
       onSearch: (params: {
         query: string;
         type: "movie" | "tv" | "all";
         yearFrom?: number;
         yearTo?: number;
         language?: string;
         genreIds?: number[];
         minRating?: number;
       }) => void;
       onAutocompleteRequest?: (query: string) => void;
     }

2. UI elements:
   - Text input for `query` with placeholder like "Search for a movie or series".
   - Select for `type` with options: All, Movies only, Series only.
   - Inputs for `yearFrom` and `yearTo` (number).
   - Select for `language` (use a small hardcoded subset of language codes for now, e.g. EN, DE).
   - Multi-select (or a simple list of checkboxes) for `genres` prop.
   - Input (slider or numeric) for `minRating`.

3. Behavior:
   - On submit:
     - Prevent default.
     - Call `onSearch` with normalized values.
   - On query change:
     - Call `onAutocompleteRequest` (if provided) with the new query string (debouncing can be left out or added later).
   - Basic validation:
     - If query is empty on submit, do not call `onSearch` (optionally show a simple inline message).

4. Tests:
   - Render test ensures all fields are present.
   - Simulate filling form and submitting, verify `onSearch` is called with expected params.
   - When query is empty, `onSearch` is not called.
   - On typing in query, `onAutocompleteRequest` is called with the updated value (mock and assert).

5. Styling:
   - Use Tailwind classes to match the dark theme (no need for pixel-perfect design).

TDD instructions:
1. Define test cases for the component behavior.
2. Implement the component tests.
3. Implement `SearchForm` to satisfy tests.
4. Show full component and test code.
```

---

### Prompt 14 – AutocompleteList Component

```text
You are implementing the autocomplete dropdown for "WhereToStream". Use strict TDD.

Task:
Create an `AutocompleteList` React component to render suggestions for titles and allow selection via mouse and keyboard.

Requirements:
1. Component interface:
   - File: `components/AutocompleteList.tsx`.
   - Props:
     interface AutocompleteItem {
       id: number;
       type: "movie" | "tv";
       title: string;
       year?: number;
       posterUrl?: string;
     }

     interface AutocompleteListProps {
       items: AutocompleteItem[];
       isOpen: boolean;
       onSelect: (item: AutocompleteItem) => void;
     }

2. UI behavior:
   - When `isOpen` is false or `items` is empty, render nothing or a minimal placeholder.
   - When open, render a list of suggestions:
     - Each item shows poster thumbnail if available, title, year, and a small tag for "Movie" or "Series".
   - Clicking an item calls `onSelect` with that item.
   - Keyboard support (minimal):
     - Up/Down arrows move a highlighted index.
     - Enter selects the highlighted item.
     - Escape closes the list (you may simply rely on parent controlling `isOpen` and fire a callback if needed).

3. Tests:
   - Rendering test with several items.
   - Clicking an item calls `onSelect` with correct item.
   - Keyboard navigation test: pressing down then enter selects the correct item.

4. Styling:
   - Use Tailwind to ensure the list is visually distinct on dark background (e.g. slightly lighter panel).

TDD instructions:
1. Define tests for rendering and interaction.
2. Implement React Testing Library tests.
3. Implement the component to satisfy tests.
4. Show component and test code.
```

---

### Prompt 15 – ResultsList and ResultItem Components

```text
You are building the search results UI for "WhereToStream". Use strict TDD.

Task:
Create `ResultsList` and `ResultItem` components to display paginated search results with expandable rows.

Requirements:
1. Types:
   - Define:
     interface NormalizedSearchResult {
       id: number;
       type: "movie" | "tv";
       title: string;
       year?: number;
       posterUrl?: string;
       rating?: number;
       genres?: number[];
       overview?: string;
       popularity?: number;
     }

     interface ResultsListProps {
       results: NormalizedSearchResult[];
       page: number;
       totalPages: number;
       onPageChange: (nextPage: number) => void;
       onSelectResult: (result: NormalizedSearchResult) => void;
     }

2. `ResultItem` component:
   - Shows:
     - Poster thumbnail.
     - Title and year.
     - Badge for "Movie" or "Series".
     - Rating (0–10) if available.
     - Up to 3 genre IDs or simple tags (mapping to names can be added later).
   - Has a clickable area or button "Details" that triggers `onSelectResult`.

3. `ResultsList`:
   - Renders a list of `ResultItem` components.
   - Shows pagination controls:
     - "Previous" (disabled on first page).
     - "Next" (disabled on last page).
   - Calls `onPageChange` with the new page number when buttons are clicked.

4. Tests:
   - Rendering a list with multiple items.
   - Clicking "Next" and "Previous" calls `onPageChange` correctly.
   - Clicking a `ResultItem` detail action calls `onSelectResult` with the right result.

5. Styling:
   - Use Tailwind for a clean, card-like layout suitable for a dark theme.

TDD instructions:
1. Describe component test cases.
2. Implement tests for both components.
3. Implement the components to satisfy tests.
4. Show component and test code.
```

---

### Prompt 16 – ResultDetails Component with Availability Table

```text
You are implementing the inline details panel for "WhereToStream". Use strict TDD.

Task:
Create a `ResultDetails` component that fetches and displays detailed metadata and availability for a selected title using the `/api/title/:type/:id` endpoint.

Requirements:
1. Component interface:
   - File: `components/ResultDetails.tsx`.
   - Props:
     interface ResultDetailsProps {
       id: number;
       type: "movie" | "tv";
     }
   - Internally fetches from `/api/title/${type}/${id}`.

2. State handling:
   - Show a loading indicator while fetching.
   - Handle error states with a user-friendly message like:
     “We’re having trouble fetching data right now. Please try again later.”
   - Once loaded, display the normalized title data:
     - Large poster, title, year, type, genres (names), overview, rating, runtime.

3. Availability table:
   - Expect `availability` in the response with:
     - `preferredCountries: CountryAvailability[]`
     - `otherCountries: CountryAvailability[]`
   - Render a table-like structure:
     - For preferred countries:
       - Country name + flag emoji (basic mapping for DE, GB, US, CA is enough).
       - Column indicating Netflix availability (Yes/No).
       - Column listing free/ad-supported providers.
       - "Watch" link if `watchLink` present.
     - Below, render an "Other countries" section when `otherCountries` is non-empty with similar columns.
   - If there is no availability anywhere, show “No streaming availability found”.

4. Tests:
   - Mock `fetch` or use a test harness for the data fetching.
   - Test:
     - Loading state.
     - Successful render with metadata and non-empty availability.
     - State where availability is empty and "No streaming availability found" appears.
     - Error state rendering the friendly message.

5. Styling:
   - Use Tailwind to fit the dark, card-like detail panel aesthetic.

TDD instructions:
1. Specify the test scenarios.
2. Implement the component tests.
3. Implement `ResultDetails` to satisfy tests.
4. Show full component and test code.
```

---

### Prompt 17 – Wiring Search Page: SearchForm, Autocomplete, ResultsList, ResultDetails

```text
You are integrating the previously built components to form the main search experience for "WhereToStream". Use TDD where feasible for page-level behavior.

Task:
Implement the main search page at `app/page.tsx` that wires together `SearchForm`, `AutocompleteList`, `ResultsList`, and `ResultDetails` using the internal API routes.

Requirements:
1. Data flow:
   - On initial load:
     - Fetch genres from `/api/genres` and pass to `SearchForm`.
     - Show an empty state text like “Search for a movie or series to see where it’s streaming.”

2. Autocomplete:
   - When `SearchForm` calls `onAutocompleteRequest(query)`:
     - Call `/api/search?mode=autocomplete&query=...` with minimal defaults.
     - Show suggestions in `AutocompleteList`.
   - When a suggestion is selected:
     - Clear suggestions.
     - Set the "selected title" state with `id` and `type`.
     - Trigger fetch of details for that title (via `ResultDetails`).

3. Full search:
   - When `SearchForm` calls `onSearch(params)`:
     - Call `/api/search?mode=full` with mapped query params and `page` state.
     - Update `results`, `page`, and `totalPages`.
     - Reset any previously "selected title" (unless you want to keep it separately).

4. Pagination:
   - When `ResultsList` calls `onPageChange(nextPage)`:
     - Re-run `/api/search` with the same filters but new `page`.
     - Update results and page state.

5. Inline details:
   - When a `ResultItem` is selected (`onSelectResult`), set `selectedTitle` state to that result’s `id` and `type`.
   - Render `ResultDetails` inline under the selected item (or in a fixed detail panel area).

6. Error handling:
   - For failed API calls, show a banner or inline message:
     “We’re having trouble fetching data right now. Please try again later.”
   - For no search results, show: “No titles found. Please check the spelling or try a different title.”

7. Tests:
   - Use React Testing Library for basic integration tests:
     - Rendering genres in the search form.
     - Submitting a search triggers a fetch and renders results (mock fetch).
     - Clicking a result shows a `ResultDetails` area.

TDD instructions:
1. Define the high-level interaction tests.
2. Implement tests with mocked `fetch`.
3. Implement `app/page.tsx` and any helper hooks to satisfy tests.
4. Show code for `page.tsx` and tests.
```

---

### Prompt 18 – Global Error Handling & UX Polish

```text
You are adding final UX polish and robust error handling to "WhereToStream". Use TDD where meaningful.

Task:
Improve global error handling, loading states, and edge cases across the frontend and APIs, ensuring a smooth, predictable experience.

Requirements:
1. Global error banner:
   - Create a reusable `ErrorBanner` component that:
     - Accepts a `message` prop.
     - Renders a dismissible banner at the top of the page.

2. Integrate error banner:
   - Update the main search page to:
     - Show the banner when any of the core API requests (`/api/genres`, `/api/search`, `/api/title/:type/:id`) fail.
     - Allow the user to dismiss the banner.

3. Loading indicators:
   - Ensure:
     - Search calls show a "Searching..." or spinner overlay on the results area.
     - Details fetching shows a "Loading details..." state in `ResultDetails`.
     - Genre fetch shows a short "Loading filters..." state in the form.

4. No results and no availability states:
   - Confirm that:
     - No titles found -> “No titles found. Please check the spelling or try a different title.”
     - No streaming availability -> “No streaming availability found.”

5. Tests:
   - Component tests for `ErrorBanner` (renders message, dismiss works).
   - Page-level tests:
     - Simulate failed fetch for search or details and assert that the banner appears.
     - Assert that loading indicators appear while requests are in-flight.

6. Non-functional:
   - Keep all styling consistent with the existing dark theme.

TDD instructions:
1. Specify test cases for error and loading handling.
2. Implement tests for `ErrorBanner` and updated page behavior.
3. Implement the new components and modifications to satisfy tests.
4. Show all relevant code and tests.
```

---

### Prompt 19 – API-level Integration Tests (Search & Title)

```text
You are adding integration tests for the backend of "WhereToStream". Use TDD to ensure reliable API behavior.

Task:
Create integration tests for `/api/search` and `/api/title/:type/:id` that verify the combined behavior of parameter parsing, TMDB client, and availability mapping.

Requirements:
1. Testing approach:
   - Use Jest with a test harness that can invoke route handlers as functions.
   - Mock the underlying TMDB client and availability mapper (for `/api/title`).

2. Tests for `/api/search`:
   - Valid movie search:
     - Provide a query and type=movie.
     - Mock `searchMovies` to return a sample TMDB payload.
     - Assert that the response normalizes fields correctly (id, title, year, etc.).
   - Combined type search ("all"):
     - Mock both `searchMovies` and `searchTv`.
     - Assert that results are merged and sorted by popularity.
   - Autocomplete mode:
     - Assert that minimal fields are present and structure is valid.
   - Errors:
     - Mock TMDB client to throw and assert 502/503 mapping and error JSON.

3. Tests for `/api/title/:type/:id`:
   - Movie details:
     - Mock `getMovieDetails`, `getMovieWatchProviders`, and `mapAvailability`.
     - Assert that output contains normalized metadata and availability.
   - TV details:
     - Similar as above for TV.
   - Invalid type or ID:
     - Assert HTTP 400 and error JSON.

TDD instructions:
1. List integration scenarios.
2. Implement Jest tests for the two routes.
3. If needed, slightly adjust route implementations to be testable while preserving behavior.
4. Show integration test files and any minimal route changes.
```

---

### Prompt 20 – Frontend Component Test Sweep and Accessibility Checks

```text
You are finalizing "WhereToStream" with additional frontend tests and basic accessibility checks. Use TDD where appropriate.

Task:
Add or refine frontend tests to ensure key components behave correctly and basic accessibility is present.

Requirements:
1. Components to cover:
   - `SearchForm`
   - `AutocompleteList`
   - `ResultsList`
   - `ResultItem`
   - `ResultDetails`
   - `ErrorBanner` (if implemented)
   - Main search page layout

2. Tests:
   - Verify that form fields have accessible labels or aria-labels.
   - Verify that buttons have discernible text.
   - Check that the autocomplete list and results list use semantic HTML (`ul/li` where appropriate).
   - Ensure that the details panel uses reasonable heading structure (e.g. `h2` for title).
   - Test keyboard interaction for at least:
     - Submitting the search via Enter key.
     - Navigating autocomplete items with arrow keys and Enter.

3. Non-functional:
   - Do not introduce major layout changes; focus on semantics and accessibility attributes (like `aria-expanded`, `aria-controls`, etc.) where helpful.

TDD instructions:
1. Define accessibility-related test cases.
2. Implement or update React Testing Library tests.
3. Adjust components to satisfy tests.
4. Show the updated tests and minimal component code changes.
```
