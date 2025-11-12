# WhereToStream – TODO Checklist

A structured checklist you can work through step by step.  
Feel free to tick items off as you go: `- [x]` instead of `- [ ]`.

## 📋 Remaining Tasks Summary

**What's Left:**

- **Section 0**: Configure default branch & protections (optional, if using remote)
- **Section 18**: Manual QA & Cross-browser Check (all items)
  - Run app locally and test main flows
  - Check responsive design (desktop, tablet, mobile)
  - Cross-browser testing (Chrome, Firefox, Safari)
  - Performance sanity check
- **Section 19**: Documentation & Polish
  - Add code comments where helpful
  - Optional nice-to-haves (analytics, error boundary, i18n)

**Status**: Core development is complete! Remaining items are primarily manual testing, QA, and optional polish.

---

## 0. Housekeeping & Repo Setup

- [x] **Create / verify project repository**
  - [x] Initialize git repository
  - [x] Add `.gitignore` (Node, Next.js, OS-specific files)
  - [x] Set up basic `README.md` (project summary, tech stack, how to run)
  - [ ] Configure default branch & protections (if using remote)

- [x] **Decide on tooling**
  - [x] Package manager chosen (npm / yarn / pnpm)
  - [x] Node version defined (e.g. via `.nvmrc` or engines in `package.json`)

---

## 1. Base Next.js, Tailwind, Testing

### 1.1 Next.js App + TypeScript

- [x] Ensure project is a **Next.js App Router** project with TypeScript
  - [x] `app/` directory present
  - [x] `tsconfig.json` configured with strict mode
  - [x] `app/page.tsx` exists and renders a placeholder page

### 1.2 TailwindCSS & Global Styles

- [x] Install and configure TailwindCSS
  - [x] `tailwind.config.js` or `tailwind.config.cjs` created
  - [x] `postcss.config.js` configured
  - [x] Tailwind directives added to global stylesheet (e.g. `globals.css`)

- [x] Dark theme base
  - [x] Body background set to dark (e.g. `bg-slate-950`)
  - [x] Base text set to light color
  - [x] Basic typography (font family, sizes) configured
  - [x] Add a few utility classes or Tailwind config for accent colors (e.g. streaming-neon blue)

### 1.3 Linting, Formatting, Testing Skeleton

- [x] Linting & formatting
  - [x] ESLint configured (Next.js recommended rules)
  - [x] Prettier configured (and integrated with ESLint if desired)
  - [x] Enforce LF line endings via Prettier configuration
  - [x] Add `lint` script to `package.json`

- [x] Jest & React Testing Library setup
  - [x] Install Jest, Testing Library, and required environment packages
  - [x] Jest config file created (`jest.config.*`)
  - [x] Testing setup file for RTL (e.g. `jest.setup.ts`)
  - [x] Add `test` script to `package.json`

- [x] Sanity tests
  - [x] Simple test for root page rendering
  - [x] Verify tests run and pass

---

## 2. Configuration Module

### 2.1 `config.ts`

- [x] Create `config.ts`
  - [x] Export `TMDB_BASE_URL`
  - [x] Export `PREFERRED_COUNTRIES = ["DE", "GB", "US", "CA"]` (as readonly tuple)
  - [x] Export `CACHE_TTL_SECONDS` (default generic TTL)
  - [x] Implement `getTmdbApiKey()` reading from `process.env.TMDB_API_KEY`
  - [x] Throw clear error if `TMDB_API_KEY` missing

- [x] Tests for `config.ts`
  - [x] `PREFERRED_COUNTRIES` order is exactly `DE, GB, US, CA`
  - [x] `getTmdbApiKey()` throws when env var missing
  - [x] `getTmdbApiKey()` returns correct value when env var is set
  - [x] `CACHE_TTL_SECONDS` has expected default

---

## 3. TMDB Client

### 3.1 Low-level HTTP Helper

- [x] Implement `tmdbGet<T>` helper
  - [x] Build URL with `TMDB_BASE_URL` + `path`
  - [x] Accept query params and append to URL
  - [x] Attach TMDB API key (e.g. `Authorization: Bearer <token>` or `api_key` param)
  - [x] Handle non-2xx responses:
    - [x] Create `TmdbError` class (with `status`, `statusText`, optional body snippet)
    - [x] Throw `TmdbError` on non-2xx

- [x] Tests for HTTP helper
  - [x] Correct URL building with path
  - [x] Correct handling of query params
  - [x] Correct header / key usage
  - [x] Non-2xx response throws `TmdbError` with expected status

### 3.2 Domain Methods & Types

- [x] Define minimal TMDB types
  - [x] Search response type (`results`, `page`, `total_pages`, `total_results`)
  - [x] Movie search item (id, title, release_date, poster_path, vote_average, genre_ids, popularity)
  - [x] TV search item (id, name, first_air_date, poster_path, vote_average, genre_ids, popularity)
  - [x] Movie details type
  - [x] TV details type
  - [x] Genre list type (`genres: { id; name }[]`)
  - [x] Watch providers response type

- [x] Implement domain methods
  - [x] `searchMovies(params)`
  - [x] `searchTv(params)`
  - [x] `getMovieDetails(id)`
  - [x] `getTvDetails(id)`
  - [x] `getMovieWatchProviders(id)`
  - [x] `getTvWatchProviders(id)`
  - [x] `getMovieGenres()`
  - [x] `getTvGenres()`

- [x] Tests for domain methods (mock `tmdbGet`)
  - [x] Each method calls correct TMDB path
  - [x] Query params mapped correctly from input params
  - [x] `id` is used correctly in path for detail/provider calls

---

## 4. In-memory Cache

### 4.1 Cache Core

- [x] Implement `cache.ts`
  - [x] `setCache<T>(key, value, ttlSeconds)`
  - [x] `getCache<T>(key)`
  - [x] Internal `Map<string, { value; expiresAt }>` storage
  - [x] Expiry logic:
    - [x] Remove & return `undefined` when expired
    - [x] Return stored value if not expired

- [x] Tests for cache
  - [x] Retrieve value before expiry
  - [x] Retrieve value after expiry returns `undefined` and removes entry
  - [x] Overwriting key updates value & expiry
  - [x] Works with different value types

### 4.2 Cache Integration into TMDB Methods

- [x] Decide TTLs
  - [x] Long TTL for genres (e.g. 24h)
  - [x] Moderate TTL for searches, details, providers (e.g. 12h or as desired)

- [x] Implement cache keys
  - [x] `genres:movie`
  - [x] `genres:tv`
  - [x] `search:movie:<hash>`
  - [x] `search:tv:<hash>`
  - [x] `title:movie:<id>`
  - [x] `title:tv:<id>`
  - [x] `providers:movie:<id>`
  - [x] `providers:tv:<id>`

- [x] Implement stable param hashing for search
  - [x] Serialize params consistently (e.g. sorted JSON)
  - [x] Hash or use the serialized string as-is

- [x] Wrap TMDB methods with cache
  - [x] Check cache → return if present
  - [x] Otherwise fetch → store → return

- [x] Tests (mock TMDB calls)
  - [x] Subsequent calls with same params use cached value
  - [x] Different params produce different cache keys / no cache collision

---

## 5. Availability Mapper

### 5.1 Mapping Logic

- [x] Create `availabilityMapper.ts`
  - [x] Define internal types:
    - [x] `CountryAvailability`
    - [x] `AvailabilityResult` (preferredCountries, otherCountries)
  - [x] Implement `mapAvailability(tmdbProviders)`

- [x] Country mapping
  - [x] Use `PREFERRED_COUNTRIES = ["DE", "GB", "US", "CA"]`
  - [x] Define simple map from country code → display name
  - [x] Fallback to code if name unknown

- [x] Detection logic
  - [x] Always include all preferred countries in result (even if no providers)
  - [x] `hasNetflix` true if Netflix present in `flatrate`, `ads`, or `free`
  - [x] `freeOrAdsProviders` = union of provider names from `free` and `ads` lists
    - [x] Ensure unique names
    - [x] Optionally sort alphabetically
  - [x] `watchLink` from country’s `link` (if present)

- [x] Other countries
  - [x] Include any non-preferred country that has at least one provider
  - [x] Sort `otherCountries` by `countryName`

### 5.2 Tests

- [x] Test: full data with Netflix + free/ads providers + links
- [x] Test: preferred country with no TMDB entry (appears with `hasNetflix = false`, empty providers)
- [x] Test: non-preferred countries present with providers
- [x] Test: no availability anywhere (preferred present but no providers; otherCountries empty)

---

## 6. API – `/api/genres`

- [x] Implement `app/api/genres/route.ts`
  - [x] `GET` handler that:
    - [x] Calls `getMovieGenres()`
    - [x] Calls `getTvGenres()`
    - [x] Returns JSON: `{ movie: [...], tv: [...] }`

- [x] Error handling
  - [x] If TMDB fails → return 502/503-style error JSON with a brief message

- [x] Tests (mock TMDB client)
  - [x] Successful response with expected structure
  - [x] Error response when TMDB calls throw

---

## 7. API – `/api/search`

### 7.1 Parameter Parsing & Validation

- [x] Implement `app/api/search/route.ts`
  - [x] Parse query params:
    - [x] `query` (required, trimmed)
    - [x] `type` in {"movie","tv","all"} (default "all")
    - [x] `yearFrom`, `yearTo` as integers (optional)
    - [x] `language` as string (optional)
    - [x] `genreIds` as comma-separated list of integers → `number[]`
    - [x] `minRating` as float (optional)
    - [x] `page` as integer (default 1)
    - [x] `mode` in {"autocomplete","full"} (default "full")

- [x] Validation
  - [x] If `query` missing or empty → 400 error JSON
  - [x] Normalize to internal `SearchParams` object

- [x] Temporary response
  - [x] Initially return `{ params: normalizedSearchParams }` (for tests)

- [x] Tests for parsing/validation
  - [x] Valid minimal request
  - [x] Defaults for `type`, `page`, `mode`
  - [x] Correct `genreIds` parsing
  - [x] Handling of invalid `type` or `mode` (choose and implement: normalize to default or 400)
  - [x] Query missing/empty → 400

### 7.2 TMDB Integration & Normalization

- [x] Connect TMDB client to `/api/search`
  - [x] For `type = movie` → call `searchMovies` with mapped params
  - [x] For `type = tv` → call `searchTv`
  - [x] For `type = all` → call both, merge results

- [x] Create normalized result model:
  - [x] `NormalizedSearchResult` (id, type, title, year, posterUrl, rating, genres, overview, popularity)
  - [x] `SearchResponse` with `page`, `totalPages`, `totalResults`, `results`

- [x] Normalization rules
  - [x] Movies:
    - [x] `title` from `title`
    - [x] `year` from `release_date`
  - [x] TV:
    - [x] `title` from `name`
    - [x] `year` from `first_air_date`
  - [x] Construct full `posterUrl` via helper if `poster_path` present
  - [x] Merge movie + TV results and sort by popularity for `type = all`

- [x] Mode handling
  - [x] `mode = full` → full normalized data
  - [x] `mode = autocomplete` → minimal fields (id, type, title, year, posterUrl, popularity) but use same structure

- [x] Error handling
  - [x] TMDB errors → 502/503 JSON error

- [x] Tests (mock TMDB client)
  - [x] Movie-only search scenario
  - [x] TV-only search scenario
  - [x] Combined `type = all` merging and sorting by popularity
  - [x] Autocomplete mode returns minimal yet valid structure
  - [x] TMDB error → appropriate HTTP and JSON

---

## 8. API – `/api/title/:type/:id`

- [x] Implement `app/api/title/[type]/[id]/route.ts`
  - [x] Extract `type` and `id` from path
  - [x] Validate `type` in {"movie","tv"}
  - [x] Validate `id` is positive integer

- [x] TMDB integration
  - [x] For `movie`:
    - [x] Call `getMovieDetails(id)`
    - [x] Call `getMovieWatchProviders(id)`
  - [x] For `tv`:
    - [x] Call `getTvDetails(id)`
    - [x] Call `getTvWatchProviders(id)`

- [x] Normalized title model
  - [x] `NormalizedTitle` including:
    - [x] id, type
    - [x] title, originalTitle
    - [x] year
    - [x] genres (objects with `id`, `name`)
    - [x] overview
    - [x] rating
    - [x] posterUrl
    - [x] runtime (if available)
    - [x] `availability` from `mapAvailability`

- [x] Error handling
  - [x] Invalid type or id → 400 JSON error
  - [x] TMDB error → 502/503 JSON error

- [x] Tests (mock TMDB client + `availabilityMapper`)
  - [x] Movie details success path
  - [x] TV details success path
  - [x] Invalid type
  - [x] Invalid id
  - [x] TMDB / mapper error → correct HTTP code & JSON

---

## 9. UI Shell: Layout, Header, Footer

- [x] Update `app/layout.tsx`
  - [x] Wrap children in layout with header & footer
  - [x] Apply dark gradient background
  - [x] Apply global font

- [x] Header component
  - [x] Contains app name "WhereToStream"
  - [x] Simple logo/icon or stylized text
  - [x] Good contrast vs background

- [x] Footer component
  - [x] Text: “This product uses the TMDB API but is not endorsed or certified by TMDB.”
  - [x] Text: “Streaming availability is based on public data sources and may be incomplete or out of date.”

- [x] Tests (RTL)
  - [x] Header renders text "WhereToStream"
  - [x] Footer renders both disclaimers

---

## 10. SearchForm Component

- [x] Implement `components/SearchForm.tsx`
  - [x] Props: `genres`, `onSearch`, `onAutocompleteRequest?`
  - [x] Fields:
    - [x] Query text input with accessible label
    - [x] Type dropdown (All / Movies only / Series only)
    - [x] Year from / to numeric inputs
    - [x] Language dropdown (e.g. EN, DE)
    - [x] Genre multi-select (checkboxes or multi-select input)
    - [x] Min rating input (slider or numeric)

- [x] Behavior
  - [x] On submit:
    - [x] Prevent default
    - [x] If query non-empty → call `onSearch` with normalized params
    - [x] If query empty → do not call `onSearch` (optional inline error)
  - [x] On query change:
    - [x] If `onAutocompleteRequest` provided → call with current query

- [x] Styling
  - [x] Use Tailwind to match dark theme
  - [x] Use card-like container

- [x] Tests
  - [x] All fields render with labels
  - [x] Valid form submission calls `onSearch` with expected values
  - [x] Empty query on submit does not call `onSearch`
  - [x] Typing in query triggers `onAutocompleteRequest` with current value

---

## 11. AutocompleteList Component

- [x] Implement `components/AutocompleteList.tsx`
  - [x] Props: `items`, `isOpen`, `onSelect`
  - [x] Render:
    - [x] Nothing or minimal placeholder when `isOpen` is false or `items` empty
    - [x] When open, show list of items (title, year, type badge, poster thumbnail if available)

- [x] Interactions
  - [x] Clicking an item → `onSelect(item)`
  - [x] Keyboard:
    - [x] Up/Down arrows move highlight
    - [x] Enter selects highlighted item
    - [x] Escape closes (signaled via optional callback or parent state)

- [x] Accessibility
  - [x] Use `ul/li` structure
  - [x] ARIA attributes for listbox/option if feasible

- [x] Tests
  - [x] List renders given items when open
  - [x] Click selection calls `onSelect` correctly
  - [x] Keyboard navigation & Enter select the proper item

---

## 12. ResultsList & ResultItem Components

- [x] Implement `components/ResultItem.tsx`
  - [x] Display poster, title, year, type badge
  - [x] Show rating if available
  - [x] Show simple genre tags (IDs or names if mapping available)
  - [x] Provide "Details" button/link that triggers callback

- [x] Implement `components/ResultsList.tsx`
  - [x] Props: `results`, `page`, `totalPages`, `onPageChange`, `onSelectResult`
  - [x] Render list of `ResultItem`
  - [x] Pagination controls:
    - [x] "Previous" disabled on page 1
    - [x] "Next" disabled on `page >= totalPages`

- [x] Tests
  - [x] Renders items correctly
  - [x] Clicking "Next"/"Previous" calls `onPageChange` with right page
  - [x] Clicking "Details" on an item calls `onSelectResult` with that item

---

## 13. ResultDetails Component

- [x] Implement `components/ResultDetails.tsx`
  - [x] Props: `id`, `type`
  - [x] Fetch `/api/title/${type}/${id}` on mount (and when props change)
  - [x] States:
    - [x] Loading
    - [x] Error
    - [x] Loaded with data

- [x] Render on success
  - [x] Poster, title, year, type badge
  - [x] Genres list (names)
  - [x] Overview
  - [x] Rating
  - [x] Runtime (if available)

- [x] Availability UI
  - [x] Preferred countries section:
    - [x] Country name, optional flag emoji
    - [x] Netflix availability (Yes/No)
    - [x] Free/ad-supported provider list
    - [x] Watch link (if present)
  - [x] Other countries section (if any)
  - [x] If no availability anywhere → show “No streaming availability found”

- [x] Error UI
  - [x] Friendly error message text

- [x] Tests (mock `fetch`)
  - [x] Loading state visible initially
  - [x] Success state shows metadata and availability info
  - [x] No-availability state shows correct message
  - [x] Error state shows error message

---

## 14. Global Error & Loading Handling

- [x] Implement `components/ErrorBanner.tsx`
  - [x] Props: `message`, `onClose`
  - [x] Render dismissible banner

- [x] Integrate `ErrorBanner` into main page
  - [x] Show banner on API failures (genres, search, title)
  - [x] Allow user to dismiss

- [x] Ensure loading indicators
  - [x] Search results area shows "Searching..." or spinner during search
  - [x] Filters show "Loading filters..." while genres load
  - [x] ResultDetails shows "Loading details..." while fetching

- [x] Tests
  - [x] `ErrorBanner` renders message & supports dismissal
  - [x] Page shows banner when fetch fails (mock failures)
  - [x] Loading indicators appear while async operations in-flight

---

## 15. Main Page Wiring (`app/page.tsx`)

- [x] Fetch genres on load from `/api/genres`
  - [x] Pass `genres` to `SearchForm`
  - [x] Handle error & loading states

- [x] Implement state management
  - [x] `genres`
  - [x] `searchParams`
  - [x] `results`, `page`, `totalPages`
  - [x] `autocompleteItems`, `isAutocompleteOpen`
  - [x] `selectedTitle` (id + type)
  - [x] `errorMessage`
  - [x] Loading flags for search, genres, details

- [x] Autocomplete flow
  - [x] `SearchForm.onAutocompleteRequest` → call `/api/search?mode=autocomplete`
  - [x] Update `autocompleteItems`
  - [x] Show `AutocompleteList` under query input
  - [x] On `AutocompleteList.onSelect`:
    - [x] Clear autocomplete items
    - [x] Set `selectedTitle`
    - [x] Optionally scroll to details section

- [x] Full search flow
  - [x] `SearchForm.onSearch` → call `/api/search?mode=full`
  - [x] Update `results`, `page`, `totalPages`, `searchParams`
  - [x] Clear `selectedTitle` or maintain as separate

- [x] Pagination flow
  - [x] `ResultsList.onPageChange` → re-call `/api/search` with same filters + new page
  - [x] Update `results` and `page`

- [x] Details flow
  - [x] `ResultsList.onSelectResult` → set `selectedTitle`
  - [x] Render `ResultDetails` inline (e.g. under selected item or in side panel)

- [x] Empty states
  - [x] Initial: “Search for a movie or series to see where it’s streaming.”
  - [x] No results: “No titles found. Please check the spelling or try a different title.”

- [x] Tests (page-level with mocked `fetch`)
  - [x] Genres load and populate SearchForm
  - [x] Search returns results and renders them
  - [x] Clicking result shows `ResultDetails`
  - [x] Autocomplete selection directly shows a details view

---

## 16. Accessibility & UX Refinements

- [x] Add accessible labels and ARIA
  - [x] `aria-label` or `<label>` for all inputs
  - [x] Buttons with meaningful text
  - [x] Autocomplete uses semantic `ul/li` or ARIA listbox pattern
  - [x] Focus handling when opening/closing autocomplete & details

- [x] Keyboard accessibility
  - [x] Query input submit via Enter key
  - [x] Autocomplete navigation with arrows + Enter
  - [x] Focus handling when opening/closing autocomplete & details

- [x] Frontend tests
  - [x] Check for accessible labels in tests
  - [x] Test keyboard interactions (submit via Enter, arrow navigation)

---

## 17. Backend Integration Tests

- [x] Integration tests for `/api/search`
  - [x] Validate combined behavior: parsing + TMDB client + normalization
  - [x] Movie-only
  - [x] TV-only
  - [x] Mixed type = all
  - [x] Autocomplete mode
  - [x] TMDB error handling

- [x] Integration tests for `/api/title/:type/:id`
  - [x] Movie path (details + providers + availability)
  - [x] TV path
  - [x] Invalid type / id
  - [x] TMDB / mapper error

---

## 18. Manual QA & Cross-browser Check

- [ ] Run the app locally and test main flows
  - [ ] Search for popular titles across movie and TV
  - [ ] Try obscure titles (no results)
  - [ ] Confirm availability table displays in expected order (preferred first)
  - [ ] Confirm “No streaming availability” appears when applicable

- [ ] Check responsive design
  - [ ] Desktop layout
  - [ ] Tablet layout
  - [ ] Mobile layout (small screens, portrait)

- [ ] Cross-browser
  - [ ] Test in Chrome
  - [ ] Test in Firefox
  - [ ] Test in Safari (if available)

- [ ] Performance sanity
  - [ ] Verify no obvious blocking calls on initial load
  - [ ] Consider simple caching on client (optional)

---

## 19. Documentation & Polish

- [x] Update `README.md`
  - [x] Setup instructions (env vars, `TMDB_API_KEY`)
  - [x] How to run dev server
  - [x] How to run tests
  - [x] Short description of main features

- [ ] Add comments where helpful
  - [ ] Document key modules (`tmdbClient`, `availabilityMapper`, API routes)
  - [ ] Document assumptions (e.g. mapping to country names, Netflix detection logic)

- [ ] Optional nice-to-haves
  - [ ] Add simple analytics / logging hooks (console or stub)
  - [ ] Add error boundary for React tree
  - [ ] Consider i18n for UI text (future-friendly)
