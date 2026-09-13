# WhereToStream × streamwise-finder parity — design

## Context

A Lovable-built rebuild of this product exists at
[Chelakov86/streamwise-finder](https://github.com/Chelakov86/streamwise-finder). It was
deliberately built as an independent reimagining (different stack, own UX/UI decisions,
explicitly told not to copy the original) — see its `README.md`. It landed on a "Cinema
Ember" visual design system and added real product functionality this app doesn't have:
a watchlist, a "My Services" coverage verdict, and URL-shareable title/comparison routes.

The goal of this initiative is to bring that design and functionality into **this**
codebase (`where-to-stream`), on **this** stack (Next.js App Router). The reference app's
framework choice (TanStack Start/Vite/React 19) is not being adopted — see
[Decisions](#decisions) below for why.

## Decisions

- **Keep the Next.js stack.** The reference app's stack was left to Lovable's discretion
  per its own README, not chosen for a product reason. Migrating frameworks would discard
  a working, tested, documented codebase (Jest, Playwright incl. visual regression, CI,
  `routeGuard`, caching, config) for zero end-user benefit, and the reference app pins a
  **beta-tagged** server runtime (`nitro@3.0.260603-beta`) — a maintainability red flag we
  don't want to inherit.
- **Bring over both the design and the functionality.**
- **Port all three net-new features**: watchlist ("Saved"), "My Services" coverage
  verdict, and URL-shareable routes for title detail and country comparison.
- **Stay on Tailwind 3** (no v4 upgrade). Tailwind v4's config model is a breaking change
  unrelated to this goal; the token system below is fully expressible in Tailwind 3.
- **Keep the existing data-fetching pattern** (custom hooks + `app/cache.ts` TTL cache)
  rather than adopting TanStack Query. It already solves caching; adding a second
  data-fetching paradigm would be unrelated scope.
- **Adopt shadcn-ui, but only the primitives actually used** by the ported components
  (Button, Input, Label, Dialog, Popover, Command, Switch) — not the ~40-component
  scaffold Lovable auto-generated, most of which the reference app never uses.
- **Staged rollout**, seven incremental PRs (see [Rollout](#rollout)), each independently
  reviewable and testable, rather than one large PR.

## Product scope

Retain every existing capability (search, autocomplete, filters, sort, recent searches,
rate limiting, TMDB integration) and add:

1. **Watchlist ("Saved")** — on-device bookmark list of titles, a `/saved` page, a
   save/unsave action on the title detail page.
2. **"My Services" coverage verdict** — the user marks which subscriptions they have;
   every title shows an immediate verdict (`mine` / `free` / `stream` / `paid` /
   `unavailable` / `nodata`) against those services, and search results can be filtered
   to "only my services."
3. **URL-shareable state and dedicated routes** — search page state (query, filters,
   sort, page, country, `mine`) lives in `searchParams`; a title detail page and a
   country-comparison page become real, linkable/bookmarkable routes instead of in-page
   state.

Not in scope: accounts/auth, a database, or any behavior removed from the current app
(this is additive/restructuring, not a feature cut).

## Data model changes

`app/types.ts`'s `CountryAvailability` currently stores only provider **names**, split
into `freeProviders`/`paidProviders`, and `availabilityMapper.ts` discards rent/buy
entirely. This blocks two things the new functionality needs: matching a user's selected
services (needs provider **IDs**, not names) and showing the full stream/free/rent/buy
picture (needs the discarded tiers back).

Required shape change (exact field names/types to be finalized during implementation
planning, following this codebase's existing `Genre { id, name }` pattern):

```
ProviderRef { id: number; name: string; logoUrl?: string }

CountryAvailability {
  countryCode, countryName, watchLink,
  flatrate: ProviderRef[],
  free: ProviderRef[],
  rent: ProviderRef[],
  buy: ProviderRef[],
}
```

`availabilityMapper.ts` gains a `verdictFor(availability, country, myServiceIds)`
function mirroring the reference app's `src/lib/availability.ts`: it returns one of
`mine | free | stream | paid | unavailable | nodata` plus a human label/detail and the
matched providers. Country ranking for the comparison view (user's country first, then
preferred countries in order, then the rest alphabetically) is a pure function alongside
it.

The `/api/title/:type/:id` route and its response shape extend accordingly; TMDB client
and cache layers (`tmdbApi.ts`, `tmdbClient.ts`, `cache.ts`) are unaffected — this is a
mapping-layer change only.

## Routing and state

Replace the single `app/page.tsx` client-state orchestrator with four routes, each owning
its own URL-encoded state:

| Route                          | Purpose               | URL state                                                                |
| ------------------------------ | --------------------- | ------------------------------------------------------------------------ |
| `/`                            | Search + results      | `q, type, genre, yearFrom, yearTo, minRating, sort, page, mine, country` |
| `/title/[type]/[id]`           | Detail + availability | `country`                                                                |
| `/title/[type]/[id]/countries` | Full country coverage | `country`                                                                |
| `/saved`                       | Watchlist             | `country` (for card links)                                               |

Existing API routes (`/api/search`, `/api/genres`, `/api/title/:type/:id`) are unchanged;
only the client-side consumption moves from ad hoc `useState` in `page.tsx` to
`useSearchParams`/`router.replace` driving the existing hooks (`useSearch`, `useGenres`,
`useProviders`, `useAutocomplete`), so search/filter/sort/country state is shareable via
URL the way it already partially is for `/api/*`.

Country and preference state that should _not_ live in the URL (the user's default
country, preferred-country shortlist, my-services selection, saved titles, recent
searches) stays in `localStorage`, following the existing `searchHistory.ts` pattern —
read after hydration to avoid SSR mismatch, exactly as that file already does.

## Design system

Port the reference app's "Cinema Ember" tokens into `app/globals.css` /
`tailwind.config.ts`, replacing the current ad hoc palette (which is already dark+amber,
so this is a refinement, not a reversal):

- Charcoal background, raised card surface, ember/amber primary accent, warm foreground
- Semantic tokens: `background, foreground, card, popover, primary, secondary, muted,
accent, destructive, success, warning, border, input, ring` — no page-level hardcoded
  colors, matching this repo's existing accessibility-first convention
- Sora for headings/display text, Manrope for body/interface text, loaded via
  `next/font/google`
- A restrained radius scale, visible focus rings, and `prefers-reduced-motion` handling

## Components

New/rebuilt components, each replacing or extending an existing one:

| New/rebuilt             | Replaces/extends                            | Notes                                                                                                                     |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Header` (extended)     | `Header.tsx`                                | adds Saved link, My-Services trigger, country picker                                                                      |
| `SearchBox`             | `SearchForm.tsx` + `AutocompleteList.tsx`   | one combobox: recent searches + suggestions + keyboard nav                                                                |
| `FiltersBar`            | current filter UI                           | type segmented control, genre/year/rating popover, "only mine" switch, sort select — same underlying `/api/search` params |
| `TitleCard`             | `ResultItem.tsx`                            | poster grid card                                                                                                          |
| `AvailabilityPanel`     | availability section of `ResultDetails.tsx` | verdict badge + grouped stream/free/rent/buy rows, link to comparison page                                                |
| `CountryPicker`         | (new)                                       | combobox, preferred countries pinned to top                                                                               |
| `ServicesDialog`        | (new)                                       | pick subscribed providers                                                                                                 |
| `CountryComparisonPage` | (new)                                       | `/title/[type]/[id]/countries`: full list, pin/filter/"on my services"                                                    |
| `SavedPage`             | (new)                                       | `/saved`: watchlist grid, remove action, empty state                                                                      |

`ErrorBanner.tsx`, `ErrorBoundary.tsx`, `Footer.tsx` are restyled in place, not rebuilt.
shadcn-ui primitives (Button, Input, Label, Dialog, Popover, Command, Switch) back the
new components; the existing `Skeleton.tsx` is restyled rather than replaced by shadcn's.

## Rollout

Seven staged PRs, each independently reviewable/mergeable, following the reference app's
own build order:

1. Design-system foundation — tokens, fonts, shadcn init + base primitives. Visual only,
   no behavior change.
2. Routing/URL-state migration — real routes, same behavior as today's single page.
3. Extended availability model + verdict logic + restyled availability panel.
4. "My Services" preference + dialog + filter integration.
5. Saved/watchlist.
6. Country comparison page.
7. Polish — accessibility/responsive/loading/empty/error states, Playwright
   visual-regression re-baseline.

### Rollout update (2026-09-13)

Stage 1 shipped as planned but produced no visible change, because the old palette was already
dark + amber. Stages 2–7 were therefore delivered together as one visible overhaul on the same
branch (routes, availability model + verdict, My Services, Saved, country comparison, polish and
visual re-baseline), plus a "Popular in {country}" browse feed on the search page that this spec
had missed: `/api/search` without a query now browses TMDB discover for the watch region.
Deviation: `verdictFor`/`rankCountries` live in `app/utils/availability.ts` (client-safe) rather
than in `availabilityMapper.ts`, which imports the server logger.

## Testing impact

- Jest: update tests for every restructured component; add tests for new hooks
  (`usePreferredCountries`, `useMyServices`, `useSaved`) and the verdict function.
- Playwright: update specs for the new routes; add specs for the watchlist and
  my-services flows; regenerate visual-regression snapshots after stage 1 (per
  `CLAUDE.md`, `npx playwright test visual-regression --update-snapshots`).
- Existing conventions (accessible queries, Page Object Models, mocked TMDB client)
  continue to apply.

## Risks

- Re-baselining visual regression snapshots after stage 1 will produce a large,
  hard-to-review diff by nature (it's pixels) — reviewed by manual inspection, not
  line-by-line.
- Extending `CountryAvailability` to carry provider IDs/logos and rent/buy tiers touches
  the mapping layer used by every existing availability consumer; stage 3 needs full
  regression coverage of the existing free/paid display before adding the new tiers.
- No accounts/database means "My Services" and "Saved" are per-device; this matches the
  reference app's own scope and is called out here so it isn't mistaken for an oversight.
