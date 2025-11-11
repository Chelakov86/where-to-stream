# WhereToStream – Developer Specification (MVP)
_Last updated: 2025-11-11_

## 1. Product Overview

**Name:** WhereToStream  
**Type:** Web application (desktop-focused, fully responsive)  
**Goal:** Let users search movies/series and see where they’re currently available to stream, focusing on:

- Netflix availability  
- Free/ad-supported streaming services  
- Availability by country, prioritising a fixed preferred list: **DE, UK, US, CA**

**Data sources (MVP):**

- **The Movie Database (TMDB) API** for:
  - Metadata: movies & TV shows (title, type, year, genres, overview, rating, etc.)
  - Watch providers (streaming availability) per title & country

---

## 2. Target Users & Platforms

- **Audience:** Film & series enthusiasts.
- **Primary platform:** Desktop web.
- **Secondary:** Mobile & tablet (responsive).
- **Browser support:** Latest versions of Chrome, Edge, Firefox, Safari; no legacy IE.
- **Accessibility:** Basic keyboard access, reasonable contrast, semantic HTML where practical.

---

## 3. Main User Flow (MVP)

1. User loads the app (localhost in MVP).
2. Sees dark-themed search page with:
   - Title search + autocomplete.
   - Filters: type, release year, language, genre, minimum rating.
3. User searches for a title.
4. Paginated list of matching titles appears.
5. User expands a title to see:
   - Basic metadata.
   - Availability table:
     - Preferred countries first (**DE, UK, US, CA**).
     - Other countries where available.
6. If no availability at all: show **“No streaming availability found”**.

---

## 4. Functional Requirements

### 4.1 Search & Filters

**Search:**

- One main title input field.
- Autocomplete: backend wraps TMDB `/search/movie` and `/search/tv`.
- Suggestions show: id, title, year, type, poster thumbnail.

**Filters (must-have):**

- **Type:** `movie` | `tv` | `all` (mapped to TMDB search endpoints).
- **Release year:** exact year or `(yearFrom, yearTo)` range.
- **Language:** TMDB language code (original or primary).
- **Genre:** multi-select via TMDB genre IDs.
- **Minimum rating:** TMDB `vote_average` threshold (client-side or via TMDB filter where possible).

**Ambiguity handling:**

- If user selects suggestion: use that TMDB ID for details/availability.
- If user submits without selecting: show paginated list; user chooses.
- Any auto-pick (if needed) uses TMDB `popularity` field to pick the most popular result.

**Pagination:**

- Backend: accepts `page` parameter and forwards to TMDB.
- Frontend: shows 10–20 results per page with Next/Previous controls.

---

### 4.2 Result List (Collapsed Items)

Each result row shows:

- Poster thumbnail.  
- Original title.  
- Release year.  
- Type (Movie / Series).  
- TMDB rating (0–10).  
- 1–3 genre tags.  
- Clickable area to expand inline details.

---

### 4.3 Inline Details Panel

**Metadata (required):**

- Large poster image.  
- Original title.  
- Release year.  
- Type (Movie or Series).  
- Genres.  
- Overview/description.  
- TMDB rating.

**Availability table (required):**

- Data: TMDB watch providers for chosen type+id.  
- Group countries:
  - **Preferred:** DE, GB/UK, US, CA (always shown).  
  - **Other:** all remaining countries with any providers.

**Per country row:**

- Country name + flag.  
- **Netflix availability:** `true`/`false` based on provider list.  
- **Free/ad-supported services:** providers in `free`/`ads` categories.  
- “Watch” link if TMDB provides a provider link.

**No availability:**

- If providers exist only in non-preferred countries:  
  - Show preferred countries (with “Not available” rows) and an “Other countries” block.  
- If no providers anywhere:  
  - Show **“No streaming availability found”**.

---

### 4.4 Country Handling

**Preferred list (fixed for MVP):**

```ts
const PREFERRED_COUNTRIES = ["DE", "GB", "US", "CA"];
```

**Logic:**

- For each title, always render preferred countries first (even if empty).  
- Add other countries with availability as **“Other countries”** below, sorted alphabetically.

---

## 5. Data & API Design

### 5.1 External API: TMDB

Use TMDB for:

- Search: `/search/movie`, `/search/tv`  
- Details: `/movie/{id}`, `/tv/{id}`  
- Genres: `/genre/movie/list`, `/genre/tv/list`  
- Watch providers: `/movie/{id}/watch/providers`, `/tv/{id}/watch/providers`  

### 5.2 Internal API (Next.js)

Backend endpoints:

#### `GET /api/search`

**Query params:**

- `query` (required)  
- `type` (`movie` | `tv` | `all`)  
- `yearFrom`, `yearTo` (optional)  
- `language` (optional)  
- `genreIds` (optional, comma-separated)  
- `minRating` (optional)  
- `page` (default 1)  
- `mode` (`autocomplete` | `full`, default `full`)

**Response:**

- `page`, `totalPages`, `totalResults`  
- `results[]` with normalized fields:

```json
{
  "id": 27205,
  "type": "movie",
  "title": "Inception",
  "originalTitle": "Inception",
  "year": 2010,
  "posterUrl": "…",
  "rating": 8.3,
  "genres": ["Action", "Science Fiction"],
  "overview": "…",
  "popularity": 87.2
}
```

#### `GET /api/title/:type/:id`

- `type`: `movie` | `tv`  

**Response:**

```json
{
  "id": 27205,
  "type": "movie",
  "title": "Inception",
  "originalTitle": "Inception",
  "year": 2010,
  "genres": ["Action", "Science Fiction"],
  "overview": "…",
  "rating": 8.3,
  "posterUrl": "…",
  "runtime": 148,
  "availability": {
    "preferredCountries": [
      {
        "countryCode": "DE",
        "countryName": "Germany",
        "flagCode": "DE",
        "netflixAvailable": true,
        "freeServices": [
          {
            "id": 123,
            "name": "Pluto TV",
            "logoUrl": "https://…",
            "link": "https://…"
          }
        ]
      }
    ],
    "otherCountries": [
      {
        "countryCode": "FR",
        "countryName": "France",
        "flagCode": "FR",
        "netflixAvailable": true,
        "freeServices": []
      }
    ]
  }
}
```

#### `GET /api/genres`

Returns cached TMDB genre lists:

```json
{
  "movie": [
    { "id": 28, "name": "Action" },
    { "id": 18, "name": "Drama" }
  ],
  "tv": [
    { "id": 10759, "name": "Action & Adventure" }
  ]
}
```

---

## 6. Architecture & Stack

### 6.1 Framework

- **Next.js** (App Router) + React + TypeScript.

### 6.2 Frontend

- **Pages:**
  - `/` – main search interface.

- **Key components:**
  - `SearchForm` – title input + filters.
  - `AutocompleteList` – suggestions dropdown.
  - `ResultsList` – paginated results.
  - `ResultItem` – collapsed row.
  - `ResultDetails` – inline expanded panel (metadata + availability).
  - `Footer` – disclaimer and credits.

- **Styling:**
  - TailwindCSS (or similar utility-first CSS).  
  - Dark theme, gradient background, neon blue accent, warm secondary accent.

### 6.3 Backend

- **Implementation:** Next.js Route Handlers or API routes under `/api`.  
- **Modules:**
  - `tmdbClient`: HTTP client for TMDB (base URL + API key).  
  - `availabilityMapper`: maps TMDB watch provider payload to internal availability schema.  
  - `cache`: generic caching layer (in-memory Map with TTL).  
  - `config`: constants (preferred countries, TTL, TMDB base URL).

### 6.4 Configuration & Secrets

- `.env.local` (not committed):
  - `TMDB_API_KEY=<key>`

- `config.ts`:
  - `TMDB_BASE_URL`  
  - `PREFERRED_COUNTRIES`  
  - `CACHE_TTL_SECONDS`

---

## 7. Caching & Performance

**Strategy:**

- Cache:
  - Search results (by query+filters+page).
  - Title details (by type+id).
  - Watch providers (by type+id).
  - Genre lists.

**Implementation (MVP):**

- In-memory cache (e.g. `Map<string, { value: any; expiresAt: number }>`).  
- TTL: configurable, e.g. 12–24 hours.

**Key patterns:**

- `search::<hash>` (hash over query+filters+page).  
- `title::<type>::<id>`  
- `providers::<type>::<id>`  
- `genres`

On cache miss:

1. Fetch from TMDB.  
2. Store in cache with `expiresAt`.  
3. Return to client.

On cache hit (not expired):

- Return cached content.

---

## 8. Error Handling & Logging

### 8.1 Error Types

- Network/timeout errors to TMDB.  
- TMDB 4xx/5xx responses.  
- Rate limit responses (e.g. 429/409).  
- Invalid query parameters.  
- Internal server exceptions.

### 8.2 Backend Handling

- Wrap TMDB calls in `try/catch`.  
- Map TMDB errors to HTTP responses:

  - TMDB 4xx → HTTP 400 to client (include code & message).  
  - TMDB 429/409 → HTTP 429 or 503 with friendly text.  
  - TMDB 5xx → HTTP 502/503.

- **Technical logging only:**  
  - Log to console: timestamp, endpoint, TMDB URL, status code, error message, duration (for slow calls).  
  - Do not log user-identifiable data.

### 8.3 Frontend Handling

- Global error state for API failures:  
  - “We’re having trouble fetching data right now. Please try again later.”

- Search-specific:  
  - If no results: “No titles found. Please check the spelling or try a different title.”

- Availability-specific:  
  - If no providers: “No streaming availability found”.

---

## 9. UI/UX & Branding

### 9.1 Brand

- **Name:** WhereToStream

### 9.2 Visual Style

- **Theme:** Dark, cinema-like.  
- **Background:** Near-black with subtle blue/purple gradient.  
- **Primary accent:** Neon blue/cyan (CTAs, primary controls).  
- **Secondary accent:** Warm orange/pink (ratings, status badges).  
- **Typography:** Modern sans-serif (e.g. Inter or Roboto).

### 9.3 Layout

- **Header:** Logo + “WhereToStream”.  
- **Main content:**
  - Centered search card (title + filters).  
  - Paginated results list beneath.  
  - Inline expandable details panels under each result row.

- **Mobile:** Stacked layout, same features, responsive sizing.

### 9.4 Footer

- Minimal text:

  - “This product uses the TMDB API but is not endorsed or certified by TMDB.”  
  - “Streaming availability is based on public data sources and may be incomplete or out of date.”

---

## 10. Testing Plan

### 10.1 Unit Tests

- **tmdbClient:**
  - URL building correctness.
  - API key usage from env.
  - Handling of success and error responses (using mocked TMDB).

- **availabilityMapper:**
  - Netflix detection per country.
  - Extraction of free/ad-supported providers.
  - Preferred vs other countries grouping.
  - “No streaming availability found” case.

- **cache:**
  - Set/get behavior.
  - TTL expiration logic.

- **config:**
  - Validation of required env vars (e.g. TMDB_API_KEY).

### 10.2 Integration Tests (Backend)

- API-level tests (e.g. with supertest):

  - `GET /api/search`:
    - Valid queries return normalized results.
    - Filters applied correctly.
    - Pagination (page 1 vs page 2).

  - `GET /api/title/:type/:id`:
    - Returns metadata + availability.
    - PreferredCountries always include DE, GB, US, CA.
    - OtherCountries only include countries with providers.

  - Cache usage:
    - First call hits mocked TMDB.
    - Second call reuses cache (confirmed by not calling TMDB mock again).

### 10.3 Frontend Tests

- **SearchForm:**
  - Renders correctly.
  - Submits correct query+filters to backend.

- **AutocompleteList:**
  - Renders suggestions based on mock API.
  - Selecting a suggestion triggers expected behavior.

- **ResultsList & ResultItem:**
  - Renders list based on mock data.
  - Expanding an item shows ResultDetails.

- **ResultDetails:**
  - Metadata renders correctly.
  - Availability table renders preferred countries first.
  - Shows “No streaming availability found” when applicable.

### 10.4 Manual QA

- Search for a well-known title (e.g. “Inception”):
  - Autocomplete suggestions appear.
  - Selecting suggestion leads to correct result.
  - Availability table shows preferred countries, then others.

- Search for obscure titles:
  - Handles “no titles found” properly.

- Pick a title with no providers:
  - Shows “No streaming availability found”.

- Simulate TMDB failure (e.g. wrong API key):
  - User sees friendly error.
  - Console logs technical details.

- Check in latest Chrome, Edge, Firefox, Safari on desktop, and on at least one mobile browser for responsiveness.

---

**Definition of Done (MVP):**

- All flows above work on localhost with a real TMDB API key.  
- Search, filters, pagination, inline details, availability logic, dark UI, caching, and basic error handling are implemented and covered by unit/integration tests and manual QA.
