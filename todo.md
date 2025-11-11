# WhereToStream – TODO Checklist

A structured checklist you can work through step by step.  
Feel free to tick items off as you go: `- [x]` instead of `- [ ]`.

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
  - [ ] Prettier configured (and integrated with ESLint if desired)
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

- [ ] Create `config.ts`
  - [ ] Export `TMDB_BASE_URL`
  - [ ] Export `PREFERRED_COUNTRIES = ["DE", "GB", "US", "CA"]` (as readonly tuple)
  - [ ] Export `CACHE_TTL_SECONDS` (default generic TTL)
  - [ ] Implement `getTmdbApiKey()` reading from `process.env.TMDB_API_KEY`
  - [ ] Throw clear error if `TMDB_API_KEY` missing

- [ ] Tests for `config.ts`
  - [ ] `PREFERRED_COUNTRIES` order is exactly `DE, GB, US, CA`
  - [ ] `getTmdbApiKey()` throws when env var missing
  - [ ] `getTmdbApiKey()` returns correct value when env var is set
  - [ ] `CACHE_TTL_SECONDS` has expected default

---

## 3. TMDB Client

### 3.1 Low-level HTTP Helper

- [ ] Implement `tmdbGet<T>` helper
  - [ ] Build URL with `TMDB_BASE_URL` + `path`
  - [ ] Accept query params and append to URL
  - [ ] Attach TMDB API key (e.g. `Authorization: Bearer <token>` or `api_key` param)
  - [ ] Handle non-2xx responses:
    - [ ] Create `TmdbError` class (with `status`, `statusText`, optional body snippet)
    - [ ] Throw `TmdbError` on non-2xx

- [ ] Tests for HTTP helper
  - [ ] Correct URL building with path
  - [ ] Correct handling of query params
  - [ ] Correct header / key usage
  - [ ] Non-2xx response throws `TmdbError` with expected status

### 3.2 Domain Methods & Types

- [ ] Define minimal TMDB types
  - [ ] Search response type (`results`, `page`, `total_pages`, `total_results`)
  - [ ] Movie search item (id, title, release_date, poster_path, vote_average, genre_ids, popularity)
  - [ ] TV search item (id, name, first_air_date, poster_path, vote_average, genre_ids, popularity)
  - [ ] Movie details type
  - [ ] TV details type
  - [ ] Genre list type (`genres: { id; name }[]`)
  - [ ] Watch providers response type

- [ ] Implement domain methods
  - [ ] `searchMovies(params)`
  - [ ] `searchTv(params)`
  - [ ] `getMovieDetails(id)`
  - [ ] `getTvDetails(id)`
  - [ ] `getMovieWatchProviders(id)`
  - [ ] `getTvWatchProviders(id)`
  - [ ] `getMovieGenres()`
  - [ ] `getTvGenres()`

- [ ] Tests for domain methods (mock `tmdbGet`)
  - [ ] Each method calls correct TMDB path
  - [ ] Query params mapped correctly from input params
  - [ ] `id` is used correctly in path for detail/provider calls

---

## 4. In-memory Cache

### 4.1 Cache Core

- [ ] Implement `cache.ts`
  - [ ] `setCache<T>(key, value, ttlSeconds)`
  - [ ] `getCache<T>(key)`
  - [ ] Internal `Map<string, { value; expiresAt }>` storage
  - [ ] Expiry logic:
    - [ ] Remove & return `undefined` when expired
    - [ ] Return stored value if not expired

- [ ] Tests for cache
  - [ ] Retrieve value before expiry
  - [ ] Retrieve value after expiry returns `undefined` and removes entry
  - [ ] Overwriting key updates value & expiry
  - [ ] Works with different value types

### 4.2 Cache Integration into TMDB Methods

- [ ] Decide TTLs
  - [ ] Long TTL for genres (e.g. 24h)
  - [ ] Moderate TTL for searches, details, providers (e.g. 12h or as desired)

- [ ] Implement cache keys
  - [ ] `genres:movie`
  - [ ] `genres:tv`
  - [ ] `search:movie:<hash>`
  - [ ] `search:tv:<hash>`
  - [ ] `title:movie:<id>`
  - [ ] `title:tv:<id>`
  - [ ] `providers:movie:<id>`
  - [ ] `providers:tv:<id>`

- [ ] Implement stable param hashing for search
  - [ ] Serialize params consistently (e.g. sorted JSON)
  - [ ] Hash or use the serialized string as-is

- [ ] Wrap TMDB methods with cache
  - [ ] Check cache → return if present
  - [ ] Otherwise fetch → store → return

- [ ] Tests (mock TMDB calls)
  - [ ] Subsequent calls with same params use cached value
  - [ ] Different params produce different cache keys / no cache collision

---

## 5. Availability Mapper

### 5.1 Mapping Logic

- [ ] Create `availabilityMapper.ts`
  - [ ] Define internal types:
    - [ ] `CountryAvailability`
    - [ ] `AvailabilityResult` (preferredCountries, otherCountries)
  - [ ] Implement `mapAvailability(tmdbProviders)`

- [ ] Country mapping
  - [ ] Use `PREFERRED_COUNTRIES = ["DE", "GB", "US", "CA"]`
  - [ ] Define simple map from country code → display name
  - [ ] Fallback to code if name unknown

- [ ] Detection logic
  - [ ] Always include all preferred countries in result (even if no providers)
  - [ ] `hasNetflix` true if Netflix present in `flatrate`, `ads`, or `free`
  - [ ] `freeOrAdsProviders` = union of provider names from `free` and `ads` lists
    - [ ] Ensure unique names
    - [ ] Optionally sort alphabetically
  - [ ] `watchLink` from country’s `link` (if present)

- [ ] Other countries
  - [ ] Include any non-preferred country that has at least one provider
  - [ ] Sort `otherCountries` by `countryName`

### 5.2 Tests

- [ ] Test: full data with Netflix + free/ads providers + links
- [ ] Test: preferred country with no TMDB entry (appears with `hasNetflix = false`, empty providers)
- [ ] Test: non-preferred countries present with providers
- [ ] Test: no availability anywhere (preferred present but no providers; otherCountries empty)

---

## 6. API – `/api/genres`

- [ ] Implement `app/api/genres/route.ts`
  - [ ] `GET` handler that:
    - [ ] Calls `getMovieGenres()`
    - [ ] Calls `getTvGenres()`
    - [ ] Returns JSON: `{ movie: [...], tv: [...] }`

- [ ] Error handling
  - [ ] If TMDB fails → return 502/503-style error JSON with a brief message

- [ ] Tests (mock TMDB client)
  - [ ] Successful response with expected structure
  - [ ] Error response when TMDB calls throw

---

## 7. API – `/api/search`

### 7.1 Parameter Parsing & Validation

- [ ] Implement `app/api/search/route.ts`
  - [ ] Parse query params:
    - [ ] `query` (required, trimmed)
    - [ ] `type` in {"movie","tv","all"} (default "all")
    - [ ] `yearFrom`, `yearTo` as integers (optional)
    - [ ] `language` as string (optional)
    - [ ] `genreIds` as comma-separated list of integers → `number[]`
    - [ ] `minRating` as float (optional)
    - [ ] `page` as integer (default 1)
    - [ ] `mode` in {"autocomplete","full"} (default "full")

- [ ] Validation
  - [ ] If `query` missing or empty → 400 error JSON
  - [ ] Normalize to internal `SearchParams` object

- [ ] Temporary response
  - [ ] Initially return `{ params: normalizedSearchParams }` (for tests)

- [ ] Tests for parsing/validation
  - [ ] Valid minimal request
  - [ ] Defaults for `type`, `page`, `mode`
  - [ ] Correct `genreIds` parsing
  - [ ] Handling of invalid `type` or `mode` (choose and implement: normalize to default or 400)
  - [ ] Query missing/empty → 400

### 7.2 TMDB Integration & Normalization

- [ ] Connect TMDB client to `/api/search`
  - [ ] For `type = movie` → call `searchMovies` with mapped params
  - [ ] For `type = tv` → call `searchTv`
  - [ ] For `type = all` → call both, merge results

- [ ] Create normalized result model:
  - [ ] `NormalizedSearchResult` (id, type, title, year, posterUrl, rating, genres, overview, popularity)
  - [ ] `SearchResponse` with `page`, `totalPages`, `totalResults`, `results`

- [ ] Normalization rules
  - [ ] Movies:
    - [ ] `title` from `title`
    - [ ] `year` from `release_date`
  - [ ] TV:
    - [ ] `title` from `name`
    - [ ] `year` from `first_air_date`
  - [ ] Construct full `posterUrl` via helper if `poster_path` present
  - [ ] Merge movie + TV results and sort by popularity for `type = all`

- [ ] Mode handling
  - [ ] `mode = full` → full normalized data
  - [ ] `mode = autocomplete` → minimal fields (id, type, title, year, posterUrl, popularity) but use same structure

- [ ] Error handling
  - [ ] TMDB errors → 502/503 JSON error

- [ ] Tests (mock TMDB client)
  - [ ] Movie-only search scenario
  - [ ] TV-only search scenario
  - [ ] Combined `type = all` merging and sorting by popularity
  - [ ] Autocomplete mode returns minimal yet valid structure
  - [ ] TMDB error → appropriate HTTP and JSON

---

## 8. API – `/api/title/:type/:id`

- [ ] Implement `app/api/title/[type]/[id]/route.ts`
  - [ ] Extract `type` and `id` from path
  - [ ] Validate `type` in {"movie","tv"}
  - [ ] Validate `id` is positive integer

- [ ] TMDB integration
  - [ ] For `movie`:
    - [ ] Call `getMovieDetails(id)`
    - [ ] Call `getMovieWatchProviders(id)`
  - [ ] For `tv`:
    - [ ] Call `getTvDetails(id)`
    - [ ] Call `getTvWatchProviders(id)`

- [ ] Normalized title model
  - [ ] `NormalizedTitle` including:
    - [ ] id, type
    - [ ] title, originalTitle
    - [ ] year
    - [ ] genres (objects with `id`, `name`)
    - [ ] overview
    - [ ] rating
    - [ ] posterUrl
    - [ ] runtime (if available)
    - [ ] `availability` from `mapAvailability`

- [ ] Error handling
  - [ ] Invalid type or id → 400 JSON error
  - [ ] TMDB error → 502/503 JSON error

- [ ] Tests (mock TMDB client + `availabilityMapper`)
  - [ ] Movie details success path
  - [ ] TV details success path
  - [ ] Invalid type
  - [ ] Invalid id
  - [ ] TMDB / mapper error → correct HTTP code & JSON

---

## 9. UI Shell: Layout, Header, Footer

- [ ] Update `app/layout.tsx`
  - [ ] Wrap children in layout with header & footer
  - [ ] Apply dark gradient background
  - [ ] Apply global font

- [ ] Header component
  - [ ] Contains app name "WhereToStream"
  - [ ] Simple logo/icon or stylized text
  - [ ] Good contrast vs background

- [ ] Footer component
  - [ ] Text: “This product uses the TMDB API but is not endorsed or certified by TMDB.”
  - [ ] Text: “Streaming availability is based on public data sources and may be incomplete or out of date.”

- [ ] Tests (RTL)
  - [ ] Header renders text "WhereToStream"
  - [ ] Footer renders both disclaimers

---

## 10. SearchForm Component

- [ ] Implement `components/SearchForm.tsx`
  - [ ] Props: `genres`, `onSearch`, `onAutocompleteRequest?`
  - [ ] Fields:
    - [ ] Query text input with accessible label
    - [ ] Type dropdown (All / Movies only / Series only)
    - [ ] Year from / to numeric inputs
    - [ ] Language dropdown (e.g. EN, DE)
    - [ ] Genre multi-select (checkboxes or multi-select input)
    - [ ] Min rating input (slider or numeric)

- [ ] Behavior
  - [ ] On submit:
    - [ ] Prevent default
    - [ ] If query non-empty → call `onSearch` with normalized params
    - [ ] If query empty → do not call `onSearch` (optional inline error)
  - [ ] On query change:
    - [ ] If `onAutocompleteRequest` provided → call with current query

- [ ] Styling
  - [ ] Use Tailwind to match dark theme
  - [ ] Use card-like container

- [ ] Tests
  - [ ] All fields render with labels
  - [ ] Valid form submission calls `onSearch` with expected values
  - [ ] Empty query on submit does not call `onSearch`
  - [ ] Typing in query triggers `onAutocompleteRequest` with current value

---

## 11. AutocompleteList Component

- [ ] Implement `components/AutocompleteList.tsx`
  - [ ] Props: `items`, `isOpen`, `onSelect`
  - [ ] Render:
    - [ ] Nothing or minimal placeholder when `isOpen` is false or `items` empty
    - [ ] When open, show list of items (title, year, type badge, poster thumbnail if available)

- [ ] Interactions
  - [ ] Clicking an item → `onSelect(item)`
  - [ ] Keyboard:
    - [ ] Up/Down arrows move highlight
    - [ ] Enter selects highlighted item
    - [ ] Escape closes (signaled via optional callback or parent state)

- [ ] Accessibility
  - [ ] Use `ul/li` structure
  - [ ] ARIA attributes for listbox/option if feasible

- [ ] Tests
  - [ ] List renders given items when open
  - [ ] Click selection calls `onSelect` correctly
  - [ ] Keyboard navigation & Enter select the proper item

---

## 12. ResultsList & ResultItem Components

- [ ] Implement `components/ResultItem.tsx`
  - [ ] Display poster, title, year, type badge
  - [ ] Show rating if available
  - [ ] Show simple genre tags (IDs or names if mapping available)
  - [ ] Provide "Details" button/link that triggers callback

- [ ] Implement `components/ResultsList.tsx`
  - [ ] Props: `results`, `page`, `totalPages`, `onPageChange`, `onSelectResult`
  - [ ] Render list of `ResultItem`
  - [ ] Pagination controls:
    - [ ] "Previous" disabled on page 1
    - [ ] "Next" disabled on `page >= totalPages`

- [ ] Tests
  - [ ] Renders items correctly
  - [ ] Clicking "Next"/"Previous" calls `onPageChange` with right page
  - [ ] Clicking "Details" on an item calls `onSelectResult` with that item

---

## 13. ResultDetails Component

- [ ] Implement `components/ResultDetails.tsx`
  - [ ] Props: `id`, `type`
  - [ ] Fetch `/api/title/${type}/${id}` on mount (and when props change)
  - [ ] States:
    - [ ] Loading
    - [ ] Error
    - [ ] Loaded with data

- [ ] Render on success
  - [ ] Poster, title, year, type badge
  - [ ] Genres list (names)
  - [ ] Overview
  - [ ] Rating
  - [ ] Runtime (if available)

- [ ] Availability UI
  - [ ] Preferred countries section:
    - [ ] Country name, optional flag emoji
    - [ ] Netflix availability (Yes/No)
    - [ ] Free/ad-supported provider list
    - [ ] Watch link (if present)
  - [ ] Other countries section (if any)
  - [ ] If no availability anywhere → show “No streaming availability found”

- [ ] Error UI
  - [ ] Friendly error message text

- [ ] Tests (mock `fetch`)
  - [ ] Loading state visible initially
  - [ ] Success state shows metadata and availability info
  - [ ] No-availability state shows correct message
  - [ ] Error state shows error message

---

## 14. Global Error & Loading Handling

- [ ] Implement `components/ErrorBanner.tsx`
  - [ ] Props: `message`, `onClose`
  - [ ] Render dismissible banner

- [ ] Integrate `ErrorBanner` into main page
  - [ ] Show banner on API failures (genres, search, title)
  - [ ] Allow user to dismiss

- [ ] Ensure loading indicators
  - [ ] Search results area shows "Searching..." or spinner during search
  - [ ] Filters show "Loading filters..." while genres load
  - [ ] ResultDetails shows "Loading details..." while fetching

- [ ] Tests
  - [ ] `ErrorBanner` renders message & supports dismissal
  - [ ] Page shows banner when fetch fails (mock failures)
  - [ ] Loading indicators appear while async operations in-flight

---

## 15. Main Page Wiring (`app/page.tsx`)

- [ ] Fetch genres on load from `/api/genres`
  - [ ] Pass `genres` to `SearchForm`
  - [ ] Handle error & loading states

- [ ] Implement state management
  - [ ] `genres`
  - [ ] `searchParams`
  - [ ] `results`, `page`, `totalPages`
  - [ ] `autocompleteItems`, `isAutocompleteOpen`
  - [ ] `selectedTitle` (id + type)
  - [ ] `errorMessage`
  - [ ] Loading flags for search, genres, details

- [ ] Autocomplete flow
  - [ ] `SearchForm.onAutocompleteRequest` → call `/api/search?mode=autocomplete`
  - [ ] Update `autocompleteItems`
  - [ ] Show `AutocompleteList` under query input
  - [ ] On `AutocompleteList.onSelect`:
    - [ ] Clear autocomplete items
    - [ ] Set `selectedTitle`
    - [ ] Optionally scroll to details section

- [ ] Full search flow
  - [ ] `SearchForm.onSearch` → call `/api/search?mode=full`
  - [ ] Update `results`, `page`, `totalPages`, `searchParams`
  - [ ] Clear `selectedTitle` or maintain as separate

- [ ] Pagination flow
  - [ ] `ResultsList.onPageChange` → re-call `/api/search` with same filters + new page
  - [ ] Update `results` and `page`

- [ ] Details flow
  - [ ] `ResultsList.onSelectResult` → set `selectedTitle`
  - [ ] Render `ResultDetails` inline (e.g. under selected item or in side panel)

- [ ] Empty states
  - [ ] Initial: “Search for a movie or series to see where it’s streaming.”
  - [ ] No results: “No titles found. Please check the spelling or try a different title.”

- [ ] Tests (page-level with mocked `fetch`)
  - [ ] Genres load and populate SearchForm
  - [ ] Search returns results and renders them
  - [ ] Clicking result shows `ResultDetails`
  - [ ] Autocomplete selection directly shows a details view

---

## 16. Accessibility & UX Refinements

- [ ] Add accessible labels and ARIA
  - [ ] `aria-label` or `<label>` for all inputs
  - [ ] Buttons with meaningful text
  - [ ] Autocomplete uses semantic `ul/li` or ARIA listbox pattern
  - [ ] Details panel uses appropriate heading hierarchy

- [ ] Keyboard accessibility
  - [ ] Query input submit via Enter key
  - [ ] Autocomplete navigation with arrows + Enter
  - [ ] Focus handling when opening/closing autocomplete & details

- [ ] Frontend tests
  - [ ] Check for accessible labels in tests
  - [ ] Test keyboard interactions (submit via Enter, arrow navigation)

---

## 17. Backend Integration Tests

- [ ] Integration tests for `/api/search`
  - [ ] Validate combined behavior: parsing + TMDB client + normalization
  - [ ] Movie-only
  - [ ] TV-only
  - [ ] Mixed type = all
  - [ ] Autocomplete mode
  - [ ] TMDB error handling

- [ ] Integration tests for `/api/title/:type/:id`
  - [ ] Movie path (details + providers + availability)
  - [ ] TV path
  - [ ] Invalid type / id
  - [ ] TMDB / mapper error

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

- [ ] Update `README.md`
  - [ ] Setup instructions (env vars, `TMDB_API_KEY`)
  - [ ] How to run dev server
  - [ ] How to run tests
  - [ ] Short description of main features

- [ ] Add comments where helpful
  - [ ] Document key modules (`tmdbClient`, `availabilityMapper`, API routes)
  - [ ] Document assumptions (e.g. mapping to country names, Netflix detection logic)

- [ ] Optional nice-to-haves
  - [ ] Add simple analytics / logging hooks (console or stub)
  - [ ] Add error boundary for React tree
  - [ ] Consider i18n for UI text (future-friendly)
