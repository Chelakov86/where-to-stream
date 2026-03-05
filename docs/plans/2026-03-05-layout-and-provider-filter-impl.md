# Layout & Provider Filter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the full-screen overlay details panel with a split-panel desktop layout, and replace the truncated-name provider grid with logo-only chip UI.

**Architecture:** At `lg` breakpoint, `page.tsx` renders a two-column flex layout — left column holds search/results, right column holds an always-visible details panel. The existing `DetailsSidebar` overlay is hidden at `lg+` via `lg:hidden`. A new `ProviderChips` component replaces the provider grid inside `SearchForm`.

**Tech Stack:** Next.js 16, React 18, TypeScript, TailwindCSS 3, `@tailwindcss/forms`

---

## Task 1: Add desktop split-panel layout to `page.tsx`

**Files:**
- Modify: `app/page.tsx`

The current structure renders `<DetailsSidebar>` as a fixed overlay at the bottom of `page.tsx`. We wrap the main content + right panel in a `lg:flex` container, and hide `DetailsSidebar` at `lg`.

**Step 1: Locate the results section and the DetailsSidebar in page.tsx**

The results section is the `<div className="mt-8 space-y-8">` block (lines 140–167). `<DetailsSidebar>` is rendered just below it (line 168).

**Step 2: Replace lines 108–175 with the split-panel layout**

```tsx
  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-8">
      {errorMessage && <ErrorBanner message={errorMessage} onDismiss={handleDismissError} />}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-accent-primary">
        WhereToStream
      </h1>
      <p className="mt-3 sm:mt-4 text-sm sm:text-base text-text-secondary">
        Find where your favorite movies and TV shows are streaming
      </p>
      <SearchForm
        genres={genres}
        providers={providers}
        isGenresLoading={isGenresLoading}
        isProvidersLoading={isProvidersLoading}
        onAutocompleteRequest={handleAutocompleteRequest}
        onSearch={handleSearchWithClear}
        watchRegion={watchRegion}
        onWatchRegionChange={setWatchRegion}
        autocompleteListId={AUTOCOMPLETE_LIST_ID}
        autocompleteItems={autocompleteSuggestions}
        onAutocompleteSelect={handleSelectSuggestion}
        onAutocompleteClose={clearAutocomplete}
        isCollapsed={isSearchFormCollapsed}
        onToggleCollapse={() => setIsSearchFormCollapsed(false)}
        lastSearchQuery={searchQuery?.query ?? ''}
      />
      <SearchHistory
        history={history}
        onSelectTitle={handleSelectHistoryItem}
        onRemoveItem={removeFromHistory}
        onClearHistory={clearHistory}
      />

      {/* Split-panel layout: left = results, right = details (desktop only) */}
      <div className="mt-8 lg:flex lg:gap-6 lg:items-start">
        {/* Left: results list */}
        <div className="lg:flex-1 lg:min-w-0">
          <section className="relative min-h-[3rem]">
            {isSearching && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-midnight-plum-end/80 backdrop-blur-sm text-lg font-semibold text-white">
                Searching...
              </div>
            )}
            {isSearching || results.length > 0 ? (
              <ResultsList
                results={results}
                page={page}
                totalPages={totalPages}
                isLoading={isSearching}
                onPageChange={handlePageChange}
                onSelectResult={handleSelectResult}
                selectedTitle={selectedTitle}
              />
            ) : shouldShowNoResults ? (
              <p className="mt-4 text-cream-text/70">
                No titles found. Please check the spelling or try a different title.
              </p>
            ) : shouldShowInitialPrompt ? (
              <p className="mt-4 text-cream-text/70">
                Search for a movie or series to see where it's streaming.
              </p>
            ) : null}
          </section>
        </div>

        {/* Right: inline details panel — desktop only */}
        <div className="hidden lg:block lg:w-[44%] lg:flex-shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          {selectedTitle ? (
            <ResultDetails title={selectedTitle} onError={handleDetailsError} />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 glass-panel rounded-xl text-cream-text/40 text-center p-8">
              <span className="text-4xl mb-3">🎬</span>
              <p className="text-base">Select a title to see where it streams</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile/tablet overlay — hidden on lg+ */}
      <div className="lg:hidden">
        <DetailsSidebar
          selectedTitle={selectedTitle}
          onClose={handleCloseDetails}
          onError={handleDetailsError}
        />
      </div>
    </main>
  );
```

**Step 3: Add `ResultDetails` import to `page.tsx`**

Add at top of file (after existing imports):
```tsx
import ResultDetails from './components/ResultDetails';
```

**Step 4: Run the dev server and visually verify at 1440px**

```bash
npm run dev
```

- At 1440px: two columns visible, right panel shows placeholder when nothing selected, shows details when a result's Details button is clicked — no overlay/blur
- At 768px: overlay behavior unchanged

**Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: split-panel desktop layout — inline details at lg breakpoint"
```

---

## Task 2: Fix body-scroll lock to only apply below `lg`

**Files:**
- Modify: `app/components/DetailsSidebar.tsx`

Currently `DetailsSidebar` locks `document.body.style.overflow = 'hidden'` whenever `selectedTitle` is set. Since the sidebar is now hidden at `lg`, this is fine — but we should guard it to avoid locking scroll on desktop if the component ever renders for any reason.

**Step 1: Add window width check to the scroll-lock effect**

Replace the `useEffect` in `DetailsSidebar.tsx` (lines 27–36):

```tsx
useEffect(() => {
    if (!selectedTitle) return;
    // Only lock body scroll when the overlay is actually visible (< lg = 1024px)
    const isOverlayVisible = window.innerWidth < 1024;
    document.addEventListener('keydown', handleKeyDown);
    if (isOverlayVisible) {
        document.body.style.overflow = 'hidden';
    }
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
    };
}, [selectedTitle, handleKeyDown]);
```

**Step 2: Commit**

```bash
git add app/components/DetailsSidebar.tsx
git commit -m "fix: only lock body scroll for overlay below lg breakpoint"
```

---

## Task 3: Create `ProviderChips` component

**Files:**
- Create: `app/components/ProviderChips.tsx`

**Step 1: Create the component**

```tsx
'use client';

import React, { useState, useMemo } from 'react';
import { buildTmdbImageUrl } from '@/app/utils/tmdb';
import { WatchProvider } from '@/app/types';

// Well-known provider IDs shown in "Popular" section first
const POPULAR_PROVIDER_IDS = new Set([8, 9, 337, 15, 350, 384, 386, 531, 283, 188]);
// Netflix=8, Prime Video=9, Disney+=337, Hulu=15, Apple TV+=350,
// Max=384, Peacock=386, Paramount+=531, Crunchyroll=283, YouTube Premium=188

interface ProviderChipsProps {
  providers: WatchProvider[];
  selectedProviders: number[];
  onChange: (ids: number[]) => void;
}

const ProviderChips: React.FC<ProviderChipsProps> = ({
  providers,
  selectedProviders,
  onChange,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return providers;
    const q = search.toLowerCase();
    return providers.filter((p) => p.provider_name.toLowerCase().includes(q));
  }, [providers, search]);

  const popular = useMemo(
    () => filtered.filter((p) => POPULAR_PROVIDER_IDS.has(p.provider_id)),
    [filtered]
  );
  const others = useMemo(
    () => filtered.filter((p) => !POPULAR_PROVIDER_IDS.has(p.provider_id)),
    [filtered]
  );

  const toggle = (id: number) => {
    if (selectedProviders.includes(id)) {
      onChange(selectedProviders.filter((x) => x !== id));
    } else {
      onChange([...selectedProviders, id]);
    }
  };

  const renderChip = (provider: WatchProvider) => {
    const logoUrl = buildTmdbImageUrl(provider.logo_path, 'w92');
    const isSelected = selectedProviders.includes(provider.provider_id);
    return (
      <button
        key={provider.provider_id}
        type="button"
        title={provider.provider_name}
        aria-label={`${isSelected ? 'Remove' : 'Add'} ${provider.provider_name} filter`}
        aria-pressed={isSelected}
        onClick={() => toggle(provider.provider_id)}
        className={`
          w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 transition-all
          focus:outline-none focus:ring-2 focus:ring-primary-gold/60
          ${
            isSelected
              ? 'ring-2 ring-primary-gold shadow-[0_0_8px_rgba(245,176,65,0.5)]'
              : 'ring-1 ring-golden-bronze/40 opacity-70 hover:opacity-100 hover:ring-golden-bronze/80'
          }
        `}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted-violet/60 flex items-center justify-center text-xs text-cream-text/60">
            ?
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search providers..."
        className="w-full p-2 text-sm bg-muted-violet/50 border border-golden-bronze/40 rounded-lg placeholder-cream-text/40 focus:border-primary-gold focus:ring-1 focus:ring-primary-gold/30 transition-colors"
        aria-label="Search streaming providers"
      />

      {filtered.length === 0 && (
        <p className="text-sm text-cream-text/60">No providers match &quot;{search}&quot;</p>
      )}

      {/* Popular section */}
      {popular.length > 0 && (
        <div>
          {!search && (
            <p className="text-xs text-cream-text/50 uppercase tracking-wider mb-2">Popular</p>
          )}
          <div className="flex flex-wrap gap-2">
            {popular.map(renderChip)}
          </div>
        </div>
      )}

      {/* All others */}
      {others.length > 0 && (
        <div>
          {!search && popular.length > 0 && (
            <p className="text-xs text-cream-text/50 uppercase tracking-wider mb-2">All providers</p>
          )}
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
            {others.map(renderChip)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderChips;
```

**Step 2: Commit**

```bash
git add app/components/ProviderChips.tsx
git commit -m "feat: add ProviderChips component with logo-only chips and search"
```

---

## Task 4: Wire `ProviderChips` into `SearchForm`

**Files:**
- Modify: `app/components/SearchForm.tsx`

**Step 1: Import `ProviderChips` at top of `SearchForm.tsx`**

Add after existing imports:
```tsx
import ProviderChips from './ProviderChips';
```

**Step 2: Replace the provider grid section (lines 477–529)**

Find this block:
```tsx
          <div>
            <label className="block text-xs font-semibold text-cream-text uppercase tracking-[0.1em] mb-2">
              Filter by Streaming Providers
            </label>
            {!watchRegion ? (
              ...
            ) : isProvidersLoading ? (
              ...
            ) : Array.isArray(providers) && providers.length > 0 ? (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                {providers.map((provider) => { ... })}
              </div>
            ) : (
              ...
            )}
          </div>
```

Replace it with:
```tsx
          <div>
            <label className="block text-xs font-semibold text-cream-text uppercase tracking-[0.1em] mb-2">
              Filter by Streaming Providers
            </label>
            {!watchRegion ? (
              <p className="mt-2 text-sm text-primary-gold bg-primary-gold/10 border border-primary-gold/20 p-2 rounded-lg">
                Please select a country above to view available streaming providers.
              </p>
            ) : isProvidersLoading ? (
              <p className="mt-2 text-sm text-cream-text/60">Loading providers...</p>
            ) : Array.isArray(providers) && providers.length > 0 ? (
              <div className="mt-2">
                <ProviderChips
                  providers={providers}
                  selectedProviders={selectedProviders}
                  onChange={setSelectedProviders}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-cream-text/60">No providers available for this region</p>
            )}
          </div>
```

**Step 3: Update `handleSubmit` to use `selectedProviders` state directly instead of FormData**

Find in `handleSubmit` (around line 160):
```tsx
    const selectedProviderIds = formData.getAll('provider').map((id) => parseInt(id as string, 10));
```

Replace with:
```tsx
    const selectedProviderIds = selectedProviders;
```

**Step 4: Run dev server and test with US selected**

```bash
npm run dev
```

- Open filters, select United States → provider chips appear with logos
- Major platforms (Netflix, Prime, Disney+) appear first in "Popular" section
- Clicking a chip selects it with gold ring; clicking again deselects
- Typing in search box filters chips in real-time
- Submitting search with providers selected still applies the filter correctly

**Step 5: Commit**

```bash
git add app/components/SearchForm.tsx
git commit -m "feat: replace provider grid with ProviderChips in SearchForm"
```

---

## Task 5: Add `custom-scrollbar` CSS utility

**Files:**
- Modify: `app/globals.css`

The `custom-scrollbar` class is referenced in multiple places but not defined in `globals.css`. Add a subtle styled scrollbar.

**Step 1: Check if it's already defined somewhere**

```bash
grep -r "custom-scrollbar" app/
```

**Step 2: If not defined, add to `globals.css` after the `.no-scrollbar` block (after line 94)**

```css
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(74, 59, 40, 0.6);
  border-radius: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(245, 176, 65, 0.4);
}
```

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: add custom-scrollbar utility CSS"
```

---

## Task 6: Final visual check with Playwright

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Open browser at 1440px and verify**

- Initial state: two columns, right shows placeholder
- Search "Breaking Bad": results appear in left column
- Click "Details" on Breaking Bad: right column shows details inline, no overlay, no blur
- Scroll results independently of details panel
- Click close / select another title: right panel updates

**Step 3: Shrink to 768px and verify overlay still works**

- At 768px (tablet), clicking Details should still open the slide-over overlay
- Escape key closes it

**Step 4: Open filters, select US, verify provider chips**

- Chips display with logos, no truncated text
- Popular providers (Netflix, Prime, Disney+, Hulu) appear in their own section
- Search input filters in real time
- Selected chips have gold ring

**Step 5: Run unit tests to make sure nothing broke**

```bash
npm test
```

Expected: all existing tests pass (no tests cover the components we changed).

**Step 6: Commit any final tweaks**

```bash
git add -A
git commit -m "fix: final adjustments to split-panel layout and provider chips"
```
